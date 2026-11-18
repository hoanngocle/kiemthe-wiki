import assert from "node:assert/strict";
import { test } from "node:test";
import { parseItemTable, groupItemVariants, searchItems } from "../lib/item-wiki.ts";
import { filterItemCatalog, itemFacets } from "../lib/item-classification.ts";
import { loadUnifiedItemCatalog } from "../lib/item-catalog.ts";

const columns = "Name\tGenre\tDetailType\tParticularType\tLevel\tIcon\tSeries\tQualityPrefix\tReqProp1Type\tReqProp1Value";
const parse = (rows: string[], source: string) => parseItemTable([columns, ...rows].join("\n"), source);

test("classifies weapons, ordinary equipment and companion weapons into the proper groups", () => {
  const [weapon] = parse(["Kiếm\t2\t1\t1\t10\t\t1\t4\t5\t130"], "001/equip/purple/meleeweapon.txt");
  const [armor] = parse(["Áo\t4\t3\t1\t10\t\t2\t\t5\t110"], "001/equip/greenequip.txt");
  const [partner] = parse(["Chi Nhẫn\t5\t1\t1\t10\t\t0\t\t5\t100"], "001/partnerequip/partnerweapon.txt");
  assert.deepEqual([weapon.variants[0].classification.group, armor.variants[0].classification.group, partner.variants[0].classification.group], ["vu-khi", "trang-bi", "trang-bi"]);
  assert.equal(weapon.variants[0].classification.requiredLevel, 130);
  assert.equal(armor.variants[0].classification.slot, "ao");
  assert.equal(partner.variants[0].classification.slot, "dong-hanh");
});

test("merged catalog retains weapon families and special equipment upgrade routes", async () => {
  const catalog = await loadUnifiedItemCatalog("../gameserver");
  const weapon = catalog.items.find((item) => item.id === "2,1,12084,10")!;
  assert.ok(weapon, "a weapon with a confirmed chest source stays visible");
  assert.ok(catalog.items.some((item) => item.id === "2,1,1215,10"), "a weapon sold by an NPC stays visible");
  assert.ok(!catalog.items.some((item) => item.id === "2,1,12044,10"), "upgrade-only weapons without an acquisition route are hidden");
  assert.ok(!catalog.items.some((item) => item.id === "2,1,1700,10"), "weapons without a confirmed acquisition route are hidden");
  assert.equal(weapon.variants[0].classification.family, "hao-thien");
  const mask = catalog.items.find((item) => item.id === "1,13,218,4")!;
  assert.equal(mask.variants[0].classification.slot, "mat-na");
  assert.ok(catalog.acquisition.get("1,13,218,4")?.some((route) => route.type === "upgrade" && route.targetId));
  assert.ok(catalog.acquisition.get("1,24,2,1")?.some((route) => route.type === "upgrade" && route.cost?.includes("18,1,1333,1")));
  assert.ok(catalog.acquisition.get("2,1,12084,10")?.some((route) => route.type === "upgrade" && route.targetId === "18,1,1452,1"));
  assert.ok(catalog.acquisition.get("2,10,12,10")?.some((route) => route.type === "upgrade" && route.targetId === "4,10,5,10"));
  const armorVariants = catalog.items.filter((item) => item.id === "4,3,1800,10");
  assert.equal(armorVariants.find((item) => item.source === "001/equip/1greenequip.txt")!.variants[0].classification.family, "9");
  assert.equal(armorVariants.find((item) => item.source === "001/equip/greenequip.txt")!.variants[0].classification.family, "12");
  assert.ok(itemFacets(groupItemVariants(catalog.items), { group: "trang-bi", family: "12" }).qualities.includes("Phẩm chất 8"));
  const grouped = groupItemVariants(catalog.items);
  const filtered = filterItemCatalog(grouped, { group: "vu-khi", family: "hao-thien", level: "130" });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((item) => item.variants.every((variant) => variant.classification.family === "hao-thien")));
});

test("filters intersect on the same variant and preserve exact ID search", () => {
  const grouped = groupItemVariants(parse([
    "Kiếm\t2\t1\t1\t10\t\t1\t4\t5\t110",
    "Kiếm\t2\t1\t2\t11\t\t2\t5\t5\t130",
    "Kiếm\t2\t1\t3\t12\t\t-1\t4\t5\t110",
  ], "001/equip/purple/meleeweapon.txt"));
  assert.equal(filterItemCatalog(grouped, { series: "1", level: "130" }).length, 0);
  const filtered = filterItemCatalog(grouped, { group: "vu-khi", series: "2", level: "130", quality: "Cam" });
  assert.equal(filtered.length, 1);
  assert.deepEqual(filtered[0].ids, ["2,1,2,11"]);
  assert.equal(searchItems(filtered, { query: "2,1,1,10" }).total, 0);
  assert.equal(searchItems(filtered, { query: "2,1,2,11" }).items[0].id, "2,1,2,11");
  assert.equal(filterItemCatalog(grouped, { series: "5", level: "110" })[0].variants[0].id, "2,1,3,12");
  assert.equal(grouped[0].variants.length, 3, "filtering must not mutate cached groups");
});

test("facets count grouped items once and narrow slots/families by the selected group", () => {
  const groups = groupItemVariants([
    ...parse(["Kiếm\t2\t1\t1\t10\t\t1\t4\t5\t130", "Kiếm\t2\t1\t2\t10\t\t2\t4\t5\t130"], "001/equip/purple/meleeweapon.txt"),
    ...parse(["Áo\t4\t3\t1\t10\t\t2\t\t5\t110"], "001/equip/greenequip.txt"),
  ]);
  const facets = itemFacets(groups, { group: "vu-khi" });
  assert.equal(facets.groups.find((group) => group.value === "vu-khi")?.count, 1);
  assert.deepEqual(facets.levels, [130]);
  assert.ok(facets.slots.every((slot) => slot.value !== "ao"));
});
