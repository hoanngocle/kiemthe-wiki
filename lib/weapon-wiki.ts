import { readFile } from "node:fs/promises";
import path from "node:path";
import { cleanItemText } from "./item-wiki.ts";
import { parseShopTable } from "./shop-wiki.ts";
import { readTemplateStats } from "./weapon-stats.ts";

export const weaponFamilies = {
  thuong: "Vũ khí thường",
  tim: "Vũ khí phẩm tím",
  "thanh-dong": "Tần Lăng Thanh Đồng",
  "bach-kim": "Tần Lăng 2 · Bạch Kim",
  "hoang-kim": "Tần Lăng 3 · Hoàng Kim",
  "than-sa": "Thần Sa",
  "hao-thien": "Hạo Thiên",
  "tu-duong": "Tử Dương",
  "tu-khong-7": "Tử Không 7 dòng",
  "tu-khong-8": "Tử Không 8 dòng",
  "tu-khong-9": "Tử Không 9 dòng",
  "tu-khong-10": "Tử Không 10 dòng",
} as const;

type WeaponFamily = keyof typeof weaponFamilies;
type Row = Record<string, string>;
type RefineInput = { id: string; name: string; fee: number };

export type Weapon = {
  id: string;
  name: string;
  kind: string;
  family: WeaponFamily;
  equipLevel: number;
  requiredLevel: number | null;
  series: number;
  lines?: number;
  reputation?: number;
  shopPrice?: number;
  chest?: "tuy-chon" | "he-chinh" | "song-tu";
  inputs: RefineInput[];
};

const weaponTables = [
  "general/meleeweapon", "general/rangeweapon", "purple/meleeweapon", "purple/rangeweapon",
];
const thanSaChests = [
  { line: 0, kind: "tuy-chon", suffix: "" },
  ...[1, 2, 3, 4].flatMap((line) => [
    { line, kind: "song-tu", suffix: "ST" } as const,
    { line, kind: "he-chinh", suffix: "" } as const,
  ]),
] as const;
const recipeSteps = [
  ["haothien", "Thần Sa 0–4 dòng", "Hạo Thiên 5 dòng", "Ghép Vũ Khí Hạo Thiên"],
  ["tuduong", "Hạo Thiên 5 dòng", "Tử Dương 6 dòng", "Ghép Rương Vũ Khí Tử Dương"],
  ["tukhongx", "Tử Dương 6 dòng", "Tử Không 7 dòng", "Ghép Rương Vũ Khí Tử Không"],
  ["tukhong8dong", "Tử Không 7 dòng", "Tử Không 8 dòng", "Ghép Rương Vũ Khí Tử Không 8 Dòng"],
  ["tukhong9dong", "Tử Không 8 dòng", "Tử Không 9 dòng", "Ghép Rương Vũ Khí Tử Không 9 Dòng"],
  ["tukhong10dong", "Tử Không 9 dòng", "Tử Không 10 dòng", "Ghép Rương Vũ Khí Tử Không 10 Dòng"],
  ["doivukhihao", "Hạo Thiên 5 dòng", "Hạo Thiên 5 dòng", "Ghép Rương Vũ Khí Hạo Thiên"],
] as const;

export const weaponElements: Record<number, string> = {
  1: "Kim", 2: "Mộc", 3: "Thủy", 4: "Hỏa", 5: "Thổ",
};

function templateId(row: Row) {
  return [row.Genre, row.DetailType, row.ParticularType, row.Level].join(",");
}

function refineId(row: Row, key: "Equip" | "Produce") {
  return ["Genre", "Detail", "Parti", "Level"].map((field) => row[key + field]).join(",");
}

function requiredLevel(row: Row) {
  for (let index = 1; index <= 6; index++) {
    if (row[`ReqProp${index}Type`] === "5") return Number(row[`ReqProp${index}Value`]);
  }
  return null;
}

export async function loadWeaponStats(root: string, id: string) {
  const parts = /^(\d{1,3})[,-](\d{1,3})[,-](\d{1,8})[,-](\d{1,3})$/.exec(id);
  if (!parts) return null;
  const canonical = parts.slice(1).map(Number).join(",");
  const read = (file: string) => readFile(path.join(root, "setting/item/001", file), "utf8");
  const [tables, magic] = await Promise.all([
    Promise.all(weaponTables.map((file) => read(`equip/${file}.txt`))),
    read("magic/magicattrib.txt"),
  ]);
  for (const table of tables) {
    const row = parseShopTable(table).find((candidate) => candidate.Name && templateId(candidate) === canonical);
    if (row) return {
      id: canonical,
      name: cleanItemText(row.Name),
      kind: cleanItemText(row.Kind),
      series: Number(row.Series),
      requiredLevel: requiredLevel(row),
      equipLevel: Number(row.Level),
      ...readTemplateStats(row, parseShopTable(magic)),
    };
  }
  return null;
}

function classify(part: number, level: number | null, reputation: number | undefined, refined: boolean, source: string): WeaponFamily {
  if (level === 130) {
    if (part >= 1700 && part <= 2109) return "than-sa";
    if (part >= 11704 && part <= 12109) return "hao-thien";
    if (part >= 12110 && part <= 12191) return "tu-duong";
    if (part >= 3561 && part <= 3884) return (["tu-khong-7", "tu-khong-8", "tu-khong-9", "tu-khong-10"] as const)[Math.floor((part - 3561) / 81)];
  }
  if (reputation === 2) return "bach-kim";
  if (reputation === 3) return "hoang-kim";
  if (refined) return "thanh-dong";
  return source.startsWith("general/") ? "thuong" : "tim";
}

function readRecipe(step: typeof recipeSteps[number], script: string) {
  const [id, input, output, menu] = step;
  const recipe = script.match(/^local recipe = (.*)$/m)?.[1] ?? "";
  const weapon = recipe.match(/weapon=\{(\d+),(\d+),(\d+),(\d+),(\d+)\}/);
  const reward = recipe.match(/output=\{([\d,]+)\}/);
  const placement = recipe.match(/inGift=(true|false)/);
  const costs = [...recipe.matchAll(/id=\{([\d,]+)\},count=(\d+)/g)]
    .map((match) => ({ id: match[1], count: Number(match[2]) }));
  if (!weapon || !reward || !placement || !costs.length) {
    throw new Error(`Không đọc được công thức vũ khí ${id}`);
  }
  return { id, input, output, menu, minId: Number(weapon[3]), maxId: Number(weapon[4]),
    outputId: reward[1], costs, materialsInGift: placement[1] === "true" };
}

export async function loadWeaponWiki(root: string) {
  const read = (file: string) => readFile(path.join(root, file), "utf8");
  const [tables, shopText, goodsText, refineText, scripts, chestScripts] = await Promise.all([
    Promise.all(weaponTables.map((file) => read(`setting/item/001/equip/${file}.txt`))),
    read("setting/shop/buysell.txt"),
    read("setting/shop/goods.txt"),
    read("setting/item/001/extern/refine/refine.txt"),
    Promise.all(recipeSteps.map(([file]) => read(`script/tranphai/haothien/${file}.lua`))),
    Promise.all(thanSaChests.map(({ line, suffix }) =>
      read(`script/tinhtinhtang/NangCapVuKhiThanSa/RuongVuKhiThanSa${line}Dong${suffix}.lua`))),
  ]);
  const recipes = recipeSteps.map((step, index) => readRecipe(step, scripts[index]));
  const chestSources = new Map<string, Weapon["chest"]>();
  chestScripts.forEach((script, index) => {
    const active = script.replace(/--\[\[[\s\S]*?\]\]/g, "").replace(/--[^\r\n]*/g, "");
    for (const match of active.matchAll(/\b2\s*,\s*1\s*,\s*(\d+)\s*,\s*10\b/g)) {
      chestSources.set(`2,1,${match[1]},10`, thanSaChests[index].kind);
    }
  });
  const templates = new Map<string, { row: Row; source: string }>();
  tables.forEach((table, index) => {
    for (const row of parseShopTable(table)) {
      const id = templateId(row);
      if (row.Name && /^\d+,\d+,\d+,\d+$/.test(id)) templates.set(id, { row, source: weaponTables[index] });
    }
  });
  const inputs = new Map<string, RefineInput[]>();
  for (const row of parseShopTable(refineText)) {
    if (row.RefineId !== "13") continue;
    const input = refineId(row, "Equip");
    const output = refineId(row, "Produce");
    const source = templates.get(input)?.row;
    if (!source || !templates.has(output)) continue;
    if (!inputs.has(output)) inputs.set(output, []);
    inputs.get(output)!.push({ id: input, name: cleanItemText(source.Name), fee: Number(row.Fee) });
  }

  const goods = new Map(parseShopTable(goodsText).map((row) => [row.Id, row]));
  const qinlingGoods = new Map<string, Row>();
  const thanSaGoods = new Map<string, Row>();
  for (const row of parseShopTable(shopText)) {
    const shop = Number(row.ShopId);
    const target = shop === 208 ? thanSaGoods : (shop >= 156 && shop <= 160 ? qinlingGoods : undefined);
    if (!target) continue;
    for (const [column, goodsId] of Object.entries(row)) {
      const product = /^Item\d+$/.test(column) ? goods.get(goodsId) : undefined;
      if (product) target.set(templateId(product), product);
    }
  }

  const weapons: Weapon[] = [];
  for (const [id, { row, source }] of templates) {
    const part = Number(row.ParticularType);
    const level = requiredLevel(row);
    const vendor = qinlingGoods.get(id) ?? thanSaGoods.get(id);
    const reputation = vendor ? Number(vendor.ReputeLevel) : undefined;
    const family = classify(part, level, qinlingGoods.has(id) ? reputation : undefined, inputs.has(id), source);
    weapons.push({
      id, name: cleanItemText(row.Name), kind: cleanItemText(row.Kind),
      family, equipLevel: Number(row.Level), requiredLevel: level, series: Number(row.Series),
      lines: family === "than-sa" ? (part - 1700) % 5 : undefined,
      reputation, shopPrice: vendor ? Number(thanSaGoods.has(id) ? vendor.goodsprice : row.Price) : undefined,
      chest: family === "than-sa" ? chestSources.get(id) : undefined,
      inputs: inputs.get(id) ?? [],
    });
  }
  weapons.sort((a, b) => (b.requiredLevel ?? 0) - (a.requiredLevel ?? 0) || a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id));
  return { weapons, recipes, refineCount: [...inputs.values()].reduce((total, items) => total + items.length, 0) };
}

type Search = { q?: string; level?: string; series?: string; family?: string; page?: string };

function normalize(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d");
}

export function searchWeapons(weapons: Weapon[], filters: Search = {}) {
  const query = filters.q?.trim().slice(0, 150) ?? "";
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const exactId = /^(\d+)\s*[,-]\s*(\d+)\s*[,-]\s*(\d+)\s*[,-]\s*(\d+)$/.exec(query);
  const matches = weapons.filter((item) => {
    if (filters.level && String(item.requiredLevel ?? 0) !== filters.level) return false;
    if (filters.series && String(item.series) !== filters.series) return false;
    if (filters.family && item.family !== filters.family) return false;
    if (exactId) return item.id === exactId.slice(1).map(Number).join(",");
    if (words.length === 0) return true;
    const text = normalize([item.name, item.kind, item.id, weaponFamilies[item.family],
      ...item.inputs.flatMap((input) => [input.name, input.id])].join(" "));
    return words.every((word) => text.includes(word));
  });
  const pageSize = 40;
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(filters.page) || 1)));
  return { page, pages, total: matches.length, items: matches.slice((page - 1) * pageSize, page * pageSize) };
}
