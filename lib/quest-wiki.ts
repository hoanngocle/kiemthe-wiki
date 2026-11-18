export const questTypes: Record<string, string> = {
  "1": "Chính tuyến", "2": "Phụ tuyến", "3": "Nhiệm vụ phụ · Thế giới",
  "4": "Ngẫu nhiên", "5": "Quân doanh",
};

export interface QuestCondition { function: string; params: string[] }
export interface QuestAward {
  kind: string; label: string; amount: number | null; itemId: string; conditions: string[];
  note: string; description: string; rawType: string; group: string; step: number | null; rate: number | null;
}
export interface QuestPart {
  id: number; subId: number; name: string;
  acceptNpc: string; acceptNpcId: string;
  acceptItem: string; replyNpc: string; minLevel: number | null; maxLevel: number | null;
  balanceLevel: number; conditions: QuestCondition[][]; rewards: string[]; awards: QuestAward[]; source: string; subSource: string; hasSub: boolean;
}
export interface Quest {
  id: number; name: string; type: number; repeat: boolean;
  order: string; source: string; quests: QuestPart[];
}
export function normalizeQuestText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
}
// School task families in XML; combat task IDs are also enumerated by xiulianzhu.lua.
export function factionQuestGroup(quest: Quest): string | null {
  const name = normalizeQuestText(quest.name);
  if (/^nhiem vu .+ \(cap (20|30|40)\)$/.test(name)) return "Môn phái cấp 20/30/40";
  if (/^nhiem vu tiep dan /.test(name)) return "Tiếp dẫn môn phái";
  if (/^ky nang cap 110_/.test(name)) return "Kỹ năng cấp 110";
  return null;
}
export function filterQuests(quests: Quest[], query: string, type: string): Quest[] {
  const terms = normalizeQuestText(query).split(/\s+/).filter(Boolean);
  return quests.filter((quest) => {
    if (type === "mon-phai" ? !factionQuestGroup(quest) : type !== "all" && String(quest.type) !== type) return false;
    const content = normalizeQuestText([quest.id, quest.name,
      ...quest.quests.flatMap((part) => [part.id, part.name, part.acceptNpc,
        ...(part.awards ?? []).flatMap((award) => [award.label, award.itemId])]),
    ].join(" "));
    return terms.every((term) => content.includes(term));
  });
}

export const rewardTiers = [
  { min: 1, max: 19, coin: 200, silver: 5000, energy: 50, repute: 5, crystal: 4, spirit: 10 },
  { min: 20, max: 39, coin: 500, silver: 10000, energy: 100, repute: 10, crystal: 5, spirit: 20 },
  { min: 40, max: 59, coin: 1000, silver: 20000, energy: 200, repute: 15, crystal: 5, spirit: 30 },
  { min: 60, max: 89, coin: 2000, silver: 50000, energy: 400, repute: 20, crystal: 6, spirit: 50 },
  { min: 90, max: 119, coin: 3000, silver: 100000, energy: 600, repute: 25, crystal: 7, spirit: 75 },
  { min: 120, max: Infinity, coin: 5000, silver: 150000, energy: 1000, repute: 30, crystal: 8, spirit: 100 },
];

// Proposed common reputation pool; IDs verified against setting/player/repute.xml.
export const randomReputePool = [
  { camp: 1, classId: 1, group: "Nhiệm vụ", name: "Nghĩa Quân" },
  { camp: 1, classId: 2, group: "Nhiệm vụ", name: "Quân doanh" },
  { camp: 2, classId: 1, group: "Tống Kim", name: "Dương Châu" },
  { camp: 2, classId: 2, group: "Tống Kim", name: "Phượng Tường" },
  { camp: 2, classId: 3, group: "Tống Kim", name: "Tương Dương" },
  { camp: 5, classId: 1, group: "Hoạt động", name: "Bạch Hổ Đường" },
  { camp: 5, classId: 3, group: "Hoạt động", name: "Tiêu Dao Cốc" },
];

export function rewardBase(part: QuestPart, kinds: string[]) {
  return part.awards.filter((award) => kinds.includes(award.kind) && ["fixed", "step"].includes(award.group)
    && award.conditions.length === 0 && !award.note && typeof award.amount === "number")
    .reduce((sum, award) => sum + (award.amount ?? 0), 0);
}

export function proposeQuestRewards(quest: Quest, part: QuestPart, last: boolean) {
  const tier = rewardTiers.find((entry) => part.balanceLevel <= entry.max) ?? rewardTiers[0];
  const factor = quest.repeat ? 0.15 : quest.type === 1 ? 1 : quest.type === 2 ? 0.6 : 0.5;
  const levelStep = Math.floor(Math.max(1, part.balanceLevel) / 10) + 1;
  const extra = (base: number, kinds: string[]) => Math.max(0, Math.round(base * factor) - rewardBase(part, kinds));
  return {
    coin: Math.max(0, levelStep * 500 - rewardBase(part, ["coin"])), coinType: "coin" as const,
    silver: extra(tier.silver, ["money", "bindmoney"]),
    make: 14 * rewardBase(part, ["makepoint"]), gather: 14 * rewardBase(part, ["gatherpoint"]),
    repute: levelStep * 5,
    reputeMode: "random-one" as const,
    crystal: !quest.repeat && last ? Math.min(9, tier.crystal + 1) : null,
    crystalCount: !quest.repeat && last ? 2 : 0,
    spirit: !quest.repeat && last ? tier.spirit : 0,
    factor,
  };
}

export function configuredQuestRewards(quest: Quest, part: QuestPart, last: boolean) {
  const proposal = proposeQuestRewards(quest, part, last);
  const awards = part.awards.filter((award) => award.group === "bonus");
  if (awards.length === 0) return proposal;
  const amount = (kind: string) => awards.filter((award) => award.kind === kind)
    .reduce((sum, award) => sum + (award.amount ?? 0), 0);
  const crystal = awards.find((award) => /^18,1,114,[1-9]$/.test(award.itemId ?? ""));
  return {
    ...proposal,
    coin: amount("coin"), silver: amount("bindmoney"), make: amount("makepoint"),
    gather: amount("gatherpoint"), repute: amount("repute"),
    crystal: crystal ? Number(crystal.itemId.split(",")[3]) : null,
    crystalCount: crystal?.amount ?? 0,
    spirit: awards.filter((award) => award.itemId === "18,1,3071,1")
      .reduce((sum, award) => sum + (award.amount ?? 0), 0),
  };
}
