import { createTemplateStatsReader, formatStatRange, rangeAt } from "./weapon-stats.ts";
import type { ItemTooltip, ItemTooltipStat, ItemVariant, WikiItem, ItemWikiEntry, ItemAcquisition } from "./item-wiki-types.ts";
import { summarizeItem } from "./item-wiki-summary.ts";

type Row = Record<string, string>;
const clean = (text = "") => text.replace(/<enter\s*\/?>/gi, "\n").replace(/\\n/g, "\n").replace(/<[^>]*>/g, "").trim();
const extraLabels: Record<string, string> = {
  damage_series_resist: "Kháng theo ngũ hành", lifereplenish_v: "Phục hồi sinh lực",
  manareplenish_v: "Phục hồi nội lực", lifepotion_v: "Hồi sinh lực", manapotion_v: "Hồi nội lực",
  stamina_v: "Thể lực", stamina_p: "Thể lực (%)", strength_v: "Sức mạnh", dexterity_v: "Thân pháp",
  vitality_v: "Ngoại công", energy_v: "Nội công", defense_v: "Né tránh", defense_p: "Né tránh (%)",
  fastwalkrun_p: "Tốc độ di chuyển", manamax_p: "Nội lực tối đa (%)",
  armordefense_v: "Né tránh", staminamax_v: "Thể lực tối đa",
};
export const variantKey = (variant: Pick<ItemVariant, "source" | "line">) => `${variant.source}:${variant.line}`;

export function createItemTooltipReader(magicRows: Row[]) {
  const readStats = createTemplateStatsReader(magicRows);
  return (row: Row, description: string): ItemTooltip => {
    const parsed = readStats(row);
    const stats: ItemTooltipStat[] = [];
    const add = (section: string, stat: typeof parsed.basic[number], magicLevel?: number) => {
      const parameters = stat.extra.map((extra) => `PA${extra.parameter}: ${formatStatRange(extra.range)}`);
      stats.push({ section, code: stat.code, label: extraLabels[stat.code] ?? clean(stat.label),
        value: [stat.value ? formatStatRange(stat.value, stat.unit) : magicLevel !== undefined ? "Chưa có khoảng giá trị" : "Chưa có giá trị cố định", ...parameters].join(" · "),
        ...(magicLevel !== undefined ? { magicLevel } : {}), ...(stat.unlock !== undefined ? { unlock: stat.unlock } : {}) });
    };
    parsed.basic.forEach((stat) => add("Cơ bản", stat));
    parsed.magic.forEach((stat) => add("Thuộc tính", { ...stat, ...rangeAt(stat, 0) }, stat.level));
    parsed.bonuses.forEach((stat) => add("Cường hóa", stat));
    parsed.strengthen.forEach((stat) => add("Cường hóa đặc biệt", stat));
    parsed.riding.forEach((stat) => add("Khi cưỡi", stat));
    // Medicine declares direct Value/Time fields rather than equipment MagicLevel.
    for (let slot = 1; slot <= 6; slot++) {
      const code = row[`MagicName${slot}`];
      const value = row[`Value${slot}`];
      if (code && value && /^-?\d+$/.test(value)) {
        const time = Number(row[`Time${slot}`]);
        stats.push({ section: "Sử dụng", code, label: extraLabels[code] ?? code,
          value: `${Number(value).toLocaleString("vi-VN")}${time > 0 ? ` · ${time} khung hình` : ""}` });
      }
    }
    const requirements: string[] = [];
    for (let slot = 1; slot <= 6; slot++) {
      const type = row[`ReqProp${slot}Type`];
      const value = row[`ReqProp${slot}Value`];
      if (!type || value === undefined || value === "") continue;
      const labels: Record<string, string> = { "5": "Cấp nhân vật", "8": "Giới tính" };
      requirements.push(type === "8" ? `Giới tính: ${value === "0" ? "Nam" : value === "1" ? "Nữ" : value}`
        : `${labels[type] ?? `Điều kiện ${type}`}: ${value}`);
    }
    if (row.ReqLevel) requirements.push(`Cấp nhân vật: ${row.ReqLevel}`);
    return { name: clean(row.Name), kind: clean(row.Kind), level: Number(row.Level), series: Number(row.Series) || 0,
      quality: ({ "3": "Xanh", "4": "Tím", "5": "Cam" } as Record<string, string>)[row.QualityPrefix] ?? (row.QualityPrefix ? `Phẩm chất ${row.QualityPrefix}` : ""),
      description, stats, requirements };
  };
}

export function toItemWikiEntry(item: WikiItem, acquisition: ReadonlyMap<string, ItemAcquisition[]> = new Map()): ItemWikiEntry {
  // Preserve distinct profiles even when two tables declare the same GDPL.
  const profiles = new Map<string, ItemVariant>();
  for (const variant of item.variants) {
    const key = JSON.stringify([variant.id, variant.tooltip, variant.classification]);
    if (!profiles.has(key)) profiles.set(key, variant);
  }
  const labels = new Map<string, number>();
  const variants = [...profiles.values()].map(({ id, source, line, tooltip }) => {
    const label = [id, tooltip.quality, tooltip.kind || tooltip.name].filter(Boolean).join(" · ");
    labels.set(label, (labels.get(label) ?? 0) + 1);
    return { id, source, line, label };
  });
  const seen = new Map<string, number>();
  return { key: item.key, id: item.id, name: item.name, iconUrl: item.iconUrl,
    levels: item.levels, qualities: item.qualities, systems: item.systems,
    variantCount: item.ids.length, summary: summarizeItem(item), tooltip: item.variants[0].tooltip, classification: item.variants[0].classification,
    variants: variants.map((variant) => {
      const index = (seen.get(variant.label) ?? 0) + 1;
      seen.set(variant.label, index);
      return { ...variant, label: labels.get(variant.label)! > 1 ? `${variant.label} · Mẫu ${index}` : variant.label };
    }),
    selectedVariant: variantKey(item.variants[0]),
    acquisition: (acquisition.get(item.id) ?? []).filter((route) => !route.series || item.variants[0].tooltip.series === -1 || route.series === item.variants[0].tooltip.series) };
}
