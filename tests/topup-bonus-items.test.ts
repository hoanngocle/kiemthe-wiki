import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { parseMilestones } from "../lib/topup-milestones.ts";
import { loadTopupWiki } from "../lib/topup-wiki.ts";

test("catalog extracts actual bound-stack quantities and exact template icons", () => {
  const script = `
function tbtuiguangyuan:PhucLoiNapThe123()
 table.insert(tbOpt,{"20m", self.PhucLoi_20000K, self});
end
function tbtuiguangyuan:PhucLoi_20000K()
 if nCount_CheckNap >= 20000 then
 if not self:GrantTopupKnb(1,300) then return 0;end --Kim Nguyên Bảo Đại (khóa)
 if not self:GrantTopupCrystal(1,9,10) then return 0;end --Huyền Tinh cấp 9 (khóa)
 if not self:GrantTopupConsumable(1,3031,10) then return 0;end --Bùa Bảo Toàn (khóa)
 end
end`;
  const icons = new Map([["18,1,1338,1", "/item-icons/knb.png"], ["18,1,114,9", "/item-icons/ht9.png"], ["18,1,3031,1", "/item-icons/bua.png"]]);
  assert.deepEqual(parseMilestones(script, icons)[0].rewards, [
    { name: "Kim Nguyên Bảo Đại (khóa)", quantity: 300, iconUrl: "/item-icons/knb.png" },
    { name: "Huyền Tinh cấp 9 (khóa)", quantity: 10, iconUrl: "/item-icons/ht9.png" },
    { name: "Bùa Bảo Toàn (khóa)", quantity: 10, iconUrl: "/item-icons/bua.png" },
  ]);
});

test("the real catalog and Wiki include the complete approved 20–30m additions", async () => {
  const script = await readFile("../gameserver/script/npc/tuiguangyuan.lua", "utf8");
  const tiers = parseMilestones(script);
  assert.equal(tiers.length, 29);
  const sum = (name: string) => tiers.flatMap((t) => t.rewards).filter((r) => r.name === name).reduce((n, r) => n + r.quantity, 0);
  assert.equal(sum("Kim Nguyên Bảo Đại (khóa)"), 6600);
  assert.equal(sum("Huyền Tinh cấp 9 (khóa)"), 50);
  assert.equal(sum("Huyền Tinh cấp 10 (khóa)"), 41);
  assert.equal(sum("Huyền Tinh cấp 11 (khóa)"), 5);
  assert.equal(sum("Bùa Bảo Toàn (khóa)"), 70);
  assert.equal(sum("Tử Không-Vô Hạ Dẫn (khóa)"), 170);
  const wiki = await loadTopupWiki(path.resolve("../gameserver"));
  assert.equal(wiki.totals.knb, 6600);
  assert.deepEqual(wiki.totals.crystals, [{ level: 9, quantity: 50 }, { level: 10, quantity: 41 }, { level: 11, quantity: 5 }]);
  assert.equal(wiki.totals.preservationTalismans, 70);
  assert.equal(wiki.totals.rerollGuides, 170);
  assert.equal(wiki.totals.credits, 93);
});
