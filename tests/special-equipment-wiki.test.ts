import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { loadSpecialEquipment, selectSpecialEquipment } from "../lib/special-equipment-wiki.ts";

const root = path.resolve("../gameserver");

test("shows Phi Phong shop price, honor and term with the matching item", async () => {
  const items = await loadSpecialEquipment(root, "phi-phong");
  const item = items.find(({ id }) => id === "1,17,1,1")!;
  assert.equal(item.wearLevel, null);
  assert.ok(item.sources.some(({ where, costs, note }) =>
    where.includes("Tạ Hiền") && costs.includes("153") && note.includes("Vinh dự cấp 1") && note.includes("30 ngày")));
  assert.equal(item.upgrade, undefined);
});

test("follows the actual Mặt Nạ junction and filenames for the final rank", async () => {
  const items = await loadSpecialEquipment(root, "mat-na");
  const byId = new Map(items.map((item) => [item.id, item]));
  assert.equal(byId.get("1,13,178,4")?.rank, 0);
  assert.match(byId.get("1,13,178,4")!.sources[0].where, /Nhận thưởng Cấp độ/);
  assert.match(byId.get("1,13,188,4")!.sources[0].costs, /15\.000\.000 đồng/);
  assert.match(byId.get("1,13,217,4")!.upgrade!.costs, /80 KNB Đại/);
  assert.equal(byId.get("1,13,218,4")?.upgrade?.targetId, "1,13,220,4");
  assert.equal(byId.get("1,13,318,4")?.upgrade?.targetId, "1,13,319,4");
  assert.match(byId.get("1,13,319,4")!.name, /Bá Huynh Đệ/);
});

test("uses the horse map even when the next rank skips a number", async () => {
  const items = await loadSpecialEquipment(root, "ngua");
  const byId = new Map(items.map((item) => [item.id, item]));
  assert.equal(items.filter(({ sources }) => sources.some(({ where }) => where.includes("Nhận Thú Cưỡi VIP"))).length, 10);
  assert.equal(byId.get("1,12,374,4")!.sources[0].costs, "20 KNB Đại");
  assert.equal(byId.get("1,12,374,4")!.wearLevel, 100);
  assert.equal(byId.get("1,12,536,4")!.upgrade!.targetId, "1,12,537,4");
  assert.match(byId.get("1,12,536,4")!.upgrade!.costs, /86 KNB Đại/);
  assert.equal(byId.get("1,12,537,4")!.rank, 45);
  assert.equal(byId.get("1,12,433,4")!.rank, 60);
  assert.equal(items.filter(({ exchange }) => exchange).length, 26);
  assert.equal(selectSpecialEquipment(items, { q: "1-12-536-4", level: "100" }).total, 1);
  assert.ok(selectSpecialEquipment(items, { q: "thiet ma du long" }).total > 1);
});

test("lists the seal recipes at wear level 60 and a separate Quan Ấn shop", async () => {
  const items = await loadSpecialEquipment(root, "an");
  const byId = new Map(items.map((item) => [item.id, item]));
  assert.equal(byId.get("1,16,13,1")!.wearLevel, 60);
  assert.match(byId.get("1,16,13,1")!.upgrade!.note, /Bùa Bảo Toàn/);
  assert.equal(byId.get("1,16,22,1")!.upgrade!.targetId, "1,16,23,1");
  assert.equal(byId.get("1,16,22,1")!.upgrade!.costs, "1.000 KNB Đại");
  assert.match(byId.get("1,16,29,1")!.upgrade!.note, /50%/);
  assert.match(byId.get("1,18,16,1")!.sources[0].costs, /100 Chiến Thần/);
  assert.equal(selectSpecialEquipment(items, { page: "999" }).page, selectSpecialEquipment(items, {}).pages);
});

test("lists all seven Chân Nguyên templates and the six permanent chest choices", async () => {
  const items = await loadSpecialEquipment(root, "chan-nguyen");
  assert.equal(items.length, 7);
  assert.ok(items.every((item) => item.wearLevel === 100 && item.upgrade?.targetId === item.id));
  assert.equal(items.filter((item) => item.sources.some(({ costs }) => costs.includes("20 KNB Đại"))).length, 6);
  const baoNgoc = items.find(({ id }) => id === "1,24,2,1")!;
  assert.match(baoNgoc.sources[0].costs, /18,1,3098,2/);
  assert.match(baoNgoc.upgrade!.costs, /18,1,1333,1.*18,1,402,1/);
  assert.match(baoNgoc.alternativeUpgrade!.note, /1\.000\.000 điểm/);
});

test("lists all five Thánh Linh templates and both in-place training methods", async () => {
  const items = await loadSpecialEquipment(root, "thanh-linh");
  assert.equal(items.length, 5);
  assert.ok(items.every((item) => item.wearLevel === 120 && item.upgrade?.targetId === item.id));
  const water = items.find(({ id }) => id === "1,27,3,1")!;
  assert.match(water.name, /Thủy Tức Hàn Long/);
  assert.match(water.sources[0].where, /Quan Phi Phi.*Thủy/);
  assert.match(water.upgrade!.costs, /10\.000 Linh Hồn/);
  assert.match(water.alternativeUpgrade!.costs, /18,1,3119,5/);
});

test("keeps Pháp Bảo upgrades within 24 branches and models the +20 exchange", async () => {
  const items = await loadSpecialEquipment(root, "phap-bao");
  assert.equal(items.length, 480);
  assert.ok(items.every((item) => item.wearLevel === 130));
  assert.equal(new Set(items.map(({ group }) => group)).size, 24);
  assert.equal(items.filter((item) => item.rank === 1 && item.sources.length).length, 24);
  assert.equal(items.filter((item) => item.rank === 20 && item.exchange && !item.upgrade).length, 24);
  const byId = new Map(items.map((item) => [item.id, item]));
  assert.match(byId.get("1,15,401,7")!.sources[0].note, /menu.*Kiếm Nhẫn/);
  assert.equal(byId.get("1,15,401,7")!.wearNote, "Môn phái: Thiên Nhẫn");
  assert.equal(byId.get("1,15,419,7")!.upgrade!.targetId, "1,15,420,7");
  assert.match(byId.get("1,15,419,7")!.upgrade!.costs, /20 KNB Đại.*1 Bùa Bảo Toàn.*1\.000 Mảnh Pháo Bảo/);
  assert.equal(byId.get("1,15,420,7")!.exchange?.costs, "2 KNB Đại");
  assert.equal(selectSpecialEquipment(items, { q: "kiem nhan" }).total, 20);
});

test("lists every companion piece and maps only the verified five-piece set upgrades", async () => {
  const items = await loadSpecialEquipment(root, "dong-hanh");
  const byId = new Map(items.map((item) => [item.id, item]));
  assert.equal(items.length, 95);
  assert.ok(items.every((item) => item.wearLevel === 100));
  assert.equal(new Set(items.map(({ group }) => group)).size, 5);
  assert.equal(items.filter(({ upgrade }) => upgrade).length, 25);
  assert.equal(byId.get("5,19,1,3")!.sources[0].costs, "500 Thẻ Tích Lũy Sự Kiện");
  assert.ok(byId.get("5,19,1,6")!.sources.some(({ where, costs }) => where.includes("Bảo Ngọc") && costs.includes("18,1,3103,1")));
  assert.equal(byId.get("5,19,1,6")!.upgrade!.targetId, "5,19,1,7");
  assert.match(byId.get("5,19,1,9")!.upgrade!.costs, /1\.500\.000 Đồng thường/);
  assert.equal(byId.get("5,19,1,9")!.upgrade!.targetId, "5,19,11,10");
  assert.equal(byId.get("5,19,11,10")!.upgrade!.targetId, "5,19,12,10");
  assert.match(byId.get("5,19,12,10")!.name, /Vô Thần Chi Nhẫn/);
  assert.equal(byId.get("5,19,1,10")?.upgrade, undefined);
  assert.match(byId.get("5,19,1,10")!.sources[0].costs, /18,1,3106,1/);
  assert.equal(selectSpecialEquipment(items, { group: "Hộ Uyển" }).total, 19);
});

test("lists Ngoại Trang Áo with its wear level, exact shop currency and in-place refinement", async () => {
  const items = await loadSpecialEquipment(root, "ngoai-trang-ao");
  assert.equal(items.length, 146);
  assert.ok(items.every(({ wearLevel, upgrade, id }) => wearLevel === 1 && upgrade?.targetId === id));
  assert.equal(items.filter(({ sources }) => sources.some(({ where }) => where.includes("Shop 206"))).length, 72);
  const lamHai = items.find(({ id }) => id === "1,25,100,2")!;
  assert.equal(lamHai.wearNote, "Giới tính: Nam");
  assert.ok(lamHai.sources.some(({ where, costs }) => where.includes("Shop 206") && costs === "1 Nguyệt Ảnh Thạch"));
  assert.ok(lamHai.sources.some(({ costs }) => costs.includes("18,1,3118,1")));
  assert.match(lamHai.alternativeUpgrade!.costs, /18,1,3119,6/);
  const haAnh = items.find(({ id }) => id === "1,25,110,2")!;
  assert.ok(haAnh.sources.some(({ costs }) => costs.includes("18,1,3097,2")));
  assert.ok(haAnh.sources.every(({ costs }) => !costs.includes("18,1,3118,1")));
});

test("distinguishes Ngoại Trang Nón with and without a refinement class", async () => {
  const items = await loadSpecialEquipment(root, "ngoai-trang-non");
  assert.equal(items.length, 150);
  assert.equal(items.filter(({ upgrade }) => !upgrade).length, 43);
  assert.equal(items.filter(({ sources }) => sources.some(({ where }) => where.includes("Shop 207"))).length, 81);
  const cosmetic = items.find(({ id }) => id === "1,26,38,1")!;
  const refinable = items.find(({ id }) => id === "1,26,42,2")!;
  assert.equal(cosmetic.wearLevel, 1);
  assert.equal(cosmetic.upgrade, undefined);
  assert.equal(refinable.upgrade!.targetId, refinable.id);
  assert.equal(selectSpecialEquipment(items, { q: "1-26-37-2" }).total, 1);
});
