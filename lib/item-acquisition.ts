import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { cleanItemText } from "./item-wiki.ts";
import type { ItemAcquisition, WikiItem } from "./item-wiki-types.ts";
import { parseShopTable } from "./shop-wiki.ts";
import { loadWeaponWiki, weaponFamilies } from "./weapon-wiki.ts";
import { loadEquipmentWiki } from "./equipment-wiki.ts";
import type { SpecialEquipmentItem } from "./special-equipment-wiki.ts";

export type ItemReferences = {
  weapons: Awaited<ReturnType<typeof loadWeaponWiki>>;
  equipment: Awaited<ReturnType<typeof loadEquipmentWiki>>;
  specials?: { slot: string; items: SpecialEquipmentItem[] }[];
};

const fields = ["Genre", "DetailType", "ParticularType", "Level"];
const number = new Intl.NumberFormat("vi-VN");
const stripComments = (script: string) => script.replace(/--\[\[[\s\S]*?\]\]/g, "").replace(/--[^\r\n]*/g, "");

export async function loadItemAcquisition(root: string, items: WikiItem[], references?: ItemReferences) {
  const read = async (file: string) => {
    const bytes = await readFile(path.join(root, file));
    try { return new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
    catch { return new TextDecoder("gb18030").decode(bytes); }
  };
  const table = async (file: string) => parseShopTable(await read(file));
  const [shops, goodsRows, npcRows, mapRows, repute, sieuThan, weapons, equipment, npcFiles] = await Promise.all([
    table("setting/shop/buysell.txt"), table("setting/shop/goods.txt"), table("setting/npc/npc.txt"),
    table("setting/map/maplist.txt"), read("setting/player/repute.xml"), table("setting/shop/sieuthan-repute.txt"),
    references?.weapons ?? loadWeaponWiki(root), references?.equipment ?? loadEquipmentWiki(root), readdir(path.join(root, "script/npc")),
  ]);
  const providers = new Map<string, { className: string; mode: number }[]>();
  const npcClasses = new Set(npcRows.map((row) => row.ClassName).filter(Boolean));
  const scripts = ["script/tranphai/cuahang1.lua", "script/boss/qinshihuang/npc/npc.lua",
    ...npcFiles.filter((name) => name.endsWith(".lua")).map((name) => `script/npc/${name}`)];
  for (let start = 0; start < scripts.length; start += 16) {
    const texts = await Promise.all(scripts.slice(start, start + 16).map(read));
    for (const raw of texts) {
      const script = stripComments(raw);
      const classes = new Map([...script.matchAll(/(?:local\s+)?(\w+)\s*=\s*Npc:GetClass\(\s*["']([^"']+)["']\s*\)/g)].map((match) => [match[1], match[2]]));
      for (const block of script.split(/(?=\bfunction\s+\w+[:.])/)) {
        const owner = block.match(/^function\s+(\w+)[:.]/)?.[1];
        const className = owner ? classes.get(owner) : undefined;
        if (!className || !npcClasses.has(className)) continue;
        const openings = [...block.matchAll(/me\.OpenShop\(\s*(\d+)\s*,\s*(\d+)/g)].map((match) => ({ id: match[1], mode: Number(match[2]) }));
        if (/Shop:OpenSieuThan\(/.test(block)) openings.push({ id: "195", mode: 3 });
        // Qinling NPC chooses one shop from a literal table by element.
        for (const match of block.matchAll(/me\.OpenShop\(\s*(\w+)\[[^\]]+\]\s*,\s*(\d+)/g)) {
          const list = block.match(new RegExp(`\\b${match[1]}\\s*=\\s*\\{([\\d,\\s]+)\\}`))?.[1];
          if (list) for (const id of list.match(/\d+/g) ?? []) openings.push({ id, mode: Number(match[2]) });
        }
        for (const { id, mode } of openings) {
          const entries = providers.get(id) ?? [];
          if (!entries.some((entry) => entry.className === className && entry.mode === mode)) entries.push({ className, mode });
          providers.set(id, entries);
        }
      }
    }
  }

  const relevantClasses = new Set([...providers.values()].flat().map((entry) => entry.className));
  relevantClasses.add("nangcap1"); relevantClasses.add("yeliandashi");
  const specialPlaces = references?.specials?.flatMap((entry) => entry.items.flatMap((item) => [...item.sources.map((source) => source.where), item.upgrade?.where ?? "", item.exchange?.where ?? ""])).join("\n") ?? "";
  for (const row of npcRows) if (row.Name.length >= 3 && specialPlaces.includes(cleanItemText(row.Name))) relevantClasses.add(row.ClassName);
  const relevantNpcs = npcRows.filter((row) => relevantClasses.has(row.ClassName));
  const npcIds = new Set(relevantNpcs.map((row) => row.Id));
  const locations = new Map<string, Set<string>>();
  const mapsByFolder = new Map<string, string[]>();
  for (const row of mapRows) {
    if (!row.InfoFile || !row.MapName || !Number(row.TemplateId)) continue;
    const names = mapsByFolder.get(row.InfoFile) ?? [];
    if (!names.includes(row.MapName)) names.push(row.MapName);
    mapsByFolder.set(row.InfoFile, names);
  }
  const mapFolders = [...mapsByFolder];
  for (let start = 0; start < mapFolders.length; start += 16) {
    await Promise.all(mapFolders.slice(start, start + 16).map(async ([folder, names]) => {
      let rows: Record<string, string>[];
      try { rows = await table(`setting/map/map_info/${folder}/info.txt`); }
      catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return; throw error; }
      for (const row of rows) {
        if (!npcIds.has(row.NpcTemplateId)) continue;
        const places = locations.get(row.NpcTemplateId) ?? new Set<string>();
        names.forEach((name) => places.add(name));
        locations.set(row.NpcTemplateId, places);
      }
    }));
  }
  const npcsFor = (className: string) => relevantNpcs.filter((row) => row.ClassName === className)
    .map((row) => ({ npc: cleanItemText(row.Name), maps: [...(locations.get(row.Id) ?? [])] }));
  const npcFor = (className: string) => npcsFor(className)[0] ?? { maps: [] as string[] };
  const reputationNames = new Map<string, string>();
  for (const camp of repute.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<camp\b[^>]*\bid="(\d+)"[^>]*>([\s\S]*?)<\/camp>/g)) {
    for (const group of camp[2].matchAll(/<class\b[^>]*\bid="(\d+)"[^>]*\bname="([^"]+)"/g)) reputationNames.set(`${camp[1]}/${group[1]}`, group[2]);
  }
  const index = new Map<string, ItemAcquisition[]>();
  const add = (id: string, route: ItemAcquisition) => {
    const entries = index.get(id) ?? [];
    if (!entries.some((entry) => JSON.stringify(entry) === JSON.stringify(route))) entries.push(route);
    index.set(id, entries);
  };
  const goods = new Map(goodsRows.map((row) => [row.Id, row]));
  for (const shop of shops) {
    const sellers = providers.get(shop.ShopId);
    // Only advertise shops for which an NPC script actually declares an opening.
    if (!sellers?.length) continue;
    for (const [column, goodsId] of Object.entries(shop)) {
      const row = /^Item\d+$/.test(column) ? goods.get(goodsId) : undefined;
      if (!row) continue;
      const id = fields.map((field) => row[field]).join(",");
      if (!/^\d+,\d+,\d+,\d+$/.test(id)) continue;
      const requirements: string[] = [];
      if (Number(row.ReputeLevel) > 0) requirements.push(`Danh vọng ${reputationNames.get(`${row.ReputeCamp}/${row.ReputeClass}`) ?? `${row.ReputeCamp}/${row.ReputeClass}`} cấp ${row.ReputeLevel}`);
      if (shop.ShopId === "195") requirements.push(...sieuThan.map((entry) => `Danh vọng ${entry.Name} cấp ${entry.Level}`));
      if (Number(row.honor) > 0) requirements.push(`Vinh dự cấp ${row.honor}`);
      if (Number(row.OfficialLevel) > 0) requirements.push(`Quan hàm cấp ${row.OfficialLevel}`);
      for (const seller of sellers) for (const npc of npcsFor(seller.className)) {
        add(id, { method: `Mua tại quầy ${cleanItemText(shop.ShopName)}`, ...npc, requirements: [...new Set(requirements)], series: Number(row.Series) || 0 });
      }
    }
  }

  const names = new Map(items.map((item) => [item.id, item.name]));
  const crafter = npcFor("nangcap1");
  const chestClasses = new Map(items.map((item) => [item.id, item.className]));
  const chestOutputs = new Map<string, Set<string>>();
  const chestFiles = (await readdir(path.join(root, "script/tranphai/item"))).filter((name) => name.endsWith(".lua"));
  for (const raw of await Promise.all(chestFiles.map((name) => read(`script/tranphai/item/${name}`)))) {
    const script = stripComments(raw);
    const className = script.match(/Item:GetClass\(\s*["']([^"']+)["']\s*\)/)?.[1];
    if (!className) continue;
    const outputs = chestOutputs.get(className) ?? new Set<string>();
    for (const match of script.matchAll(/string\.format\(\s*["']%s,%s,%s,%s["']\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/g)) outputs.add(match.slice(1).map(Number).join(","));
    chestOutputs.set(className, outputs);
  }
  const familyRecipe: Record<string, string> = { "hao-thien": "haothien", "tu-duong": "tuduong", "tu-khong-7": "tukhongx", "tu-khong-8": "tukhong8dong", "tu-khong-9": "tukhong9dong", "tu-khong-10": "tukhong10dong" };
  for (const recipe of weapons.recipes) {
    const cost = recipe.costs.map((entry) => `${number.format(entry.count)} ${names.get(entry.id) ?? "nguyên liệu"}`).join(" + ");
    add(recipe.outputId, { method: recipe.menu, ...crafter, requirements: [`Cần ${recipe.input}`], cost });
  }
  for (const weapon of weapons.weapons) {
    const recipe = weapons.recipes.find((entry) => entry.id === familyRecipe[weapon.family]);
    if (recipe && chestOutputs.get(chestClasses.get(recipe.outputId) ?? "")?.has(weapon.id)) add(weapon.id, { method: `Mở ${names.get(recipe.outputId) ?? `Rương ${weaponFamilies[weapon.family]}`}; ghép rương tại menu ${recipe.menu}`, ...crafter,
      requirements: [`Cần ${recipe.input}`], cost: recipe.costs.map((entry) => `${number.format(entry.count)} ${names.get(entry.id) ?? "nguyên liệu"}`).join(" + ") });
    if (weapon.family === "than-sa" && weapon.chest === "he-chinh") add(weapon.id, { method: `Rương Thần Sa ${weapon.lines} dòng, thưởng khi kết liễu Tần Thủy Hoàng`, maps: ["Tần Lăng tầng 5"], requirements: [] });
    for (const input of weapon.inputs) add(weapon.id, { method: `Luyện hóa từ ${input.name}`, ...npcFor("yeliandashi"), requirements: [], cost: `${number.format(input.fee)} bạc` });
    const [genre, detail, particular, level] = weapon.id.split(",").map(Number);
    if (genre === 2 && detail === 1 && level === 10) for (const step of weapons.recipes) {
      if (particular < step.minId || particular > step.maxId) continue;
      add(weapon.id, { method: step.menu, ...crafter, requirements: [step.materialsInGift ? "Đặt vũ khí và nguyên liệu vào khung" : "Đặt vũ khí vào khung, giữ nguyên liệu trong túi"],
        cost: step.costs.map((entry) => `${number.format(entry.count)} ${names.get(entry.id) ?? "nguyên liệu"}`).join(" + "), type: "upgrade", targetId: step.outputId });
    }
  }
  for (const item of equipment.items) for (const recipe of item.refines) {
    add(item.id, { method: `Luyện hóa từ ${recipe.fromName} bằng ${recipe.planName}`, ...npcFor("yeliandashi"), requirements: [], cost: `${number.format(recipe.fee)} bạc khóa` });
    add(recipe.fromId, { method: `Luyện hóa lên ${item.name}`, ...npcFor("yeliandashi"), requirements: [], cost: `${recipe.planName} + ${number.format(recipe.fee)} bạc khóa`, type: "upgrade", targetId: item.id });
  }

  const specialRoute = (method: string, where: string, cost: string, note: string): ItemAcquisition => {
    const npc = relevantNpcs.filter((row) => row.Name.length >= 3 && where.includes(cleanItemText(row.Name))).sort((a, b) => b.Name.length - a.Name.length)[0];
    return { method, ...(npc ? { npc: cleanItemText(npc.Name), maps: [...(locations.get(npc.Id) ?? [])] } : { maps: [] }),
      cost, requirements: [where, note].filter(Boolean) };
  };
  for (const special of references?.specials ?? []) for (const item of special.items) {
    for (const source of item.sources) add(item.id, specialRoute(source.where, source.where, source.costs, source.note));
    if (item.exchange) add(item.id, specialRoute(`Hoán đổi từ ${item.exchange.input}`, item.exchange.where, item.exchange.costs, item.exchange.note));
    for (const step of [item.upgrade, item.alternativeUpgrade]) {
      if (!step) continue;
      const targetId = "targetId" in step && typeof step.targetId === "string" ? step.targetId : item.id;
      const target = names.get(targetId) ?? item.name;
      add(item.id, { ...specialRoute(`Nâng cấp: ${targetId === item.id ? (item.upgrade?.result ?? "Luyện thuộc tính trên vật phẩm") : target}`, step.where, step.costs, step.note), type: "upgrade", targetId });
      if (targetId !== item.id) add(targetId, specialRoute(`Nâng từ ${item.name}`, step.where, step.costs, step.note));
    }
  }

  // Supplement structured routes with explicit source facts, never usage/lore.
  for (const item of items) {
    let sourceSection = false;
    for (const raw of item.description.split(/\n/)) {
      const text = raw.trim();
      if (/^Nguồn nhận/i.test(text)) { sourceSection = true; continue; }
      if (/^(?:Công dụng|Cách dùng|Lưu ý|Tối đa|Kích hoạt)/i.test(text)) sourceSection = false;
      if (!(sourceSection && /^[•·]/.test(text)) && !/(?:nhận từ|nhận được từ|phần thưởng từ|có thể nhận từ|có ở chỗ|mua (?:ở|tại)|có thể rơi)/i.test(text)) continue;
      add(item.id, { method: text.replace(/^[•·]\s*/, ""), maps: [], requirements: [] });
    }
  }
  return index;
}
