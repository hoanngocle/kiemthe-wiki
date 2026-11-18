export type ItemRarity = "common" | "green" | "blue" | "purple" | "orange" | "gold" | "pink" | "red";
export type RecipeItem = { id: string; name: string; iconUrl: string | null; rarity?: ItemRarity };
export type RecipePart = { text: string } | { item: RecipeItem; quantity: string };

const aliases: Record<string, string> = {
  "KNB Đại": "18,1,1338,1",
  "Kim Nguyên Bảo Đại": "18,1,1338,1",
  "KNB thường khóa": "18,1,1338,2",
  "Kim Nguyên Bảo": "18,1,1338,2",
  "Mảnh Luân Hồi": "18,1,1192,12",
  "Mảnh Ngựa": "18,1,1192,1",
};
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function withoutItemIds(text: string) {
  return text.replace(/\s*\(\s*\d+\s*,\s*\d+\s*,\s*[\p{L}\d_.+–-]+\s*,\s*[\p{L}\d_.+–-]+\s*\)/gu, "")
    .replace(/[ \t]+([;,.])/g, "$1");
}

// Match quantities only when an item is identified. Expressions such as 500c
// remain symbolic; conditions and unsupported template ranges stay readable.
export function recipeParts(text: string, items: RecipeItem[]): RecipePart[] {
  text = text.replace(/(Phí|lần)(?=\d)/gu, "$1 ");
  const byId = new Map(items.map((item) => [item.id, item]));
  const names = new Map<string, RecipeItem>();
  for (const item of items) if (item.name.length > 3) names.set(item.name, item);
  for (const [name, id] of Object.entries(aliases)) {
    const item = byId.get(id);
    if (item) names.set(name, item);
  }
  const alternatives = [...names.keys()].sort((a, b) => b.length - a.length).map(escape).join("|");
  const pattern = new RegExp(`(?<![\\p{L}\\d.,])((?:\\d+(?:[.,]\\d{3})*(?:\\s*[cs])?|[cs]|\\([\\dcs+* ]+\\)))\\s*(?:[×x]\\s*)?(?:(${alternatives || "(?!)"})(?![\\p{L}\\d+])(?:\\s*\\(\\s*(\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+)\\s*\\))?|((?:[\\p{L}\\d\\s\\[\\]–-]|\\+(?=\\d))*?)\\s*\\(\\s*(\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+)\\s*\\))`, "gu");
  const parts: RecipePart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const id = (match[3] || match[5])?.replace(/\s/g, "");
    const item = id ? byId.get(id) : names.get(match[2]);
    if (!item) continue;
    if (match.index! > cursor) parts.push({ text: text.slice(cursor, match.index) });
    const quantity = match[1].replace(/\s/g, "").replace(/\.$/, "");
    parts.push({ item, quantity: /^\d+$/.test(quantity) ? Number(quantity).toLocaleString("vi-VN") : quantity });
    cursor = match.index! + match[0].length;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor) });
  const namePattern = new RegExp(`(?<![\\p{L}\\d])(${alternatives || "(?!)"})(?![\\p{L}\\d+])(?:\\s*\\(\\s*(\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+\\s*,\\s*\\d+)\\s*\\))?`, "gu");
  return parts.flatMap((part): RecipePart[] => {
    if ("item" in part) return [part];
    const result: RecipePart[] = [];
    let start = 0;
    for (const match of part.text.matchAll(namePattern)) {
      const item = match[2] ? byId.get(match[2].replace(/\s/g, "")) : names.get(match[1]);
      if (!item) continue;
      if (match.index! > start) result.push({ text: withoutItemIds(part.text.slice(start, match.index)) });
      result.push({ item, quantity: "" });
      start = match.index! + match[0].length;
    }
    if (start < part.text.length) result.push({ text: withoutItemIds(part.text.slice(start)) });
    return result.filter((entry) => "item" in entry || entry.text.length > 0);
  });
}

export function conciseChance(chance: string) {
  // Conditional or level-dependent rates must retain all branches.
  if (/^\d+(?:[.,]\d+)?%/.test(chance) && !/\d+%/.test(chance.replace(/^\d+(?:[.,]\d+)?%/, ""))) return chance.match(/^\d+(?:[.,]\d+)?%/)![0];
  if (/^Không có roll/.test(chance)) return "Thuộc tính ngẫu nhiên";
  return chance;
}

export function conciseResult(result: string, menuTitle: string, recipeName = "") {
  if (menuTitle === "Đúc Lại Chỉ Số Vũ Khí") {
    if (recipeName === "Tạo hoặc tạo lại vũ khí xem trước") return "Vũ khí xem trước với chỉ số mới; giữ hệ và nâng cấp, khóa trong 300 giây.";
    if (recipeName === "Đồng ý kết quả") return "Áp dụng chỉ số mới lên vũ khí gốc, giữ các nâng cấp và dữ liệu cũ. Xóa bản xem trước.";
  }
  const skillLevel = result.match(/(?:[Ss]kill\s+\d+\s+(?:cấp|Lv)\s*(\d+)|AddFightSkill\(\d+,\s*(\d+)\))/);
  // A single character skill is a level increase, not a reward item.
  if (skillLevel && !/skills|\d+\s*[×x]/i.test(result)) {
    const level = skillLevel[1] || skillLevel[2];
    const subject = recipeName.match(/^(Kỹ năng \[[^\]]+\] thú cưng)/i)?.[1] ?? menuTitle;
    return `${subject} cấp ${level}${/thất bại giữ/i.test(result) ? "; thất bại giữ cấp hiện tại" : ""}.`;
  }
  return result.replace(/\. ID mới [\s\S]*$/, ".").replace(/,?\s*(?:khóa )?Bind\(1\)/g, ", khóa").replace(/, bForceBind=1/g, ", khóa");
}
