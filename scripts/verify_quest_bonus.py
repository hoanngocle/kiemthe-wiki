"""Verify all proposed/applied rewards against real XML and the game GiveAward handler."""
import argparse
import hashlib
import json
import re
import struct
import subprocess
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path
from apply_quest_bonus import ROOT, ADMIN, PATCH, BACKUP, BASELINE, VERSION, make_award, patch_xml, restore_crystals
from quest_rewards import parse_lua


def verify(applied=False):
    proposal = json.loads((ADMIN / 'docs/quest-bonus-20261109.json').read_text('utf-8'))
    baseline_catalog = json.loads((BASELINE / 'original-catalog.json').read_text('utf-8'))
    baseline_parts = {part['id']: part for quest in baseline_catalog for part in quest['quests']}
    pool = [[entry['camp'], entry['classId']] for entry in proposal['reputePool']]
    expected, cases = {}, []
    for entry in proposal['entries']:
        part = baseline_parts[entry['refId']]
        step = part['balanceLevel'] // 10 + 1
        def base_amount(kinds):
            return sum(a['amount'] or 0 for a in part['awards'] if a['kind'] in kinds
                       and a['group'] in ('fixed', 'step') and not a['conditions'] and not a['note'])
        assert entry['bonus']['coin'] == max(0, step * 500 - base_amount(['coin']))
        assert entry['bonus']['repute'] == step * 5
        assert entry['bonus']['make'] == 14 * base_amount(['makepoint'])
        assert entry['bonus']['gather'] == 14 * base_amount(['gatherpoint'])
        raw = make_award(entry['bonus'], pool)
        award = parse_lua('{' + raw + '}')[0]
        assert award['szQuestBalanceVersion'] == VERSION
        assert award['tbQuestBonus']['coin'] == entry['bonus']['coin']
        file = ROOT / entry['source']
        expected.setdefault(file, {})[entry['refId']] = raw
        cases.append('{script=' + json.dumps(award['varValue'], ensure_ascii=False) + ',bonus=' +
                     '{' + ','.join(f'{key}={value}' for key, value in award['tbQuestBonus'].items()) + '}}')
    resources = {}
    for file, additions in expected.items():
        original = (BASELINE / 'originals' / file.relative_to(ROOT)).read_bytes()
        patched = patch_xml(original.decode('utf-8'), additions).encode('utf-8')
        if applied:
            assert file.read_bytes() == patched, f'Unexpected applied XML: {file}'
        # Undo exactly each insertion and prove all other bytes are untouched.
        reverted = patched.decode('utf-8')
        for raw in additions.values():
            from xml.sax.saxutils import escape
            escaped = escape(raw)
            assert reverted.count(escaped) >= 1
            reverted = reverted.replace(escaped, '', 1)
        assert restore_crystals(reverted).encode('utf-8') == original
        root = ET.fromstring(patched.decode('utf-8'))
        for ref in root.findall('Managed/Sub'):
            raw = ref.findtext('Attribute/Parameter/award/Value')
            bonuses = [a for a in parse_lua(raw) if a.get('szQuestBalanceVersion') == VERSION]
            assert len(bonuses) == 1
            for award in parse_lua(raw):
                if 'nQuestOriginalCrystalLevel' in award:
                    assert award['varValue'][3] == max(5, award['nQuestOriginalCrystalLevel'] + 2)
        resources[file.relative_to(ROOT / 'Server/gameserver').as_posix()] = patched
    for entry in proposal['entries']:
        file = ROOT / entry['subSource']
        resources[file.relative_to(ROOT / 'Server/gameserver').as_posix()] = file.read_bytes()
    if applied:
        from apply_quest_bonus import pack_bytes
        wanted = pack_bytes(resources)
        for base in ['Client', 'Server/gameserver']:
            payload = (ROOT / base / 'pak' / PATCH).read_bytes()
            assert payload == wanted
            text = (ROOT / base / 'package.ini').read_text('utf-8')
            assert re.search(r'^0=' + re.escape(PATCH) + r'\s*$', text, re.M)
            count, index = struct.unpack_from('<2I', payload, 4)
            assert count == 1125 and index + count * 16 == len(payload)
            before = (BACKUP / 'originals' / base / 'package.ini').read_text('utf-8')
            assert re.findall(r'^\d+=(.+\.pak)\s*$', text, re.M)[1:] == re.findall(r'^\d+=(.+\.pak)\s*$', before, re.M)
    source = (ROOT / 'Server/gameserver/script/task/task.lua').read_text('utf-8')
    handler = source[source.index('function Task:GiveAward('):source.index('function Task:WriteItemLog(')]
    harness = '''
unpack=table.unpack;loadstring=load;Task={};Player={emKBINDMONEY_ADD_TASK=71}
''' + handler + '\nlocal cases={' + ',\n'.join(cases) + '''}
local pool={{1,1},{1,2},{2,1},{2,2},{2,3},{5,1},{5,3}}
local tested=0
for _,case in ipairs(cases) do
  assert(load(case.script))
  for roll=1,7 do
    local got={coin=0,silver=0,make=0,gather=0,repute=0,crystal=0,crystalCount=0,spirit=0,randomCalls=0}
    me={
      AddJbCoin=function(n) got.coin=got.coin+n end,
      AddBindMoney=function(n,way) assert(way==71);got.silver=got.silver+n end,
      AddRepute=function(camp,cls,n) assert(camp==pool[roll][1] and cls==pool[roll][2]);got.repute=got.repute+n end,
      AddStackItem=function(g,d,p,l,opts,n)
        assert(g==18 and d==1 and opts.bForceBind==1)
        if p==114 then assert(n==2);got.crystal=l;got.crystalCount=got.crystalCount+n
        elseif p==3071 then assert(l==1);got.spirit=got.spirit+n
        else error("Unexpected item") end
      end,
    }
    TaskAct={AddMakePoint=function(_,n) got.make=got.make+n end,
             AddGatherPoint=function(_,n) got.gather=got.gather+n end}
    MathRandom=function(low,high) assert(low==1 and high==7);got.randomCalls=got.randomCalls+1;return roll end
    Task:GiveAward({szType="script",varValue=case.script},1)
    for key,value in pairs(case.bonus) do assert(got[key]==value,key..": "..got[key].." != "..value) end
    assert(got.randomCalls==(case.bonus.repute>0 and 1 or 0))
    tested=tested+1
  end
end
print("Lua GiveAward: "..tested.." complete grants verified, all seven random outcomes")
'''
    with tempfile.TemporaryDirectory(prefix='quest-bonus-test-') as temporary:
        file = Path(temporary) / 'verify.lua'
        file.write_text(harness, 'utf-8')
        subprocess.run(['lua', str(file)], check=True)
    print(json.dumps({'applied': applied, 'questReferences': len(cases), 'originalXmlPreserved': True,
                      'resources': len(resources), 'checks': 'XML, literal decoding, actual GiveAward, random endpoints, currencies, binding, quantities'}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--applied', action='store_true')
    verify(parser.parse_args().applied)
