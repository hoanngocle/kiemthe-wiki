import type { TopupMilestone, TopupReceipt } from "./topup-types.ts";

export function sumTopups(receipts: TopupReceipt[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const receipt of receipts) totals[receipt.character.id] = (totals[receipt.character.id] ?? 0) + receipt.amountK;
  return totals;
}

export function milestoneProgress(milestones: TopupMilestone[], totalK: number) {
  const reached = milestones.filter((tier) => totalK >= tier.amountK).length;
  const nextK = milestones.find((tier) => tier.amountK > totalK)?.amountK ?? null;
  return { reached, nextK, remainingK: nextK === null ? 0 : nextK - totalK, percent: nextK === null ? 100 : Math.min(100, totalK * 100 / nextK) };
}

// This is a reader for this game's fixed reward-script format, not a Lua
// evaluator. Display only tiers reachable from the active reward menu.
export function parseMilestones(source: string, itemIcons: ReadonlyMap<string, string> = new Map()): TopupMilestone[] {
  const text = source.replace(/--\[\[[\s\S]*?\]\]/g, "");
  const functions = new Map<string, string>();
  for (const match of text.matchAll(/function\s+tbtuiguangyuan:(\w+)\([^)]*\)([\s\S]*?)(?=\nfunction\s+tbtuiguangyuan:|$)/g)) {
    functions.set(match[1], match[2]);
  }
  const activeLines = (body: string) => body.split(/\r?\n/).filter((line) => !line.trimStart().startsWith("--"));
  const menu = activeLines(functions.get("PhucLoiNapThe123") ?? "").map((line) => line.split("--")[0]).join("\n");
  const names = [...menu.matchAll(/table\.insert\(tbOpt,[^\n]*?self\.(PhucLoi_\w+),/g)].map((match) => match[1]);
  if (!names.length || new Set(names).size !== names.length) throw new Error("Không đọc được danh sách mốc thưởng.");
  return names.map((name) => {
    const body = functions.get(name);
    if (!body) throw new Error("Không tìm thấy xử lý mốc thưởng.");
    const lines = activeLines(body);
    const executable = lines.map((line) => line.split("--")[0]).join("\n");
    const threshold = executable.match(/nCount_CheckNap\s*>=\s*(\d+)/);
    if (!threshold) throw new Error("Không đọc được điều kiện mốc thưởng.");
    const rewards = new Map<string, TopupMilestone["rewards"][number]>();
    function add(label: string, quantity: number, itemId?: string) {
      const reward = rewards.get(label) ?? { name: label, quantity: 0 };
      reward.quantity += quantity;
      const iconUrl = itemId ? itemIcons.get(itemId) : undefined;
      if (!reward.iconUrl && iconUrl) reward.iconUrl = iconUrl;
      rewards.set(label, reward);
    }
    for (const line of lines) {
      const code = line.split("--")[0].replace(/\bTitleRewardBonus:Grant\(\s*([\w.]+)\s*,\s*"(AddExp|AddJbCoin|Earn|AddBindCoin|AddBindMoney)"\s*,\s*/g, "$1.$2(");
      const simple = code.match(/me\.(AddExp|AddKinReputeEntry|AddJbCoin)\(\s*(\d+)\s*\)/);
      if (simple) {
        add({ AddExp: "Kinh nghiệm", AddKinReputeEntry: "Uy Danh", AddJbCoin: "Đồng không khóa" }[simple[1]]!, Number(simple[2]));
        continue;
      }
      const stack = code.match(/me\.AddStackItem\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(?:nil|self\.tbItemInfo|\{[^}]*\})\s*,\s*(\d+)\s*\)/);
      const item = code.match(/me\.AddItem\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      const title = code.match(/me\.AddTitle\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/);
      const credits = code.match(/self:CreditTopupMaterials\(\s*(\d+)\s*\)/);
      const equipment = code.match(/self:CreditTopupEquipment\(\s*[1-4]\s*\)/);
      const rewardTitle = code.match(/self:GrantTopupTitle\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/);
      const books = code.match(/self:GrantTopupBooks\(\s*\d+\s*,\s*(\d+)\s*\)/);
      const knb = code.match(/self:GrantTopupKnb\(\s*\d+\s*,\s*(\d+)\s*\)/);
      const crystal = code.match(/self:GrantTopupCrystal\(\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      const consumable = code.match(/self:GrantTopupConsumable\(\s*\d+\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
      const bonus = knb ? { quantity: Number(knb[1]), id: "18,1,1338,1" }
        : crystal ? { quantity: Number(crystal[2]), id: `18,1,114,${Number(crystal[1])}` }
          : consumable ? { quantity: Number(consumable[2]), id: `18,1,${Number(consumable[1])},1` } : undefined;
      if (stack || item || title || credits || equipment || rewardTitle || books || bonus) {
        const label = line.slice(line.indexOf("--") + 2).trim().replace(/^[\d.,]+\s*/, "").replace(/\)[1-6]$/, ")");
        if (!line.includes("--") || !label) throw new Error("Không đọc được tên phần thưởng.");
        const template = stack ?? item;
        const itemId = template ? template.slice(1, 5).map(Number).join(",") : books ? "18,1,554,4" : bonus?.id;
        add(label, stack ? Number(stack[5]) : credits ? Number(credits[1]) : books ? Number(books[1]) : bonus?.quantity ?? 1, itemId);
      } else if (/me\.Add\w+\s*\(/.test(code)) {
        throw new Error("Có loại thưởng chưa được hỗ trợ hiển thị.");
      }
    }
    if (!rewards.size) throw new Error("Mốc thưởng không có phần thưởng.");
    return { amountK: Number(threshold[1]), rewards: [...rewards.values()] };
  }).sort((a, b) => a.amountK - b.amountK);
}
