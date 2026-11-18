import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { loadTopupWiki, parseTopupWiki } from "../lib/topup-wiki.ts";

test("Wiki reads the current 29-tier game catalog and all material/equipment choices", async () => {
  const data = await loadTopupWiki(path.resolve("../gameserver"));
  assert.equal(data.milestones.length, 29);
  assert.equal(data.totals.credits, 93);
  assert.equal(data.totals.materialUnits, 930000);
  assert.equal(data.totals.exp, 49000000000);
  assert.equal(data.totals.repute, 39500);
  assert.equal(data.totals.bonusCoin, 180000000);
  assert.equal(data.totals.books, 50);
  assert.equal(data.materials.length, 7);
  assert.deepEqual(data.equipment.map((stage) => [stage.amountK, stage.name]), [[4000, "Bạch Kim"], [5000, "Bạch Kim +1"], [7000, "Vô Minh"], [10000, "Vô Thần"]]);
  assert.equal(data.titles.length, 17);
  assert.equal(data.titles.at(-1)?.amountK, 30000);
  assert.equal(data.titles.at(-1)?.name, "Kẻ Diệt Thần");
  assert.ok(data.titles.every((title) => !title.name.includes("<") && !title.name.includes("Hoàng Đế")));
});

const script = `
function tbtuiguangyuan:PhucLoiNapThe123()
 table.insert(tbOpt,{"50K", self.PhucLoi_50K, self});
end
function tbtuiguangyuan:PhucLoi_50K()
 if nCount_CheckNap >= 50 then
 self.CreditTopupMaterials = nil;
 self:CreditTopupMaterials(2); --Phiếu chọn nguyên liệu
 self:GrantTopupTitle(19,1,1,1); --Danh hiệu cũ chưa cập nhật
 end
end`;
const helper = `
tb.TopupMaterials = {
 {id={18,1,9115,3}, name="Kinh Mạch Toàn Thư"},
};
tb.TopupEquipment = {
 {particular=1, level=9, name="Bạch Kim"},
};
local remaining=me.GetTask(g,1)*10000-me.GetTask(g,2);`;
const titles = `<title><genre id="19"><detailtype id="1"><level id="1" name="&lt;color=red&gt;Tên Mới &amp; Vòng Sáng&lt;color&gt;" description="Chỉ hiển thị; không cộng chỉ số." duration="0" graph="72"/></detailtype></genre></title>`;

test("title names come from the referenced XML entry even if Lua comments are stale", () => {
  const data = parseTopupWiki(script, helper, titles);
  assert.equal(data.titles[0].name, "Tên Mới & Vòng Sáng");
  assert.equal(data.titles[0].graph, 72);
  assert.equal(data.titles[0].durationMinutes, 0);
  assert.equal(data.titles[0].description, "Chỉ hiển thị; không cộng chỉ số.");
  assert.equal(data.totals.materialUnits, 20000);
  assert.ok(data.milestones[0].rewards.some((reward) => reward.name === "Danh hiệu Tên Mới & Vòng Sáng và vòng sáng"));
  assert.ok(!JSON.stringify(data).includes("cũ chưa cập nhật"));
});

test("unknown granted title IDs fail visibly instead of advertising an unconfigured reward", () => {
  assert.throws(() => parseTopupWiki(script.replace("19,1,1,1", "23,1,1,1"), helper, titles), /danh hiệu/i);
});

test("loading Wiki again reads edited game files without a stale snapshot", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "kiemthe-topup-wiki-"));
  try {
    await mkdir(path.join(root, "script/npc"), { recursive: true });
    await mkdir(path.join(root, "setting/player"), { recursive: true });
    await writeFile(path.join(root, "script/npc/tuiguangyuan.lua"), script);
    await writeFile(path.join(root, "script/npc/topup_rewards.lua"), helper);
    await writeFile(path.join(root, "setting/player/title.xml"), titles);
    assert.equal((await loadTopupWiki(root)).titles[0].name, "Tên Mới & Vòng Sáng");
    await writeFile(path.join(root, "setting/player/title.xml"), titles.replace("Tên Mới", "Tên Vừa Đổi"));
    assert.equal((await loadTopupWiki(root)).titles[0].name, "Tên Vừa Đổi & Vòng Sáng");
  } finally { await rm(root, { recursive: true, force: true }); }
});
