import assert from "node:assert/strict";
import { test } from "node:test";
import { readItemCatalog } from "../lib/item-wiki.ts";
import { toItemWikiEntry } from "../lib/item-tooltip.ts";
import { loadItemAcquisition } from "../lib/item-acquisition.ts";

test("wiki entries carry acquisition separately from tooltip statistics", async () => {
  const { items } = await readItemCatalog("../gameserver/setting/item");
  const item = items.find((item) => item.id === "2,1,12084,10")!;
  const entry = toItemWikiEntry(item);
  assert.ok(Array.isArray(entry.acquisition), "API must include an acquisition field");
});

test("acquisition resolves weapon chest crafting to the actual NPC maps and costs", async () => {
  const { items } = await readItemCatalog("../gameserver/setting/item");
  const index = await loadItemAcquisition("../gameserver", items);
  const routes = index.get("2,1,12084,10") ?? [];
  const craft = routes.find((route) => route.npc === "Quan Ưng Phi" && route.method.includes("Hạo Thiên"));
  assert.ok(craft);
  assert.ok(craft.maps.includes("Giang Tân Thôn"));
  assert.ok(craft.maps.includes("Phượng Tường Phủ"));
  assert.match(craft.cost ?? "", /100 Kim Nguyên Bảo Đại.*50 Bát Quái Lệnh/);
  assert.ok(index.get("18,1,3071,1")?.some((route) => route.method.includes("Túi Nguyên Liệu Nâng Cấp")));
  for (const id of ["2,1,12044,10", "2,1,11879,10"]) {
    assert.ok(!(index.get(id) ?? []).some((route) => route.type !== "upgrade" && route.method.includes("Rương Vũ Khí Hạo Thiên")), `chest does not offer template ${id}`);
  }
});

test("acquisition keeps shop reputation and all six Siêu Thần prerequisites", async () => {
  const { items } = await readItemCatalog("../gameserver/setting/item");
  const index = await loadItemAcquisition("../gameserver", items);
  const all = [...index.values()].flat();
  const vip = all.find((route) => route.npc === "Quan Phi Phi" && route.method.includes("Siêu Thần"));
  assert.ok(vip);
  assert.equal(vip.requirements.filter((text) => text.startsWith("Danh vọng")).length, 6);
  assert.ok(vip.maps.includes("Giang Tân Thôn"));
  assert.ok(all.some((route) => route.requirements.some((text) => /Phát Khâu Môn.*cấp 3/.test(text))));
});
