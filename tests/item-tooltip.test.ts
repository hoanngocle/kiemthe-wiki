import assert from "node:assert/strict";
import { test } from "node:test";
import { groupItemVariants, parseItemTable, readItemCatalog, searchItems } from "../lib/item-wiki.ts";
import { toItemWikiEntry } from "../lib/item-tooltip.ts";

const header = "Name\tGenre\tDetailType\tParticularType\tLevel\tIcon\tIntro";

test("groups whitespace, case and gender name variants while retaining original name searches", () => {
  const items = parseItemTable(`${header}\nNam Bố Y\t2\t3\t1\t1\t\t\nNữ Bố Y\t2\t3\t2\t1\t\t\nBỐ  Y\t2\t3\t3\t1\t\t`, "001/equip/purple/armor.txt");
  const groups = groupItemVariants(items);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].ids.length, 3);
  assert.equal(searchItems(groups, { query: "nu bo y" }).total, 1);
});

test("searches numeric ID components, accepts copied Lua IDs, and excludes incidental numbers", () => {
  const items = groupItemVariants(parseItemTable(`${header}\nLinh Khí\t18\t1\t3071\t1\t\t\nNgọc Lộ Tửu\t18\t1\t3071\t2\t\t\nQuà\t18\t1\t13071\t1\t\tNhận 3071 điểm, 18 vật phẩm`, "001/other/scriptitem.txt"));
  for (const q of ["{18, 1, 3071, 1}", "(18;1;3071;1)", "18, 1, 3071,", "18 1 3071"]) {
    const result = searchItems(items, { query: q });
    assert.equal(result.total, q.includes(";1)") || q.startsWith("{") ? 1 : 2, q);
    assert.equal(result.items[0].name, "Linh Khí");
  }
  assert.deepEqual(searchItems(items, { query: "3071" }).items.map((item) => item.name), ["Linh Khí", "Ngọc Lộ Tửu"]);
  assert.equal(searchItems(items, { query: "18,1,307" }).total, 0);
});

test("ranks names above incidental description matches", () => {
  const items = parseItemTable(`${header}\nTúi quà\t18\t1\t10\t1\t\tNhận Long Kiếm\nLong Kiếm\t2\t1\t11\t1\t\t`, "001/other/scriptitem.txt");
  assert.equal(searchItems(items, { query: "long kiem" }).items[0].name, "Long Kiếm");
  assert.equal(searchItems(items, { query: "long kiem" }).total, 1, "name matches should not be buried in incidental descriptions");
});

test("merges shared item codes under different names without losing aliases and profiles", () => {
  const items = parseItemTable(`${header}\nMã bài (Táo Hồng)\t1\t12\t1\t1\t\tTên cũ\nMã bài (Táo Hồng Mã)\t1\t12\t1\t1\t\tTên mới\nMã bài (Táo Hồng Mã)\t1\t12\t13\t1\t\tMua tại Kỳ Trân Các`, "001/other/horse.txt");
  const groups = groupItemVariants(items);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].variants.length, 3);
  assert.equal(searchItems(groups, { query: "1,12,1,1" }).total, 1);
  assert.equal(searchItems(groups, { query: "tao hong ma" }).total, 1);
});

test("catalog preserves fixed and MagicLevel attributes for each original template", async () => {
  const { items } = await readItemCatalog("../gameserver/setting/item");
  const weapon = items.find((item) => item.id === "2,1,12084,10")!;
  assert.ok(weapon.variants[0].tooltip, "tooltip profile must survive parsing");
  const tooltip = weapon.variants[0].tooltip;
  assert.ok(tooltip.stats.some((stat) => stat.section === "Cơ bản" && stat.code === "addphysicsdamage_p" && stat.value === "30–120%"));
  assert.ok(tooltip.stats.some((stat) => stat.magicLevel === 16 && stat.value === "151–160%"));
  assert.ok(tooltip.stats.some((stat) => stat.unlock === 16));
  const medicine = items.find((item) => item.id === "17,1,1,1")!.variants[0].tooltip;
  assert.ok(medicine.stats.some((stat) => stat.code === "lifepotion_v" && stat.value.includes("100")));
  const horse = items.find((item) => item.id === "1,12,1,1")!.variants[0].tooltip;
  assert.ok(horse.stats.some((stat) => stat.code === "fastwalkrun_p" && stat.value === "30%"), "mount riding stats must be shown");
  const grouped = groupItemVariants(items);
  const group = searchItems(grouped, { query: "2,1,12084,10" }).items[0];
  assert.ok(group.variants.some((variant) => variant.id === "2,1,12084,10" && variant.tooltip.stats.some((stat) => stat.magicLevel === 16)));
});

test("API entries select the searched variant without merging its stats or shipping every profile", () => {
  const columns = `${header}\tMagicName1\tMagicLevel1`;
  const rows = parseItemTable(`${columns}\nKiếm\t2\t1\t1\t1\t\tBản đầu\tlifemax_v\t1\nKiếm\t2\t1\t2\t2\t\tBản sau\tlifemax_v\t2`, "001/equip/purple/meleeweapon.txt");
  const [item] = searchItems(groupItemVariants(rows), { query: "{2,1,2,2}" }).items;
  const entry = toItemWikiEntry(item);
  assert.equal(entry.id, "2,1,2,2");
  assert.equal(entry.tooltip.description, "Bản sau");
  assert.equal(entry.tooltip.stats[0].magicLevel, 2);
  assert.match(entry.tooltip.stats[0].value, /Chưa có khoảng giá trị/);
  assert.equal(entry.variants.length, 2);
  assert.ok(entry.variants.every((variant) => !("tooltip" in variant)));
  assert.equal(entry.selectedVariant, "001/equip/purple/meleeweapon.txt:3");
});
