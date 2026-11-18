"""Apply the frozen Wiki proposal to quest XML and synchronized PACK overrides.

Existing script awards execute only from Task:OnAward after its completion checks.
No new runtime hook, progress reset, or game process is started by this script.
"""
import argparse
import hashlib
import json
import re
import runpy
import struct
from pathlib import Path
from xml.sax.saxutils import escape
import xml.etree.ElementTree as ET

ADMIN = Path(__file__).resolve().parents[1]
ROOT = ADMIN.parents[1]
VERSION = '20261109-v2'
PATCH = 'codex_quest_rewards_20261109_v2.pak'
BASELINE = ROOT / '.diagnostics/quest-rewards-20261109'
BACKUP = ROOT / '.diagnostics/quest-rewards-20261109-v2'


def upgrade_crystals(source):
    pattern = r'(\{szType="(?:item|customizeitem)",)(varValue=\{18,1,(?:1|114),)(\d+)(,)'
    return re.sub(pattern, lambda m: m[1] + f'nQuestOriginalCrystalLevel={m[3]},' + m[2] + str(max(5, int(m[3]) + 2)) + m[4], source)


def restore_crystals(source):
    pattern = r'(\{szType="(?:item|customizeitem)",)nQuestOriginalCrystalLevel=(\d+),(varValue=\{18,1,(?:1|114),)\d+(,)'
    return re.sub(pattern, lambda m: m[1] + m[3] + m[2] + m[4], source)


def make_award(bonus, pool):
    code, labels = [], []
    for key, method, label in [('coin', 'me.AddJbCoin', 'Đồng thường'),
                               ('silver', 'me.AddBindMoney', 'Bạc khóa'),
                               ('make', 'TaskAct:AddMakePoint', 'Tinh lực'),
                               ('gather', 'TaskAct:AddGatherPoint', 'Hoạt lực')]:
        count = bonus[key]
        assert isinstance(count, int) and count >= 0
        if count:
            arguments = f'{count},Player.emKBINDMONEY_ADD_TASK' if key == 'silver' else str(count)
            code.append(f'{method}({arguments})')
            labels.append(f'{count} {label}')
    if bonus['repute']:
        assert pool
        table = '{' + ','.join('{' + f'{camp},{cls}' + '}' for camp, cls in pool) + '}'
        code.append(f'local tb={table};local r=tb[MathRandom(1,{len(pool)})];me.AddRepute(r[1],r[2],{bonus["repute"]})')
        labels.append(f'{bonus["repute"]} điểm danh vọng ngẫu nhiên (1/{len(pool)} loại)')
    crystal = bonus['crystal'] or 0
    if crystal:
        code.append(f'me.AddStackItem(18,1,114,{crystal},{{bForceBind=1}},{bonus["crystalCount"]})')
        labels.append(f'{bonus["crystalCount"]} Huyền Tinh cấp {crystal} khóa')
    if bonus['spirit']:
        code.append(f'me.AddStackItem(18,1,3071,1,{{bForceBind=1}},{bonus["spirit"]})')
        labels.append(f'{bonus["spirit"]} Linh Khí khóa')
    metadata = ','.join(f'{key}={value}' for key, value in [
        ('coin', bonus['coin']), ('silver', bonus['silver']), ('make', bonus['make']),
        ('gather', bonus['gather']), ('repute', bonus['repute']), ('crystal', crystal), ('crystalCount', bonus.get('crystalCount', 0)), ('spirit', bonus['spirit'])])
    def quote(value):
        return json.dumps(value, ensure_ascii=False)
    return '{szType="script",varValue=' + quote(';'.join(code)) + ',nSprIdx="22",szDesc=' + quote('Bổ sung: ' + ' · '.join(labels)) + ',szCondition1="TaskAwardCond:None",szCondition2="TaskAwardCond:None",szCondition3="TaskAwardCond:None",szQuestBalanceVersion="' + VERSION + '",tbQuestBonus={' + metadata + '},},'


def patch_xml(source, additions):
    if 'szQuestBalanceVersion' in source:
        raise ValueError('Bonus already installed; refusing to duplicate rewards')
    seen = set()
    def patch_sub(match):
        block = match[0]
        ref = int(re.search(r'\bid="([0-9a-f]+)"', block, re.I)[1], 16)
        if ref not in additions:
            raise ValueError(f'Unexpected reference {ref}')
        award = re.search(r'<award>\s*<Value>([\s\S]*?)</Value>\s*</award>', block)
        if not award:
            raise ValueError(f'Missing fixed award value in reference {ref}')
        literal = award[1]
        position = len(literal.rstrip()) - 1
        if position < 0 or literal[position] != '}':
            raise ValueError('Malformed fixed award literal')
        seen.add(ref)
        insertion = award.start(1) + position
        return block[:insertion] + escape(additions[ref]) + block[insertion:]
    result = re.sub(r'<Sub\b[^>]*>[\s\S]*?</Sub>', patch_sub, upgrade_crystals(source), flags=re.I)
    if seen != set(additions):
        raise ValueError(f'Unmatched references: {set(additions) - seen}')
    ET.fromstring(result)
    return result


def pack_bytes(resources):
    helpers = runpy.run_path(str(ADMIN / 'scripts/export-item-icons.py'))
    entries = sorted((helpers['filename_hash']('\\' + name.replace('/', '\\')), name, data)
                     for name, data in resources.items())
    assert len({entry[0] for entry in entries}) == len(entries), 'PACK hash collision'
    body, rows = bytearray(), []
    for fid, _, data in entries:
        assert len(data) < 0x1000000
        rows.append((fid, 32 + len(body), len(data), len(data)))
        body.extend(data)
    return b'PACK' + struct.pack('<3I', len(rows), 32 + len(body), 32) + bytes(16) + body + b''.join(struct.pack('<4I', *row) for row in rows)


def prepend_package(raw):
    text = raw.decode('utf-8')
    assert PATCH not in text, 'Package already installed'
    start = text.index('[Package]')
    end = text.find('\n[', start + 1)
    end = len(text) if end < 0 else end
    region = text[start:end]
    previous = re.findall(r'^\d+=(.+\.pak)\s*$', region, re.M)
    region = re.sub(r'^(\d+)=(.*)$', lambda m: f'{int(m[1]) + 1}={m[2]}', region, flags=re.M)
    first = re.search(r'^1=', region, re.M)
    assert first
    eol = '\r\n' if '\r\n' in region else '\n'
    region = region[:first.start()] + '0=' + PATCH + eol + region[first.start():]
    result = text[:start] + region + text[end:]
    assert re.findall(r'^\d+=(.+\.pak)\s*$', result, re.M)[1:] == previous
    return result.encode('utf-8')


def apply(do_apply=False):
    proposal = json.loads((ADMIN / 'docs/quest-bonus-20261109.json').read_text('utf-8'))
    assert proposal['version'] == VERSION
    pool = [[entry['camp'], entry['classId']] for entry in proposal['reputePool']]
    assert pool == [[1, 1], [1, 2], [2, 1], [2, 2], [2, 3], [5, 1], [5, 3]]
    tasks, resources, originals, updated = {}, {}, {}, {}
    for entry in proposal['entries']:
        if entry['repeat']:
            assert entry['bonus']['crystal'] is None and entry['bonus']['spirit'] == 0
        tasks.setdefault(entry['source'], {})[entry['refId']] = make_award(entry['bonus'], pool)
    for source, additions in tasks.items():
        file = ROOT / source
        original = file.read_bytes()
        baseline_file = BASELINE / 'originals' / source
        previous_manifest = json.loads((BASELINE / 'manifest.json').read_text('utf-8'))
        assert hashlib.sha256(original).hexdigest() == previous_manifest['files'][str(file.relative_to(ROOT))]['after'], f'Subsequent quest edit: {file}'
        result = patch_xml(baseline_file.read_bytes().decode('utf-8'), additions).encode('utf-8')
        originals[file], updated[file] = original, result
        resources[file.relative_to(ROOT / 'Server/gameserver').as_posix()] = result
    for entry in proposal['entries']:
        file = ROOT / entry['subSource']
        resources[file.relative_to(ROOT / 'Server/gameserver').as_posix()] = file.read_bytes()
    payload = pack_bytes(resources)
    configs = {}
    for base in ['Client', 'Server/gameserver']:
        file = ROOT / base / 'package.ini'
        configs[file] = file.read_bytes()
        updated[file] = prepend_package(configs[file])
        originals[file] = configs[file]
        assert not (ROOT / base / 'pak' / PATCH).exists(), 'Patch file already exists'
    manifest = {'version': VERSION, 'references': len(proposal['entries']), 'taskFiles': len(tasks),
                'resourceCount': len(resources), 'reputePool': pool, 'patch': PATCH,
                'sha256': hashlib.sha256(payload).hexdigest(),
                'files': {str(file.relative_to(ROOT)): {'before': hashlib.sha256(originals[file]).hexdigest(),
                                                      'after': hashlib.sha256(result).hexdigest()}
                          for file, result in updated.items()}}
    if not do_apply:
        print(json.dumps({key: value for key, value in manifest.items() if key != 'files'}))
        return
    assert not BACKUP.exists(), 'Backup already exists; do not overwrite'
    BACKUP.mkdir(parents=True)
    for file, data in originals.items():
        target = BACKUP / 'originals' / file.relative_to(ROOT)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    (BACKUP / 'original-catalog.json').write_bytes((ADMIN / 'lib/quest-catalog.json').read_bytes())
    for file, data in originals.items():
        assert file.read_bytes() == data, f'Concurrent edit: {file}'
    for base in ['Client', 'Server/gameserver']:
        (ROOT / base / 'pak' / PATCH).write_bytes(payload)
    # Payloads and loose XML exist before the package configurations activate them.
    for file, data in updated.items():
        if file not in configs:
            file.write_bytes(data)
    for file in configs:
        assert file.read_bytes() == configs[file], f'Concurrent package edit: {file}'
        file.write_bytes(updated[file])
    (BACKUP / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), 'utf-8')
    print(json.dumps({key: value for key, value in manifest.items() if key != 'files'}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--apply', action='store_true')
    apply(parser.parse_args().apply)
