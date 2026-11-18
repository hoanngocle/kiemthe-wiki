import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { equipmentSlots, loadEquipmentWiki, selectEquipment } from "../lib/equipment-wiki.ts";

const wiki = loadEquipmentWiki(path.resolve("../gameserver"));

test("all nine positions have their own quầy and distinct level-110 and level-135 templates", async () => {
  const { items } = await wiki;
  for (const slot of equipmentSlots) {
    const helmets = items.filter((item) => item.slot === slot.key);
    assert.deepEqual(
      [...new Set(helmets.filter((item) => item.shops.some((shop) => shop.id === slot.shop)).map((item) => item.suiteId))].sort((a, b) => a - b),
      [6, 7, 8, 9, 10, 11],
    );
    assert.ok(helmets.some((item) => item.suiteId === 12 && item.level === 135 && item.shops.some((shop) => shop.id === 195)));
  }
  const helm = items.find((item) => item.id === "4,9,1056,10");
  assert.equal(helm?.level, 110);
  assert.equal(helm?.shops.find((shop) => shop.id === 213)?.reputation?.level, 5);
});

test("a refine row keeps the exact input, output, fee and plan from configuration", async () => {
  const { items } = await wiki;
  const item = items.find((item) => item.id === "4,10,5,10");
  const recipe = item?.refines.find((row) => row.fromId === "2,10,12,10");
  assert.equal(recipe?.planId, "18,2,1,1");
  assert.equal(recipe?.fee, 10000);
});

test("search supports exact IDs, accents, slot filters, and pagination", async () => {
  const { items } = await wiki;
  assert.deepEqual(selectEquipment(items, { slot: "mu", q: "4-9-1056-10" }).items.map((item) => item.id), ["4,9,1056,10"]);
  assert.equal(selectEquipment(items, { slot: "ao", q: "4-9-1056-10" }).total, 0);
  const result = selectEquipment(items, { slot: "lien", q: "sieu than", level: "135", page: "500" });
  assert.ok(result.items.every((item) => item.suiteId === 12 && item.slot === "lien"));
  assert.equal(result.total, 10);
  assert.equal(result.page, result.pages);
});

test("keeps the Siêu Thần shop's token price and six reputation requirements", async () => {
  const { items, sieuThanRequirements } = await wiki;
  const shop = items.find((item) => item.suiteId === 12)?.shops.find((entry) => entry.id === 195);
  assert.equal(shop?.price, 7);
  assert.match(shop?.currency ?? "", /Kim Nguyên Bảo Đại/);
  assert.deepEqual(sieuThanRequirements.map(({ level }) => level), [4, 4, 6, 10, 10, 10]);
});
