import { readFile } from "node:fs/promises";
import path from "node:path";
import { cleanItemText } from "./item-wiki.ts";
import { parseShopTable } from "./shop-wiki.ts";
import { weaponElements } from "./weapon-wiki.ts";

export const equipmentSlots = [
  { key: "mu", name: "Mũ", file: "helm", detail: 9, shop: 213 },
  { key: "ao", name: "Áo", file: "armor", detail: 3, shop: 214 },
  { key: "lien", name: "Liên", file: "necklace", detail: 5, shop: 218 },
  { key: "nhan", name: "Nhẫn", file: "ring", detail: 4, shop: 219 },
  { key: "phu", name: "Phù", file: "amulet", detail: 6, shop: 221 },
  { key: "giay", name: "Giày", file: "boots", detail: 7, shop: 217 },
  { key: "lung", name: "Lưng", file: "belt", detail: 8, shop: 215 },
  { key: "tay", name: "Tay", file: "cuff", detail: 10, shop: 216 },
  { key: "boi", name: "Bội", file: "pendant", detail: 11, shop: 220 },
] as const;
export const equipmentFamilies = [6, 7, 8, 9, 11, 10, 12] as const;
export type EquipmentSlot = typeof equipmentSlots[number];
type Row = Record<string, string>;

export type EquipmentPurchase = {
  id: number; name: string; price: number | null; currency: string;
  reputation?: { name: string; level: number };
};

export type EquipmentRefine = {
  fromId: string; fromName: string; planId: string; planName: string; fee: number;
};

export type EquipmentItem = {
  id: string; name: string; slot: EquipmentSlot["key"]; level: number | null; equipLevel: number;
  suiteId: number; suite: string; series: number; kind: string;
  shops: EquipmentPurchase[]; refines: EquipmentRefine[];
  upgrades: { id: string; name: string }[];
};

const fields = ["Genre", "DetailType", "ParticularType", "Level"];
const templateId = (row: Row) => fields.map((column) => row[column]).join(",");
const clean = (name: string) => cleanItemText(name).replace(/\s+/g, " ");
const number = new Intl.NumberFormat("vi-VN");

function wearLevel(row: Row) {
  for (let i = 1; i <= 6; i++) {
    if (row[`ReqProp${i}Type`] === "5") return Number(row[`ReqProp${i}Value`]);
  }
  return null;
}

function readReputations(xml: string) {
  const names = new Map<string, string>();
  for (const camp of xml.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<camp\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/camp>/g)) {
    for (const group of camp[2].matchAll(/<class\b[^>]*\bid="(\d+)"[^>]*\bname="([^"]+)"/g)) {
      names.set(`${camp[1]}/${group[1]}`, group[2].replace(/&amp;/g, "&").replace(/-$/, ""));
    }
  }
  return names;
}

export async function loadEquipmentWiki(root: string) {
  const read = (relative: string) => readFile(path.join(root, relative), "utf8");
  const itemRoot = "setting/item/001";
  const [tables, suiteText, refineText, planText, shopsText, goodsText, reputeText, ini, sieuThanText] = await Promise.all([
    Promise.all(["greenequip", ...equipmentSlots.flatMap(({ file }) => [`general/${file}`, `purple/${file}`])]
      .map((file) => read(`${itemRoot}/equip/${file}.txt`))),
    read(`${itemRoot}/equip/greeninfo.txt`), read(`${itemRoot}/extern/refine/refine.txt`),
    read(`${itemRoot}/other/scriptitem.txt`), read("setting/shop/buysell.txt"), read("setting/shop/goods.txt"),
    read("setting/player/repute.xml"), read("setting/gamesetting.ini"), read("setting/shop/sieuthan-repute.txt"),
  ]);
  const suites = new Map(parseShopTable(suiteText).map((row) => [Number(row.SuiteID), row.Name]));
  const byDetail = new Map<number, EquipmentSlot>(equipmentSlots.map((slot) => [slot.detail, slot]));
  const raw = new Map<string, Row>();
  const items = new Map<string, EquipmentItem>();
  for (const table of tables) {
    for (const row of parseShopTable(table)) {
      const slot = byDetail.get(Number(row.DetailType));
      const id = templateId(row);
      if (!slot || !row.Name || !/^\d+,\d+,\d+,\d+$/.test(id)) continue;
      const suiteId = Number(row.SuiteID) || 0;
      raw.set(id, row);
      items.set(id, { id, name: clean(row.Name), slot: slot.key, level: wearLevel(row), equipLevel: Number(row.Level),
        suiteId, suite: suites.get(suiteId) ?? (row.Genre === "1" ? "Trang bị thường" : "Trang bị phẩm tím"),
        series: Number(row.Series), kind: clean(row.Kind), shops: [], refines: [], upgrades: [] });
    }
  }

  const plans = parseShopTable(planText);
  const plansByRefine = new Map(plans.filter((row) => row.ClassName === "refineitem").map((row) => [row.ExtParam1, row]));
  for (const row of parseShopTable(refineText)) {
    const columns = ["Genre", "Detail", "Parti", "Level"];
    const fromId = columns.map((column) => row[`Equip${column}`]).join(",");
    const toId = columns.map((column) => row[`Produce${column}`]).join(",");
    const input = items.get(fromId);
    const output = items.get(toId);
    const plan = plansByRefine.get(row.RefineId);
    if (!input || !output || !plan || input.slot !== output.slot) continue;
    output.refines.push({ fromId, fromName: input.name, planId: templateId(plan), planName: clean(plan.Name), fee: Number(row.Fee) });
    if (!input.upgrades.some(({ id }) => id === toId)) input.upgrades.push({ id: toId, name: output.name });
  }

  const goods = new Map(parseShopTable(goodsText).map((row) => [row.Id, row]));
  const reputations = readReputations(reputeText);
  const byCoin = new Map([...ini.matchAll(/^CoinParam(\d+)_(\d+)\s*=\s*(\d+)/gm)].map((match) => [`${match[1]}/${match[2]}`, match[3]]));
  const itemNames = new Map(plans.map((row) => [templateId(row), clean(row.Name)]));
  const advancedShops = new Set<number>(equipmentSlots.map((slot) => slot.shop));
  for (const shop of parseShopTable(shopsText)) {
    const id = Number(shop.ShopId);
    if (!advancedShops.has(id) && ![192, 195, 196, 201].includes(id)) continue;
    for (const [column, value] of Object.entries(shop)) {
      const product = /^Item\d+$/.test(column) ? goods.get(value) : undefined;
      if (!product) continue;
      const item = items.get(templateId(product));
      if (!item) continue;
      const repKey = `${product.ReputeCamp}/${product.ReputeClass}`;
      const repLevel = Number(product.ReputeLevel);
      const coinMode = !advancedShops.has(id);
      const coinId = [1, 2, 3, 4].map((i) => byCoin.get(`${product.goodsindex}/${i}`)).join(",");
      const currency = coinMode ? itemNames.get(coinId) ?? "Vật phẩm đổi" : "bạc thường";
      const amount = coinMode ? product.goodsprice : raw.get(item.id)?.Price;
      item.shops.push({ id, name: shop.ShopName, price: amount && /^\d+$/.test(amount) ? Number(amount) : null, currency,
        reputation: repLevel ? { name: reputations.get(repKey) ?? repKey, level: repLevel } : undefined });
    }
  }
  const sieuThanRequirements = parseShopTable(sieuThanText).map((row) => ({ name: row.Name, level: Number(row.Level) }));
  return { items: [...items.values()].sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || a.suiteId - b.suiteId ||
    a.name.localeCompare(b.name, "vi") || a.id.localeCompare(b.id)), suites, sieuThanRequirements };
}

export type EquipmentFilters = { slot: string; suite?: string; level?: string; series?: string; q?: string; page?: string };

export function selectEquipment(items: EquipmentItem[], filters: EquipmentFilters) {
  const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d");
  const query = filters.q?.trim().slice(0, 150) ?? "";
  const exact = /^(\d+)\s*[,-]\s*(\d+)\s*[,-]\s*(\d+)\s*[,-]\s*(\d+)$/.exec(query)?.slice(1).map(Number).join(",");
  const words = normalize(query).split(/\s+/).filter(Boolean);
  const matches = items.filter((item) => {
    if (item.slot !== filters.slot || (filters.suite && String(item.suiteId) !== filters.suite) ||
        (filters.level && String(item.level ?? 0) !== filters.level) || (filters.series && String(item.series) !== filters.series)) return false;
    if (exact) return item.id === exact;
    if (!words.length) return true;
    const text = normalize([item.name, item.id, item.suite, item.kind, weaponElements[item.series]].join(" "));
    return words.every((word) => text.includes(word));
  });
  const size = 40;
  const pages = Math.max(1, Math.ceil(matches.length / size));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(filters.page) || 1)));
  return { items: matches.slice((page - 1) * size, page * size), total: matches.length, page, pages };
}

export function describeEquipmentPurchase(shop: EquipmentPurchase) {
  const cost = shop.price === null ? "giá xem tại quầy" : `${number.format(shop.price)} ${shop.currency}`;
  return shop.reputation ? `Danh vọng ${shop.reputation.name} cấp ${shop.reputation.level} · ${cost}` : cost;
}

export function equipmentGuide(items: EquipmentItem[], slot: EquipmentSlot) {
  const inventory = items.filter((item) => item.slot === slot.key);
  return equipmentFamilies.map((suiteId) => {
    const shopId = suiteId === 12 ? 195 : slot.shop;
    const candidates = inventory.filter((item) => item.suiteId === suiteId && item.shops.some((shop) => shop.id === shopId));
    const item = candidates.find((item) => item.series === 1) ?? candidates[0];
    const shop = item?.shops.find((offer) => offer.id === shopId);
    return item && shop ? { item, shop, variants: candidates.length } : null;
  }).filter((entry) => entry !== null);
}
