"""Export quest XML without running game scripts. Loose XML first, PACK fallback.

Run: python scripts/export-quest-wiki.py
Loader limits and parameter positions: gameserver/script/task/{task,loadfile}.lua.
"""
import csv
import hashlib
import importlib.util
import json
import re
import struct
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from quest_rewards import parse_lua, describe_reward, expand_bonus_reward

ADMIN = Path(__file__).resolve().parents[1]
GAME = ADMIN.parent / 'gameserver'
spec = importlib.util.spec_from_file_location('pak_codec', ADMIN / 'scripts/export-item-icons.py')
codec = importlib.util.module_from_spec(spec)
spec.loader.exec_module(codec)


def text(value):
    value = re.sub(r'<pos=([^,>]+),([^>]+)>', lambda m: f'{m[1]} (bản đồ, tọa độ: {m[2]})', value or '')
    value = re.sub(r'<(?:enter|n)>', '\n', value)
    return re.sub(r'<[^>]*>', '', value).strip()


def params(node):
    return [child.findtext('Value', '') for child in node] if node is not None else []


def export():
    pak_path = GAME / 'pak/task_publish.pak'
    pak = pak_path.read_bytes()
    count, index = struct.unpack_from('<2I', pak, 4)
    records = {row[0]: row for row in struct.iter_unpack('<4I', pak[index:index + count * 16])}
    sources = Counter()

    def load(kind, number):
        relative = f'task_publish/{kind}/{number:016x}.xml'
        loose = GAME / relative
        # Windows paths are case insensitive, matching the engine's formatted IDs.
        if loose.is_file():
            data, source = loose.read_bytes(), 'Server/gameserver/' + relative
        else:
            record = records.get(codec.filename_hash('\\' + relative.replace('/', '\\')))
            if record is None:
                return None, ''
            _, offset, size, packed = record
            data = pak[offset:offset + (packed & 0xffffff)]
            method = packed >> 24
            if method == 32:
                data = codec.nrv2b(data, size)
            elif method != 0:
                raise ValueError(f'Unsupported PACK codec {method}')
            source = 'Server/gameserver/pak/task_publish.pak:' + relative
        sources['loose' if loose.is_file() else 'pak'] += 1
        return ET.fromstring(data.decode('utf-8-sig')), source

    npcs = {row['Id']: row['Name'] for row in csv.DictReader(
        (GAME / 'setting/npc/npc.txt').read_text('utf-8-sig').splitlines(), delimiter='\t')}
    items = {}
    for file in sorted((GAME / 'setting/item').rglob('*.txt')):
        rows = csv.DictReader(codec.read_text(file).splitlines(), delimiter='\t')
        keys = ['Genre', 'DetailType', 'ParticularType', 'Level']
        if not rows.fieldnames or not {'Name', 'Icon', *keys} <= set(rows.fieldnames):
            continue
        for row in rows:
            if all(re.fullmatch(r'\d+', (row.get(k) or '').strip()) for k in keys):
                items.setdefault(','.join(str(int(row[k])) for k in keys), text(row['Name']))
    reputes = {(camp.get('id'), cls.get('id')): cls.get('name')
               for camp in ET.parse(GAME / 'setting/player/repute.xml').getroot().findall('camp')
               for cls in camp.findall('class')}
    chains, missing, referenced_subs = [], [], set()
    for number in range(1, 601):
        root, source = load('task', number)
        if root is None:
            continue
        children = []
        for ref in root.findall('Managed/Sub'):
            ref_id, sub_id = int(ref.attrib['id'], 16), int(ref.attrib['refer'], 16)
            referenced_subs.add(sub_id)
            sub, sub_source = load('sub', sub_id) if sub_id <= 700 else (None, '')
            if sub is None:
                missing.append({'task': number, 'ref': ref_id, 'sub': sub_id})
            values = params(ref.find('Attribute/Parameter'))
            def value(i):
                return values[i] if i < len(values) else ''
            conditions = []
            for condition in ref.findall('Attribute/Condition'):
                conditions.append([{'function': grid.findtext('Function', ''), 'params': params(grid.find('Parameter'))}
                                   for grid in condition.findall('Grid')])
            # Second condition block is acceptability, first is visibility.
            accept = conditions[1] if len(conditions) > 1 else []
            minimum = [int(c['params'][0]) for c in accept if c['function'] == 'TaskCond:IsLevelAE']
            maximum = [int(c['params'][0]) for c in accept if c['function'] == 'TaskCond:IsLevelMax']
            awards = []
            for group, raw in zip(['fixed', 'choice', 'random'], values[2:5]):
                for award in parse_lua(raw or '{}'):
                    if award.get('szQuestBalanceVersion') in ('20261109-v1', '20261109-v2'):
                        awards.extend(expand_bonus_reward(award, items))
                        continue
                    if 'nQuestOriginalCrystalLevel' in award:
                        upgrade = describe_reward(award, items, reputes)
                        upgrade.update(group='upgrade', step=None, rate=award.get('nRate'))
                        awards.append(upgrade)
                        award = dict(award, varValue=list(award['varValue']))
                        award['varValue'][3] = award['nQuestOriginalCrystalLevel']
                    result = describe_reward(award, items, reputes)
                    result.update(group=group, step=None, rate=award.get('nRate'))
                    awards.append(result)
            if sub is not None:
                action_types = {'TaskAct:AddExp': 'exp', 'TaskAct:AddMoney': 'money',
                                'TaskAct:GiveActiveMoney': 'activemoney', 'TaskAct:AddMakePoint': 'makepoint',
                                'TaskAct:AddGatherPoint': 'gatherpoint', 'TaskAct:AddItem': 'item'}
                for step, node in enumerate(sub.findall('Step'), 1):
                    for grid in node.findall('Process/Execute/Action/Grid'):
                        function = grid.findtext('Function')
                        if function in action_types:
                            arguments = params(grid.find('Parameter'))
                            result = describe_reward({'szType': action_types[function], 'varValue': parse_lua(arguments[0])}, items, reputes)
                            result.update(group='step', step=step, rate=None)
                            awards.append(result)
            npc_id = value(0)
            children.append({
                'id': ref_id, 'subId': sub_id, 'name': ref.get('name', ''),
                'acceptNpc': npcs.get(npc_id, f'NPC #{npc_id}' if npc_id not in ('', '0') else ''),
                'acceptNpcId': npc_id, 'acceptItem': value(1),
                'replyNpc': npcs.get(value(10), ''),
                'minLevel': max(minimum) if minimum else None,
                'maxLevel': min(maximum) if maximum else None,
                'balanceLevel': max(minimum) if minimum else int(value(13) or 1),
                'conditions': conditions, 'rewards': values[2:5], 'awards': awards,
                'source': source, 'subSource': sub_source, 'hasSub': sub is not None,
            })
        chains.append({'id': number, 'name': root.get('name', ''),
                       'type': int(root.findtext('Attribute/TaskType', '0')),
                       'repeat': root.findtext('Attribute/Repeat') == 'true',
                       'order': root.findtext('Attribute/Order', ''), 'source': source, 'quests': children})
    orphans = []
    for number in range(1, 701):
        if number not in referenced_subs:
            sub, source = load('sub', number)
            if sub is not None:
                orphans.append({'id': number, 'name': sub.get('name', ''), 'source': source})
    audit = {'chains': len(chains), 'quests': sum(len(c['quests']) for c in chains),
             'types': dict(Counter(str(c['type']) for c in chains)),
             'questTypes': dict(Counter(str(c['type']) for c in chains for _ in c['quests'])),
             'missingSub': missing, 'unreferencedSub': orphans, 'readSources': dict(sources),
             'pakSha256': hashlib.sha256(pak).hexdigest()}
    audit['awardEntries'] = sum(len(p['awards']) for c in chains for p in c['quests'])
    audit['unresolvedItems'] = sorted({a['itemId'] for c in chains for p in c['quests'] for a in p['awards']
                                      if a['itemId'] and a['label'] == 'Vật phẩm chưa có tên trong bảng cấu hình'})
    (ADMIN / 'lib/quest-catalog.json').write_text(json.dumps(chains, ensure_ascii=False, separators=(',', ':')), 'utf-8')
    (ADMIN / 'docs/wiki-quests-audit.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2), 'utf-8')
    print(json.dumps(audit, ensure_ascii=False))


if __name__ == '__main__':
    export()
