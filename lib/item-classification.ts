import type { ItemClassification, ItemFacets, ItemFilters, ItemVariant, WikiItem } from "./item-wiki-types.ts";

const slots: Record<number, [string, string]> = {
  1: ["can-chien", "Vũ khí cận chiến"], 2: ["tam-xa", "Vũ khí tầm xa"],
  3: ["ao", "Áo"], 4: ["nhan", "Nhẫn"], 5: ["lien", "Liên"], 6: ["phu", "Phù"],
  7: ["giay", "Giày"], 8: ["lung", "Lưng"], 9: ["mu", "Mũ"], 10: ["tay", "Hộ uyển"], 11: ["boi", "Bội"],
  12: ["ngua", "Ngựa"], 13: ["mat-na", "Mặt nạ"], 14: ["bi-kip", "Bí kíp"],
  15: ["phi-phong", "Phi phong"], 16: ["an", "Ấn"], 18: ["an", "Ấn"],
  24: ["chan-nguyen", "Chân nguyên"], 27: ["thanh-linh", "Thánh linh"],
};
const files: Record<string, [string, string]> = {
  garment: ["ngoai-trang-ao", "Ngoại trang áo"], outhat: ["ngoai-trang-non", "Ngoại trang nón"],
  zhen: ["phap-bao", "Pháp bảo"],
};
export function classifyTemplate(id: string, source: string, row: Record<string, string>, category: string): ItemClassification {
  const [genre, detail] = id.split(",").map(Number);
  const partner = source.includes("partnerequip/") || genre === 5;
  const equipment = genre >= 1 && genre <= 5;
  const weapon = equipment && !partner && (detail === 1 || detail === 2);
  const file = source.split("/").at(-1)?.replace(/\.txt$/, "") ?? "";
  const slot = partner ? ["dong-hanh", "Trang bị đồng hành"] : equipment ? files[file] ?? slots[detail] ?? [file, category] : [file, category];
  let requiredLevel: number | null = row.ReqLevel ? Number(row.ReqLevel) : null;
  for (let index = 1; index <= 6; index++) if (row[`ReqProp${index}Type`] === "5") requiredLevel = Number(row[`ReqProp${index}Value`]);
  return { group: weapon ? "vu-khi" : equipment ? "trang-bi" : "vat-pham", slot: slot[0], slotName: slot[1],
    family: category, familyName: category, requiredLevel,
    ...(/^\d+$/.test(row.SuiteID ?? "") ? { suiteId: Number(row.SuiteID) } : {}) };
}
function matches(variant: ItemVariant, filters: ItemFilters) {
  const meta = variant.classification;
  return (!filters.group || meta.group === filters.group) && (!filters.slot || meta.slot === filters.slot)
    && (!filters.family || meta.family === filters.family)
    && (!filters.series || variant.tooltip.series === -1 || variant.tooltip.series === Number(filters.series))
    && (!filters.level || (meta.requiredLevel ?? 0) === Number(filters.level))
    && (!filters.quality || variant.tooltip.quality === filters.quality);
}
export function filterItemCatalog(items: WikiItem[], filters: ItemFilters): WikiItem[] {
  if (!Object.values(filters).some(Boolean)) return items;
  return items.flatMap((item) => {
    const variants = item.variants.filter((variant) => matches(variant, filters));
    if (!variants.length) return [];
    const first = variants[0];
    const descriptions = [...new Set(variants.map((variant) => variant.tooltip.description).filter(Boolean))];
    return [{ ...item, id: first.id, variants, ids: [...new Set(variants.map((variant) => variant.id))],
      levels: [...new Set(variants.map((variant) => variant.tooltip.level))].sort((a, b) => a - b),
      systems: [...new Set(variants.flatMap((variant) => variant.tooltip.series === -1 ? [1, 2, 3, 4, 5] : variant.tooltip.series > 0 ? [variant.tooltip.series] : []))].sort(),
      qualities: [...new Set(variants.map((variant) => variant.tooltip.quality).filter(Boolean))],
      kinds: [...new Set(variants.map((variant) => variant.tooltip.kind))],
      kind: variants.map((variant) => variant.tooltip.kind).join("\n"), descriptions, description: descriptions.join("\n\n") }];
  });
}
export function itemFacets(items: WikiItem[], filters: ItemFilters = {}): ItemFacets {
  const groupNames = { "vu-khi": "Vũ khí", "trang-bi": "Trang bị", "vat-pham": "Vật phẩm khác" };
  const groups = Object.entries(groupNames).map(([value, label]) => ({ value, label, count: items.filter((item) => item.variants.some((variant) => variant.classification.group === value)).length }));
  const scoped = items.flatMap((item) => item.variants).filter((variant) => !filters.group || variant.classification.group === filters.group);
  const positioned = scoped.filter((variant) => !filters.slot || variant.classification.slot === filters.slot);
  const family = positioned.filter((variant) => !filters.family || variant.classification.family === filters.family);
  const choices = (values: [string, string][]) => [...new Map(values).entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, "vi"));
  return { groups, slots: choices(scoped.map((variant) => [variant.classification.slot, variant.classification.slotName])),
    families: choices(positioned.map((variant) => [variant.classification.family, variant.classification.familyName])),
    levels: [...new Set(family.map((variant) => variant.classification.requiredLevel ?? 0))].sort((a, b) => a - b),
    qualities: [...new Set(family.map((variant) => variant.tooltip.quality).filter(Boolean))] };
}
