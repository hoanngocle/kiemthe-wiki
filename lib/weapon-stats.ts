type Row = Record<string, string>;
export type StatRange = [min: number, max: number];
type StatValues = { value: StatRange | null; extra: { parameter: number; range: StatRange }[] };
type Attribute = { code: string; label: string; unit: string; slot: number };
type FixedStat = Attribute & StatValues & { unlock?: number };
export type MagicStat = Attribute & { level: number; ranges: Record<number, StatValues> };

export const maxWeaponEnhancement = 16;
const maxMagicLevel = 26;
const oldMagicCap = 10;
const stats: Record<string, [label: string, unit?: string]> = {
  addphysicsdamage_p: ["Vật công ngoại (%)", "%"],
  addphysicsmagic_p: ["Vật công nội (%)", "%"],
  addphysicsdamage_v: ["Vật công ngoại (điểm)", " điểm"],
  addphysicsmagic_v: ["Vật công nội (điểm)", " điểm"],
  attackspeed_v: ["Tốc độ xuất chiêu hệ ngoại công"],
  castspeed_v: ["Tốc độ xuất chiêu hệ nội công"],
  attackratingenhance_v: ["Điểm đánh trúng"],
  state_hurt_attacktime: ["Thời gian gây thọ thương"],
  state_slowall_attacktime: ["Thời gian gây làm chậm"],
  state_stun_attacktime: ["Thời gian gây choáng"],
  state_burn_attacktime: ["Thời gian gây bỏng"],
  state_weak_attacktime: ["Thời gian gây suy yếu"],
  addpoisondamage_v: ["Độc công ngoại", " điểm/nửa giây"],
  addpoisonmagic_v: ["Độc công nội", " điểm/nửa giây"],
  stealmana_p: ["Chuyển sát thương thành nội lực", "%"],
  weapondamagemin_v: ["Tấn công ngoại tối thiểu", " điểm"],
  weapondamagemax_v: ["Tấn công ngoại tối đa", " điểm"],
  weaponmagicmin_v: ["Tấn công nội tối thiểu", " điểm"],
  weaponmagicmax_v: ["Tấn công nội tối đa", " điểm"],
  weaponbasedamagetrim: ["Tấn công cơ bản của vũ khí", " điểm"],
  lifemax_p: ["Tỉ lệ sinh lực tối đa", "%"],
  lifemax_v: ["Sinh lực tối đa", " điểm"],
  manamax_v: ["Nội lực tối đa", " điểm"],
  skilldamageptrim: ["Phát huy lực tấn công cơ bản", "%"],
  skillselfdamagetrim: ["Phát huy lực tấn công kỹ năng", "%"],
  deadlystrikeenhance_r: ["Chí mạng"],
  deadlystrikedamageenhance_p: ["Tấn công khi đánh chí mạng", "%"],
  damage_all_resist: ["Kháng tất cả", " điểm"],
  ignoreresist_p: ["Tỷ lệ bỏ qua kháng", "%"],
  allskill_v: ["Cấp kỹ năng"],
  active_all_hide_attrib: ["Kích hoạt thuộc tính ẩn toàn bộ trang bị"],
};

function integer(raw?: string) {
  return raw && /^-?\d+$/.test(raw) ? Number(raw) : undefined;
}

function readValues(row: Row, prefix: string): StatValues {
  const values = [1, 2, 3].map((parameter): StatRange | null => {
    const min = integer(row[`${prefix}${parameter}Min`]);
    const max = integer(row[`${prefix}${parameter}Max`]);
    return min !== undefined && max !== undefined && min <= max ? [min, max] : null;
  });
  return {
    value: values[0],
    extra: values.slice(1).flatMap((range, index) =>
      range && !range.every((value) => value === 0) && !range.every((value) => value === -1)
        ? [{ parameter: index + 2, range }] : []),
  };
}

export function readTemplateStats(row: Row, magicRows: Row[]) {
  return createTemplateStatsReader(magicRows)(row);
}

// Catalog consumers read thousands of templates against the same magic table.
export function createTemplateStatsReader(magicRows: Row[]) {
  const byCode = new Map<string, { name: string; ranges: MagicStat["ranges"] }>();
  for (const entry of magicRows) {
    const level = integer(entry.Level);
    if (!entry.MagicName || level === undefined) continue;
    let record = byCode.get(entry.MagicName);
    if (!record) {
      record = { name: entry.Name, ranges: {} };
      byCode.set(entry.MagicName, record);
    }
    record.ranges[level] = readValues(entry, "MA");
  }
  return (row: Row) => {
  const attribute = (code: string, slot: number): Attribute => ({
    code, slot,
    label: stats[code]?.[0] ?? byCode.get(code)?.name ?? code,
    unit: stats[code]?.[1] ?? (code.endsWith("_p") ? "%" : ""),
  });
  const fixed = (slots: number, columns: (slot: number) => { code?: string; prefix: string; unlock?: number }): FixedStat[] =>
    Array.from({ length: slots }, (_, index) => index + 1).flatMap((slot) => {
      const { code, prefix, unlock } = columns(slot);
      return code ? [{ ...attribute(code, slot), ...readValues(row, prefix), unlock }] : [];
    });

  const basic = fixed(10, (slot) => ({ code: row[`BasicProp${slot}Type`], prefix: `BasicProp${slot}PA` }));
  const bonuses = fixed(6, (slot) => ({ code: row[`EnhMA${slot}Name`], prefix: `EnhMA${slot}PA`, unlock: integer(row[`Enh${slot}Times`]) }));
  const strengthen = fixed(2, (slot) => ({ code: row[`StrMA${slot}Name`], prefix: `StrMA${slot}PA`, unlock: integer(row[`Str${slot}Times`]) }));
  const riding = fixed(6, (slot) => ({ code: row[`RideProp${slot}Type`], prefix: `RideProp${slot}PA` }));
  const magic = Array.from({ length: 6 }, (_, index) => index + 1).flatMap((slot): MagicStat[] => {
    const code = row[`MagicName${slot}`];
    const level = integer(row[`MagicLevel${slot}`]);
    if (!code || level === undefined) return [];
    return [{ ...attribute(code, slot), level, ranges: byCode.get(code)?.ranges ?? {} }];
  });
  return { basic, magic, bonuses, strengthen, riding };
  };
}

export function rangeAt(stat: MagicStat, enhancement: number, legacy = false) {
  const base = Math.max(1, Math.min(stat.level, legacy ? oldMagicCap : maxMagicLevel));
  const level = Math.min(maxMagicLevel, base + enhancement);
  const values = stat.ranges[level];
  return { level, value: values?.value ?? null, extra: values?.extra ?? [] };
}

export function compareMagicRoll(stat: MagicStat, enhancement: number, raw: string) {
  const text = raw.trim().replace(/\s*%$/, "").replace(/^\+/, "").replace(/^−/, "-");
  if (!raw.trim()) return null;
  if (!/^-?(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(text)) return "invalid";
  const value = Number(text.replaceAll(".", ""));
  if (!Number.isSafeInteger(value)) return "invalid";

  const current = rangeAt(stat, enhancement).value;
  const legacy = rangeAt(stat, enhancement, true).value;
  if (!current) return "unknown";
  if (current[0] <= value && value <= current[1]) return "current";
  if (legacy && legacy[0] <= value && value <= legacy[1]) return "legacy";
  return "outside";
}

const number = new Intl.NumberFormat("vi-VN");
export function formatStatRange(range: StatRange | null, unit = "") {
  if (!range) return "—";
  const [min, max] = range;
  return `${number.format(min)}${min === max ? "" : `–${number.format(max)}`}${unit}`;
}
