"""Run the real Lua bridge against a minimal game-engine boundary (Lua 5.1)."""
import pathlib
import unittest
import xml.etree.ElementTree as ET
import sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[3] / "tests"))
from lua_runtime_support import LuaRuntime

ROOT = pathlib.Path(__file__).resolve().parents[2] / "gameserver"


class LocalTopupTest(unittest.TestCase):
    def setUp(self):
        self.lua = LuaRuntime(unpack_returned_tuples=True)
        self.lua.execute("""
            tasks = {['3091:1'] = 77}; balance = 0; data = nil; messages = {}; requestedPath = nil
            KFile = {ReadTxtFile = function(path) requestedPath = path; return data end}
            player = {
                szAccount = 'emilia', szName = 'Emilia',
                GetTask = function(g, i) return tasks[g .. ':' .. i] or 0 end,
                SetTask = function(g, i, n) tasks[g .. ':' .. i] = n end,
                GetJbCoin = function() return balance end,
                Msg = function(s) table.insert(messages, s) end
            }
        """)
        self.lua.execute((ROOT / "script/npc/local_topup.lua").read_text(encoding="utf-8"))

    def sync(self, total=100, identity="656D696C6961-456D696C6961"):
        self.lua.globals().data = f"KTL1\t{identity}\t{total}\n"
        return self.lua.eval("LocalTopup:Sync(player)")

    def task(self, g):
        return self.lua.eval(f"player.GetTask({g}, 1)")

    def test_selected_character_gets_pending_coins_and_milestone_credit_once(self):
        self.assertEqual(self.sync(), 100)
        self.assertEqual(self.task(3060), 100)
        self.assertEqual(self.task(3090), 100)
        self.assertEqual(self.task(7049), 100)
        self.assertEqual(self.task(3091), 77)  # Existing pet-collection progress.
        self.assertEqual(self.sync(), 0)
        self.assertEqual(self.sync(400), 300)
        self.assertEqual(self.task(3060), 400)
        self.assertEqual(self.task(3090), 400)
        self.assertEqual(self.lua.globals().requestedPath, "\\local-topup\\656D696C6961-456D696C6961.txt")

    def test_wrong_character_and_bad_or_rolled_back_file_never_credit(self):
        self.assertEqual(self.sync(identity="656D696C6961-4865726F"), 0)
        for value in ["broken", "KTL1\t656D696C6961-456D696C6961\t-50\n", "KTL1\t656D696C6961-456D696C6961\t1.5\n"]:
            self.lua.globals().data = value
            self.assertEqual(self.lua.eval("LocalTopup:Sync(player)"), 0)
        self.assertEqual(self.task(3060), 0)
        self.sync(100)
        self.assertEqual(self.sync(50), 0)
        self.assertEqual(self.task(3060), 100)

    def test_old_partial_sync_credits_full_total_at_wallet_limit(self):
        self.load_npc()
        self.lua.execute("""
            balance = 2000000000
            tasks['3060:1'] = 19703
            tasks['7049:1'] = 19700
        """)
        self.lua.globals().data = "KTL1\t656D696C6961-456D696C6961\t34000\n"
        self.lua.execute("Npc:GetClass('tuiguangyuan'):OnDialog()")
        self.assertEqual(self.task(3060), 34003)
        self.assertEqual(self.task(3090), 14300)
        self.assertEqual(self.task(7049), 34000)
        self.lua.execute("Npc:GetClass('tuiguangyuan'):OnDialog()")
        self.assertEqual(self.task(3060), 34003)
        self.assertEqual(self.task(3090), 14300)
        self.lua.execute("Npc:GetClass('tuiguangyuan'):PhucLoi_250000K()")
        self.assertEqual(self.lua.eval("player.GetTask(7053, 1)"), 8)

    def test_npc_pays_only_what_fits_and_preserves_the_remainder(self):
        self.load_npc()
        self.lua.globals().data = "KTL1\t656D696C6961-456D696C6961\t34000\n"
        claim = "Npc:GetClass('tuiguangyuan'):NhanDong_Nap()"
        self.lua.execute(f"balance = 2000000000; {claim}")
        self.assertEqual(self.lua.globals().balance, 2000000000)
        self.assertEqual(self.task(3090), 34000)
        self.lua.execute(f"balance = 0; {claim}")
        self.assertEqual(self.lua.globals().balance, 2000000000)
        self.assertEqual(self.task(3090), 14000)
        self.lua.execute(f"balance = 0; {claim}; {claim}")
        self.assertEqual(self.lua.globals().balance, 1400000000)
        self.assertEqual(self.task(3090), 0)
        self.assertEqual(self.task(3060), 34000)

    def test_npc_keeps_unpaid_amount_after_a_short_or_failed_payout(self):
        self.load_npc()
        self.sync(100)
        claim = "Npc:GetClass('tuiguangyuan'):NhanDong_Nap()"
        self.lua.execute(f"player.AddJbCoin = function(n) return 0 end; {claim}")
        self.assertEqual(self.task(3090), 100)
        self.lua.execute(f"player.AddJbCoin = function(n) balance = balance + 123 end; {claim}")
        self.assertEqual(self.lua.globals().balance, 123)
        self.lua.execute(f"player.AddJbCoin = function(n) balance = balance + n end; {claim}; {claim}")
        self.assertEqual(self.lua.globals().balance, 10000000)
        self.assertEqual(self.task(3090), 0)

    def load_npc(self):
        self.lua.execute("""
            Npc = {classes = {}, GetClass = function(self, key)
                self.classes[key] = self.classes[key] or {}; return self.classes[key]
            end}
            DoScript = function() end
            me = player; awards = {}; titles = {}
            player.CountFreeBagCell = function() return 30 end
            player.AddJbCoin = function(n) balance = balance + n end
            player.GetUserPayCoin = function() return 0 end
            player.AddExp = function(n) awards.exp = (awards.exp or 0) + n end
            player.AddStackItem = function(g,d,p,l,info,n) awards[p] = (awards[p] or 0) + n end
            player.GetItemCountInBags = function(g,d,p,l) return awards[p] or 0 end
            player.AddTitle = function(...) end; player.SetCurTitle = function(...) end
            player.AddKinReputeEntry = function(n) awards.uy = (awards.uy or 0) + n end
            player.AddItem = function(...) return {Bind = function() end} end
            Dialog = {Say = function(...) end}; KDialog = {MsgToGlobal = function(...) end}
        """)
        self.lua.execute((ROOT / "script/npc/topup_rewards.lua").read_text(encoding="utf-8"))
        self.lua.execute((ROOT / "script/npc/topup_bonus_items.lua").read_text(encoding="utf-8"))
        self.lua.execute("loadedTitles={};KPlayer={GetTitleLevelAttr=function(g,d,l)return loadedTitles[g..','..d..','..l]end}")
        for genre in ET.parse(ROOT / "setting/player/title.xml").getroot().findall("genre"):
            for detail in genre.findall("detailtype"):
                for level in detail.findall("level"):
                    key = ",".join([genre.get("id"), detail.get("id"), level.get("id")])
                    self.lua.globals().loadedTitles[key] = self.lua.table_from({"szTitleName": level.get("name")})
        self.lua.execute((ROOT / "script/npc/tuiguangyuan.lua").read_text(encoding="utf-8"))

    def test_existing_npc_integrates_the_bridge_and_redeems_100k_once(self):
        self.load_npc()
        self.lua.globals().data = "KTL1\t656D696C6961-456D696C6961\t100\n"
        self.lua.execute("Npc:GetClass('tuiguangyuan'):OnDialog(); Npc:GetClass('tuiguangyuan'):NhanDong_Nap()")
        self.assertEqual(self.lua.globals().balance, 10000000)
        self.assertEqual(self.task(3090), 0)
        self.lua.execute("Npc:GetClass('tuiguangyuan'):NhanDong_Nap()")
        self.assertEqual(self.lua.globals().balance, 10000000)
        self.lua.execute("Npc:GetClass('tuiguangyuan'):PhucLoi_100K(); Npc:GetClass('tuiguangyuan'):PhucLoi_100K()")
        self.assertIsNone(self.lua.globals().awards[1643])  # Missing template removed.
        self.assertIsNone(self.lua.globals().awards[2078])  # Missing template removed.
        self.assertEqual(self.lua.globals().awards.exp, 1000000000)
        self.assertEqual(self.task(3065), 1)

    def test_25_million_threshold_accepts_exactly_25000k_once(self):
        self.load_npc()
        self.lua.execute("tasks['3060:1'] = 24999; Npc:GetClass('tuiguangyuan'):PhucLoi_250000K()")
        self.assertEqual(self.lua.eval("player.GetTask(7053, 1)"), 0)
        self.lua.execute("tasks['3060:1'] = 25000; Npc:GetClass('tuiguangyuan'):PhucLoi_250000K()")
        self.assertEqual(self.lua.eval("player.GetTask(7053, 1)"), 8)
        self.assertIsNone(self.lua.globals().awards[3095])  # Removed rental chest.
        self.assertIsNone(self.lua.globals().awards[1643])
        self.assertEqual(self.task(3087), 1)
        self.lua.execute("Npc:GetClass('tuiguangyuan'):PhucLoi_250000K()")
        self.assertEqual(self.lua.eval("player.GetTask(7053, 1)"), 8)


if __name__ == "__main__":
    unittest.main()
