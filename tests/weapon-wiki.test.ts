import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { loadWeaponWiki, searchWeapons } from "../lib/weapon-wiki.ts";

const wiki = loadWeaponWiki(path.resolve("../gameserver"));

test("reads the current weapon catalogue and joins the Qinling shop and refining inputs", async () => {
  const { weapons } = await wiki;
  assert.equal(new Set(weapons.map((item) => item.id)).size, weapons.length);
  const item = (id: string) => weapons.find((weapon) => weapon.id === id);
  assert.equal(item("2,2,149,10")?.inputs[0]?.id, "2,2,105,10");
  assert.equal(item("2,1,1215,10")?.reputation, 2);
  assert.equal(item("2,1,1285,10")?.reputation, 3);
  assert.equal(item("2,1,1700,10")?.shopPrice, 1000);
  assert.equal(item("2,1,1751,10")?.chest, "he-chinh");
  assert.equal(item("2,1,1711,10")?.chest, "song-tu");
  assert.equal(item("2,1,1701,10")?.chest, undefined);
  assert.equal(item("2,1,12084,10")?.requiredLevel, 130);
  assert.equal(item("2,1,12084,10")?.equipLevel, 10);
  assert.equal(item("2,1,1600,10"), undefined);
  assert.equal(item("2,1,12210,10"), undefined);
});

test("reads the exact upgrade costs, ingredient placement and reward chest from live Lua", async () => {
  const { recipes } = await wiki;
  assert.deepEqual(recipes.map(({ costs }) => costs.map(({ count }) => count)), [
    [100, 50], [100, 100], [1000, 300], [2000, 200], [3000, 300], [4000, 400], [10],
  ]);
  assert.equal(recipes[0].materialsInGift, false);
  assert.equal(recipes[1].materialsInGift, true);
  assert.equal(recipes[5].outputId, "18,1,1453,4");
});

test("filters by accent-insensitive name, exact ID, level, and element with bounded pagination", async () => {
  const { weapons } = await wiki;
  const result = searchWeapons(weapons, { q: "man thien hoa vu", level: "130", series: "1" });
  assert.ok(result.items.some((item) => item.id === "2,1,12084,10"));
  assert.ok(result.items.every(({ requiredLevel, series }) => requiredLevel === 130 && series === 1));
  assert.deepEqual(searchWeapons(weapons, { q: "2-1-12084-10" }).items.map(({ id }) => id), ["2,1,12084,10"]);
  const last = searchWeapons(weapons, { family: "tu-khong-9", page: "999" });
  assert.equal(last.page, last.pages);
  assert.ok(last.items.length > 0);
  assert.equal(searchWeapons(weapons, { q: "123123123123" }).total, 0);
});
