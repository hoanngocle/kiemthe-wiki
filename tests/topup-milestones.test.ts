import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parseMilestones, sumTopups, milestoneProgress } from "../lib/topup-milestones.ts";
import type { TopupReceipt } from "../lib/topup-types.ts";

const first = { id: "61-41", name: "Hero", account: "a" };
const second = { id: "62-42", name: "Other", account: "b" };
test("totals include older receipts beyond the20-row history and isolate each character", () => {
  const receipts: TopupReceipt[] = Array.from({ length: 25 }, (_, i) => ({ requestId: String(i), character: first, amountK: 100, coin: 10000000, createdAt: "2026-11-08T00:00:00Z" }));
  receipts.push({ requestId: "other", character: second, amountK: 500, coin: 50000000, createdAt: "2026-11-08T00:00:00Z" });
  assert.deepEqual(sumTopups(receipts), { "61-41": 2500, "62-42": 500 });
  assert.deepEqual(sumTopups([]), {});
});

test("progress qualifies all lower tiers and gives the exact next requirement", () => {
  const tiers = [50, 100, 300].map((amountK) => ({ amountK, rewards: [] }));
  assert.deepEqual(milestoneProgress(tiers, 0), { reached: 0, nextK: 50, remainingK: 50, percent: 0 });
  assert.deepEqual(milestoneProgress(tiers, 100), { reached: 2, nextK: 300, remainingK: 200, percent: 100 / 3 });
  assert.deepEqual(milestoneProgress(tiers, 500), { reached: 3, nextK: null, remainingK: 0, percent: 100 });
});

test("catalog uses actual grant quantities and sums repeated rewards without counting comments", () => {
  const fixture = `
function tbtuiguangyuan:PhucLoiNapThe123()
 table.insert(tbOpt,{"Mốc25 triệu", self.PhucLoi_250000K, self});
 -- table.insert(tbOpt,{"Ẩn", self.PhucLoi_32000K, self});
end
function tbtuiguangyuan:PhucLoi_250000K()
 if nCount_CheckNap >= 25000 then
 me.AddExp(1000000000);
 me.AddExp(1000000000);
 -- me.AddExp(9999);
 me.AddStackItem(18,1,25194,1,nil, 2000); --1000 Bình Ngọc Bích
 me.AddItem(5,19,12,10); --Trang Bị Đồng Hành (Cấp12)
 me.AddTitle(23,1,1,1); --Danh Hiệu
 me.SetCurTitle(23,1,1,1);
 end
end
function tbtuiguangyuan:PhucLoi_32000K()
 if nCount_CheckNap >= 32000 then me.AddJbCoin(123); end
end`;
  assert.deepEqual(parseMilestones(fixture), [{ amountK: 25000, rewards: [
    { name: "Kinh nghiệm", quantity: 2000000000 },
    { name: "Bình Ngọc Bích", quantity: 2000 },
    { name: "Trang Bị Đồng Hành (Cấp12)", quantity: 1 },
    { name: "Danh Hiệu", quantity: 1 },
  ] }]);
});

test("the game's active reward menu has29 tiers, corrected25m, and no hidden32m+ options", async () => {
  const source = await readFile("../gameserver/script/npc/tuiguangyuan.lua", "utf8");
  const tiers = parseMilestones(source);
  assert.deepEqual(tiers.map((tier) => tier.amountK), [50, 100, 300, 500, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 15000, 16000, 17000, 18000, 19000, 20000, 22000, 23000, 24000, 25000, 26000, 27000, 28000, 29000, 30000]);
  assert.equal(tiers.find((tier) => tier.amountK === 6000)?.rewards.find((reward) => reward.name === "Kinh nghiệm")?.quantity, 6000000000);
  assert.ok(tiers.every((tier) => tier.rewards.length > 0));
});

test("reward icons follow exact item template IDs and preserve grouped quantities", () => {
  const fixture = `
function tbtuiguangyuan:PhucLoiNapThe123()
 table.insert(tbOpt,{"Mốc50K", self.PhucLoi_50K, self});
end
function tbtuiguangyuan:PhucLoi_50K()
 if nCount_CheckNap >= 50 then
 me.AddExp(1000);
 me.AddStackItem(18,1,235,1,nil, 2); --Truyền Tống Phù
 me.AddItem(5,19,1,9); --Pet 9
 me.AddItem(5,20,1,9); --Pet 9
 me.AddItem(18,1,999,1); --Chưa có icon
 me.AddTitle(23,1,1,1); --Danh Hiệu
 end
end`;
  const icons = new Map([
    ["18,1,235,1", "/item-icons/teleport.png"],
    ["18,1,235,2", "/item-icons/wrong-level.png"],
    ["5,20,1,9", "/item-icons/pet.png"],
    ["23,1,1,1", "/item-icons/not-an-item.png"],
  ]);
  assert.deepEqual(parseMilestones(fixture, icons)[0].rewards, [
    { name: "Kinh nghiệm", quantity: 1000 },
    { name: "Truyền Tống Phù", quantity: 2, iconUrl: "/item-icons/teleport.png" },
    { name: "Pet 9", quantity: 2, iconUrl: "/item-icons/pet.png" },
    { name: "Chưa có icon", quantity: 1 },
    { name: "Danh Hiệu", quantity: 1 },
  ]);
});

test("approved catalog includes 93 material credits, the four set rights and exact titles", async () => {
  const source = await readFile("../gameserver/script/npc/tuiguangyuan.lua", "utf8");
  const tiers = parseMilestones(source);
  assert.equal(tiers.length, 29);
  const rewards = tiers.flatMap((tier) => tier.rewards);
  assert.equal(rewards.filter((reward) => reward.name === "Phiếu chọn 10.000 nguyên liệu khóa").reduce((n, reward) => n + reward.quantity, 0), 93);
  assert.equal(rewards.filter((reward) => reward.name === "Bí kíp đồng hành đặc biệt").reduce((n, reward) => n + reward.quantity, 0), 50);
  assert.ok(tiers.find((tier) => tier.amountK === 4000)?.rewards.some((reward) => reward.name === "Quyền nhận bộ Bạch Kim (5 món)"));
  assert.ok(tiers.find((tier) => tier.amountK === 5000)?.rewards.some((reward) => reward.name === "Quyền đổi bộ Bạch Kim +1 (thu đủ 5 món bộ cũ)"));
  assert.ok(tiers.find((tier) => tier.amountK === 7000)?.rewards.some((reward) => reward.name === "Quyền đổi bộ Vô Minh (thu đủ 5 món bộ cũ)"));
  assert.ok(tiers.find((tier) => tier.amountK === 10000)?.rewards.some((reward) => reward.name === "Quyền đổi bộ Vô Thần (thu đủ 5 món bộ cũ)"));
  assert.ok(tiers.find((tier) => tier.amountK === 50)?.rewards.some((reward) => reward.name === "Danh hiệu Nghệ Sĩ Biểu Diễn Lão Luyện và vòng sáng"));
  assert.ok(tiers.find((tier) => tier.amountK === 30000)?.rewards.some((reward) => reward.name === "Danh hiệu Kẻ Diệt Thần và vòng sáng"));
  assert.ok(tiers.find((tier) => tier.amountK === 29000)?.rewards.some((reward) => reward.name === "Danh hiệu Chung Mạt Giả và vòng sáng"));
  assert.ok(!tiers.filter((tier) => tier.amountK < 30000).flatMap((tier) => tier.rewards).some((reward) => reward.name.includes("Kẻ Diệt Thần")));
  assert.ok(rewards.every((reward) => !reward.name.includes("Ngọa Hổ") && !reward.name.includes("Trấn Thiên")));
});

test("all seventeen cultivation names appear once at the assigned top-up tiers", async () => {
  const [source, specText] = await Promise.all([
    readFile("../gameserver/script/npc/tuiguangyuan.lua", "utf8"),
    readFile("../../.diagnostics/cultivation-titles/titles.json", "utf8"),
  ]);
  const spec = JSON.parse(specText) as { name: string; amountK: number }[];
  const actual = parseMilestones(source).flatMap((tier) => tier.rewards
    .filter((reward) => reward.name.startsWith("Danh hiệu "))
    .map((reward) => ({ amountK: tier.amountK, name: reward.name, quantity: reward.quantity })));
  assert.deepEqual(actual, spec.map((title) => ({ amountK: title.amountK, name: `Danh hiệu ${title.name} và vòng sáng`, quantity: 1 })));
});

test("catalog shows base quantities when gameplay grants apply an active-title multiplier", () => {
  const source = `
function tbtuiguangyuan:PhucLoiNapThe123()
 table.insert(tbOpt,{"50K", self.PhucLoi_50K, self});
end
function tbtuiguangyuan:PhucLoi_50K()
 if nCount_CheckNap >= 50 then
 TitleRewardBonus:Grant(me,"AddExp",1000000000);
 TitleRewardBonus:Grant(me,"AddJbCoin",100000);
 end
end`;
  assert.deepEqual(parseMilestones(source), [{ amountK: 50, rewards: [
    { name: "Kinh nghiệm", quantity: 1000000000 },
    { name: "Đồng không khóa", quantity: 100000 },
  ] }]);
});
