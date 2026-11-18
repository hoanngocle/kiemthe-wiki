import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseMilestones } from "./topup-milestones.ts";
import type { TopupMilestone } from "./topup-types.ts";

type WikiTitle = { amountK: number; name: string; description: string; durationMinutes: number; graph: number };
type MaterialChoice = { name: string; id: string };
type EquipmentStage = { amountK: number; name: string; previousName?: string };
export type TopupWikiData = {
  milestones: TopupMilestone[];
  titles: WikiTitle[];
  materials: MaterialChoice[];
  equipment: EquipmentStage[];
  unitsPerCredit: number;
  totals: { credits: number; materialUnits: number; exp: number; repute: number; bonusCoin: number; books: number;
    knb: number; crystals: { level: number; quantity: number }[]; preservationTalismans: number; rerollGuides: number };
};

function plainXml(value: string) {
  return value.replace(/&(?:lt|gt|quot|apos|amp);|&#(?:x[0-9a-f]+|\d+);/gi, (entity) => {
    const named: Record<string, string> = { "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&amp;": "&" };
    if (entity.toLowerCase() in named) return named[entity.toLowerCase()];
    return String.fromCodePoint(entity.toLowerCase().startsWith("&#x") ? parseInt(entity.slice(3, -1), 16) : Number(entity.slice(2, -1)));
  }).replace(/<[^>]*>/g, "").trim();
}

function attrs(source: string): Record<string, string> {
  return Object.fromEntries([...source.matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], plainXml(m[2])]));
}

// Deliberately reads this game's fixed XML/Lua configuration, never executes Lua.
export function parseTopupWiki(source: string, helperSource: string, titleXml: string): TopupWikiData {
  const milestones = parseMilestones(source);
  const configuredTitles = new Map<string, Record<string, string>>();
  const xml = titleXml.replace(/<!--[\s\S]*?-->/g, "");
  for (const genre of xml.matchAll(/<genre\b([^>]*)>([\s\S]*?)<\/genre>/g)) {
    for (const detail of genre[2].matchAll(/<detailtype\b([^>]*)>([\s\S]*?)<\/detailtype>/g)) {
      for (const level of detail[2].matchAll(/<level\b([^>]*?)\/>/g)) {
        const properties = attrs(level[1]);
        configuredTitles.set([attrs(genre[1]).id, attrs(detail[1]).id, properties.id].join(","), properties);
      }
    }
  }
  const bodies = new Map<number, string>();
  const text = source.replace(/--\[\[[\s\S]*?\]\]/g, "");
  for (const fn of text.matchAll(/function\s+tbtuiguangyuan:(PhucLoi_\w+)\([^)]*\)([\s\S]*?)(?=\nfunction\s+tbtuiguangyuan:|$)/g)) {
    const lines = fn[2].split(/\r?\n/).filter((line) => !line.trimStart().startsWith("--"));
    const threshold = lines.map((line) => line.split("--")[0]).join("\n").match(/nCount_CheckNap\s*>=\s*(\d+)/);
    if (threshold) bodies.set(Number(threshold[1]), lines.join("\n"));
  }
  const helper = helperSource.replace(/--[^\n]*/g, "");
  const materialBlock = helper.match(/tb\.TopupMaterials\s*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
  const materials = [...materialBlock.matchAll(/id\s*=\s*\{\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\}\s*,\s*name\s*=\s*"([^"]+)"/g)]
    .map((m) => ({ id: m.slice(1, 5).map(Number).join(","), name: m[5] }));
  const equipmentBlock = helper.match(/tb\.TopupEquipment\s*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "";
  const equipmentNames = [...equipmentBlock.matchAll(/name\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
  const unitsPerCredit = Number(helper.match(/me\.GetTask\(g,1\)\s*\*\s*(\d+)/)?.[1]);
  if (!materials.length || !equipmentNames.length || !Number.isSafeInteger(unitsPerCredit) || unitsPerCredit <= 0) {
    throw new Error("Không đọc được quy tắc đổi thưởng mốc nạp.");
  }
  const titles: WikiTitle[] = [];
  const equipment: EquipmentStage[] = [];
  let credits = 0, books = 0;
  let knb = 0, preservationTalismans = 0, rerollGuides = 0;
  const crystals = new Map<number, number>();
  for (const tier of milestones) {
    const body = bodies.get(tier.amountK) ?? "";
    for (const line of body.split(/\r?\n/)) {
      const code = line.split("--")[0];
      const credit = code.match(/self:CreditTopupMaterials\(\s*(\d+)\s*\)/);
      if (credit) credits += Number(credit[1]);
      const book = code.match(/self:GrantTopupBooks\(\s*\d+\s*,\s*(\d+)\s*\)/);
      if (book) books += Number(book[1]);
      const gold = code.match(/self:GrantTopupKnb\(\s*\d+\s*,\s*(\d+)\s*\)/);
      if (gold) knb += Number(gold[1]);
      const crystal = code.match(/self:GrantTopupCrystal\(\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (crystal) { const level = Number(crystal[1]); crystals.set(level, (crystals.get(level) ?? 0) + Number(crystal[2])); }
      const consumable = code.match(/self:GrantTopupConsumable\(\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      if (consumable?.[1] === "3031") preservationTalismans += Number(consumable[2]);
      if (consumable?.[1] === "1782") rerollGuides += Number(consumable[2]);
      const set = code.match(/self:CreditTopupEquipment\(\s*(\d+)\s*\)/);
      if (set) {
        const index = Number(set[1]) - 1;
        if (!equipmentNames[index]) throw new Error("Không đọc được bộ trang bị mốc nạp.");
        equipment.push({ amountK: tier.amountK, name: equipmentNames[index], ...(index > 0 ? { previousName: equipmentNames[index - 1] } : {}) });
      }
      const title = code.match(/(?:self:GrantTopupTitle|me\.AddTitle)\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*\d+\s*\)/);
      if (!title) continue;
      const configured = configuredTitles.get(title.slice(1, 4).map(Number).join(","));
      if (!configured?.name) throw new Error("Mã danh hiệu mốc nạp chưa có trong cấu hình.");
      titles.push({ amountK: tier.amountK, name: configured.name, description: configured.description ?? "", durationMinutes: Number(configured.duration ?? 0), graph: Number(configured.graph ?? 0) });
      // Lua comments can lag behind a title rename. Wiki uses the real XML name.
      const oldLabel = line.slice(line.indexOf("--") + 2).trim().replace(/^[\d.,]+\s*/, "").replace(/\)[1-6]$/, ")");
      const reward = tier.rewards.find((entry) => entry.name === oldLabel);
      if (reward) reward.name = `Danh hiệu ${configured.name} và vòng sáng`;
    }
  }
  const sum = (name: string) => milestones.flatMap((tier) => tier.rewards).filter((reward) => reward.name === name).reduce((n, reward) => n + reward.quantity, 0);
  return { milestones, titles, materials, equipment, unitsPerCredit, totals: {
    credits, materialUnits: credits * unitsPerCredit, exp: sum("Kinh nghiệm"), repute: sum("Uy Danh"), bonusCoin: sum("Đồng không khóa"), books,
    knb, crystals: [...crystals].sort(([a], [b]) => a - b).map(([level, quantity]) => ({ level, quantity })), preservationTalismans, rerollGuides,
  } };
}

export async function loadTopupWiki(gameRoot: string): Promise<TopupWikiData> {
  const [source, helper, titles] = await Promise.all([
    readFile(path.join(gameRoot, "script/npc/tuiguangyuan.lua"), "utf8"),
    readFile(path.join(gameRoot, "script/npc/topup_rewards.lua"), "utf8"),
    readFile(path.join(gameRoot, "setting/player/title.xml"), "utf8"),
  ]);
  return parseTopupWiki(source, helper, titles);
}
