import assert from "node:assert/strict";
import test from "node:test";
import { recipeParts, conciseChance, conciseResult } from "../lib/upgrade-recipe-display.ts";

const items = [
  { id: "18,1,1338,1", name: "Kim Nguyên Bảo Đại", iconUrl: "/knb.png" },
  { id: "18,1,3028,3", name: "Linh Tê Ngọc", iconUrl: "/ngoc.png" },
  { id: "18,1,1338,2", name: "Kim Nguyên Bảo", iconUrl: "/knb-small.png" },
];

test("keeps quantities, aliases, template identity and symbolic costs", () => {
  const parts = recipeParts("2c KNB Đại (18,1,1338,1) + 1.000 × Linh Tê Ngọc (18,1,3028,3) + 10 Kim Nguyên Bảo", items);
  assert.deepEqual(parts.filter((part) => "item" in part).map((part) => [part.item.id, part.quantity]), [
    ["18,1,1338,1", "2c"], ["18,1,3028,3", "1.000"], ["18,1,1338,2", "10"],
  ]);
});

test("hides item IDs while preserving conditions and unknown item names", () => {
  const input = "Đeo (1,13,p,4); 20000 Mảnh (18,1,9999,1); cần 3 ô trống.";
  assert.deepEqual(recipeParts(input, items), [{ text: "Đeo; 20000 Mảnh; cần 3 ô trống." }]);
});

test("identifies item names without quantities and hides their IDs", () => {
  const pearl = { id: "18,1,16,1", name: "Tu Luyện Châu", iconUrl: null };
  assert.deepEqual(recipeParts("Mở Tu Luyện Châu (18,1,16,1) → Tụ Linh Thánh Linh.", [...items, pearl]), [
    { text: "Mở " }, { item: pearl, quantity: "" }, { text: " → Tụ Linh Thánh Linh." },
  ]);
  assert.deepEqual(recipeParts("Dùng Linh Tê Ngọc.", items), [
    { text: "Dùng " }, { item: items[1], quantity: "" }, { text: "." },
  ]);
});

test("hides template ranges without removing task keys or numeric requirements", () => {
  assert.deepEqual(recipeParts("1 vũ khí (2,1,1700..2109,10); task (7872,1) = 2; cấp 130.", items), [
    { text: "1 vũ khí; task (7872,1) = 2; cấp 130." },
  ]);
});

test("does not confuse KNB Đại with regular currency or alter conditional rates", () => {
  const part = recipeParts("500 × KNB Đại", items)[0];
  assert.ok("item" in part && part.item.id === "18,1,1338,1");
  assert.equal(conciseChance("100% — không roll"), "100%");
  assert.equal(conciseChance("Có Bùa100% lên cấp; không Bùa0% lên cấp"), "Có Bùa100% lên cấp; không Bùa0% lên cấp");
  assert.equal(conciseResult("Thành công: skill 1959 cấp 2, task (7872,1) = 2; thất bại giữ cấp hiện tại", "Kinh Mạch"), "Kinh Mạch cấp 2; thất bại giữ cấp hiện tại.");
});

test("does not consume preceding level conditions as an item quantity", () => {
  const source = "Với c là cấp hiện tại, c<60: 2c KNB Đại (18,1,1338,1) + c Linh Tê Ngọc (18,1,3028,3)";
  const parts = recipeParts(source, items);
  assert.deepEqual(parts.filter((part) => "item" in part).map((part) => part.quantity), ["2c", "c"]);
  const skill = recipeParts("Kỹ năng 1536 cấp c=1..9: tiêu hao đúng 100 Kim Nguyên Bảo Đại và 1000 Linh Tê Ngọc (18,1,3028,3)", items);
  assert.deepEqual(skill.filter((part) => "item" in part).map((part) => part.quantity), ["100", "1.000"]);
});

test("keeps equipment grade numbers separate from the quantity", () => {
  const equipment = [{ id: "1,14,35,4", name: "Già Lam Kinh +10", iconUrl: "/book.png" }];
  const parts = recipeParts("1 Già Lam Kinh+10 (1,14,35,4)", equipment);
  assert.ok("item" in parts[0] && parts[0].quantity === "1");
  const variable = recipeParts("Phí1000 c Linh Tê Ngọc (18,1,3028,3)", items);
  assert.deepEqual(variable.filter((part) => "item" in part).map((part) => part.quantity), ["1000c"]);
});
