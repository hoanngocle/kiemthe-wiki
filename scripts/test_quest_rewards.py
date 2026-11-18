import unittest
from quest_rewards import parse_lua, describe_reward, expand_bonus_reward


class RewardTests(unittest.TestCase):
    def test_nested_tables_and_escaped_strings(self):
        value = parse_lua('{{szType="item",varValue={18,1,1,5,0,-1,},szDesc="a, \\"b\\"",},}')
        self.assertEqual(value[0]['varValue'], [18, 1, 1, 5, 0, -1])
        self.assertEqual(value[0]['szDesc'], 'a, "b"')

    def test_money_is_locked_silver_and_genie_coin_is_locked_coin(self):
        self.assertEqual(describe_reward({'szType': 'money', 'varValue': 300}, {}, {})['label'], 'Bạc khóa')
        result = describe_reward({'szType': 'genieaward', 'varValue': [4, 200, 0]}, {}, {})
        self.assertEqual((result['label'], result['amount']), ('Đồng khóa', 200))

    def test_item_count_comes_from_add_param_not_item_series(self):
        result = describe_reward({'szType': 'item', 'varValue': [2, 7, 5, 3, 3, -1], 'szAddParam1': 0,
                                  'szCondition1': 'TaskAwardCond:IsJin'}, {'2,7,5,3': 'Nhẫn gốc'}, {})
        self.assertEqual((result['label'], result['amount'], result['conditions']), ('Nhẫn gốc', 1, ['Hệ Kim']))

    def test_limited_script_reward_is_not_unconditional(self):
        result = describe_reward({'szType': 'script', 'varValue': 'Task:Award_1(20000)'}, {}, {})
        self.assertEqual((result['label'], result['amount']), ('Bạc', 20000))
        self.assertIn('4 lần/tuần', result['note'])

    def test_rejects_executable_expressions(self):
        with self.assertRaises(ValueError):
            parse_lua('{varValue=os.execute("anything")}')

    def test_applied_bonus_expands_into_separate_currency_energy_reputation_and_items(self):
        result = expand_bonus_reward({'tbQuestBonus': {'coin': 500, 'silver': 9700, 'make': 180,
            'gather': 180, 'repute': 10, 'crystal': 6, 'crystalCount': 2, 'spirit': 20}}, {})
        self.assertEqual([(a['kind'], a['amount']) for a in result],
                         [('coin', 500), ('bindmoney', 9700), ('makepoint', 180), ('gatherpoint', 180),
                          ('repute', 10), ('item', 2), ('item', 20)])
        self.assertTrue(all(a['group'] == 'bonus' for a in result))
        self.assertEqual(result[5]['itemId'], '18,1,114,6')


if __name__ == '__main__':
    unittest.main()
