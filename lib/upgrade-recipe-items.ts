import path from "node:path";
import { readFile } from "node:fs/promises";
import { cache } from "react";
import { readItemCatalog } from "./item-wiki";
import { upgradeMenus } from "./upgrade-wiki";
import type { RecipeItem, ItemRarity } from "./upgrade-recipe-display";

function tableRows(text: string) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const columns = header.replace(/^\uFEFF/, "").split("\t");
  return lines.map((line) => Object.fromEntries(line.split("\t").map((cell, index) => [columns[index], cell.trim()])));
}

export const readUpgradeRecipeItems = cache(async (): Promise<RecipeItem[]> => {
  const catalog = await readItemCatalog(path.resolve(process.cwd(), "../gameserver/setting/item"));
  const valueRoot = path.resolve(process.cwd(), "../gameserver/setting/item/001/extern/value");
  const [manifestText, colorsText, valuesText] = await Promise.all([
    readFile(path.resolve(process.cwd(), "public/item-icons/manifest.json"), "utf8"),
    readFile(path.join(valueRoot, "equip_starlevel_represent.txt"), "utf8"),
    readFile(path.join(valueRoot, "equip_starlevel_value.txt"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestText) as { icons: Record<string, string> };
  const colors = new Map(tableRows(colorsText).map((row) => [Number(row.STAR_LEVEL), row.NAME_COLOR]));
  const thresholds = tableRows(valuesText).sort((a, b) => Number(b.STAR_LEVEL) - Number(a.STAR_LEVEL));
  const colorRarities: Record<string, ItemRarity> = { white: "common", green: "green", blue: "blue", purple: "purple", orange: "orange", yellow: "gold", gold: "gold", pink: "pink", red: "red" };
  const text = JSON.stringify(upgradeMenus);
  const items = new Map<string, RecipeItem>();
  for (const item of catalog.items) {
    if (!text.includes(item.id) && !(item.name.length > 3 && text.includes(item.name))) continue;
    const iconUrl = manifest.icons[item.icon] ?? null;
    const [genre, detail, , level] = item.id.split(",").map(Number);
    // Fixed equipment classes use CalcStarLevelInfo with the template's ItemValue.
    const star = genre >= 1 && genre <= 5 ? thresholds.find((row) => Number(row.EQUIP_DETAIL_TYPE) === detail
      && row[`EQUIP_LEVEL_${level}`] !== undefined && Number(row[`EQUIP_LEVEL_${level}`]) >= 0
      && (item.baseValue ?? 0) >= Number(row[`EQUIP_LEVEL_${level}`])) : undefined;
    const rarity: ItemRarity = colorRarities[item.nameColor ?? ""]
      ?? ({ "Trắng": "common", "Lục": "green", "Xanh": "blue", "Tím": "purple", "Cam": "orange" } as Record<string, ItemRarity>)[item.qualities[0]]
      ?? colorRarities[star ? colors.get(Number(star.STAR_LEVEL)) ?? "" : ""]
      ?? (item.category === "Trang bị vàng" ? "gold" : "common");
    if (!items.has(item.id) || iconUrl) items.set(item.id, { id: item.id, name: item.name, iconUrl, rarity });
  }
  return [...items.values()];
});
