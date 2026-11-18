import unittest
import xml.etree.ElementTree as ET
from apply_quest_bonus import patch_xml, make_award, upgrade_crystals, restore_crystals
from quest_rewards import parse_lua


class BonusTests(unittest.TestCase):
    def test_original_crystals_increase_two_levels_with_floor_five_and_keep_quantity(self):
        source = '{{szType="item",varValue={18,1,1,3,0,-1,},szAddParam1=5,},{szType="item",varValue={18,1,114,4,0,-1,},szAddParam1=2,},}'
        updated = upgrade_crystals(source)
        rewards = parse_lua(updated)
        self.assertEqual(rewards[0]['varValue'][3], 5)
        self.assertEqual(rewards[1]['varValue'][3], 6)
        self.assertEqual(rewards[0]['szAddParam1'], 5)
        self.assertEqual(rewards[1]['szAddParam1'], 2)
        self.assertEqual(restore_crystals(updated), source)

    def test_only_first_award_value_changes_and_second_apply_is_rejected(self):
        source = '<Task><Managed><Sub id="0001" refer="0001"><Attribute><Parameter><award><Value>{{szType="exp",varValue=10,},}</Value></award><award><Value>{}</Value></award></Parameter></Attribute></Sub></Managed></Task>'
        extra = make_award({'coin': 500, 'silver': 9700, 'make': 180, 'gather': 180, 'repute': 10, 'crystal': None, 'spirit': 0}, [[1, 1], [1, 2]])
        result = patch_xml(source, {1: extra})
        node = ET.fromstring(result).find('Managed/Sub/Attribute/Parameter')
        rewards = parse_lua(node.findtext('award/Value'))
        self.assertEqual(rewards[0], {'szType': 'exp', 'varValue': 10})
        self.assertEqual(len(rewards), 2)
        self.assertEqual(node.findall('award')[1].findtext('Value'), '{}')
        self.assertEqual(result.replace(extra, ''), source)
        with self.assertRaises(ValueError):
            patch_xml(result, {1: extra})

    def test_script_uses_regular_coin_and_forces_bound_materials(self):
        raw = make_award({'coin': 500, 'silver': 100, 'make': 40, 'gather': 40, 'repute': 0, 'crystal': 6, 'crystalCount': 2, 'spirit': 20}, [[1, 1]])
        entry = parse_lua('{' + raw + '}')[0]
        self.assertIn('me.AddJbCoin(500)', entry['varValue'])
        self.assertNotIn('AddBindCoin', entry['varValue'])
        self.assertNotIn('MathRandom', entry['varValue'])
        self.assertIn('me.AddStackItem(18,1,114,6,{bForceBind=1},2)', entry['varValue'])
        self.assertIn('me.AddStackItem(18,1,3071,1,{bForceBind=1},20)', entry['varValue'])


if __name__ == '__main__':
    unittest.main()
