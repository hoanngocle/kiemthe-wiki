import path from "node:path";
import { readItemCatalog } from "./item-wiki.ts";
import { loadWeaponWiki, weaponFamilies } from "./weapon-wiki.ts";
import { loadEquipmentWiki } from "./equipment-wiki.ts";
import { loadSpecialEquipment, specialEquipmentSlots } from "./special-equipment-wiki.ts";
import { loadItemAcquisition } from "./item-acquisition.ts";

export async function loadUnifiedItemCatalog(root: string) {
  const [catalog, weapons, equipment, specials] = await Promise.all([
    readItemCatalog(path.join(root, "setting/item")), loadWeaponWiki(root), loadEquipmentWiki(root),
    Promise.all(specialEquipmentSlots.map(async (slot) => ({ slot: slot.key, items: await loadSpecialEquipment(root, slot.key) }))),
  ]);
  const weaponById = new Map(weapons.weapons.map((item) => [item.id, item]));
  const equipmentById = new Map(equipment.items.map((item) => [item.id, item]));
  const specialById = new Map(specials.flatMap((group) => group.items.map((item) => [item.id, { ...item, slot: group.slot }] as const)));
  for (const item of catalog.items) for (const variant of item.variants) {
    const meta = variant.classification;
    const weapon = weaponById.get(variant.id);
    const gear = equipmentById.get(variant.id);
    const special = specialById.get(variant.id);
    if (meta.group === "vu-khi" && weapon) {
      meta.family = weapon.family; meta.familyName = weaponFamilies[weapon.family]; meta.requiredLevel = weapon.requiredLevel;
    } else if (meta.group === "trang-bi" && special) {
      meta.slot = special.slot; meta.slotName = specialEquipmentSlots.find((slot) => slot.key === special.slot)!.name;
      meta.family = special.group; meta.familyName = special.group; meta.requiredLevel = special.wearLevel;
    } else if (meta.group === "trang-bi" && gear) {
      const suiteId = meta.suiteId ?? gear.suiteId;
      meta.family = String(suiteId); meta.familyName = equipment.suites.get(suiteId) ?? gear.suite;
    }
  }
  const acquisition = await loadItemAcquisition(root, catalog.items, { weapons, equipment, specials });
  // Apply visibility before grouping and pagination so unknown weapon profiles
  // cannot remain as the representative of an otherwise verified name group.
  const items = catalog.items.filter((item) => {
    const variant = item.variants[0];
    if (variant.classification.group !== "vu-khi") return true;
    return (acquisition.get(variant.id) ?? []).some((route) => route.type !== "upgrade"
      && (!route.series || variant.tooltip.series === -1 || route.series === variant.tooltip.series));
  });
  return { ...catalog, items, acquisition };
}
