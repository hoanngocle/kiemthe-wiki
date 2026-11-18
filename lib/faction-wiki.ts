import { readFile } from "node:fs/promises";
import path from "node:path";
import { cleanItemText } from "./item-wiki.ts";
import { parseShopTable } from "./shop-wiki.ts";

export type FactionSkill = {
  id: number;
  name: string;
  iconUrl: string | null;
  description: string;
  property: string;
  requiredLevel: number;
  maxLevel: number;
  weapon: string | null;
  horseRestriction: string | null;
  attackRadius: number;
  cooldownSeconds: number;
  rankValues: { 1: string; 20: string } | null;
  treeName: string | null;
  unlockNote: string | null;
  book: { name: string; group: string | null; requiredLevel: number; price: number | null } | null;
};

type FactionRoute = {
  id: number;
  name: string;
  previousName: string | null;
  skills: FactionSkill[];
};

export type Faction = {
  id: number;
  name: string;
  series: number;
  element: string;
  routes: FactionRoute[];
};

const elements = ["", "Kim", "Mộc", "Thủy", "Hỏa", "Thổ"];
const weapons: Record<string, string> = {
  11: "Tay không, Triền thủ", 12: "Kiếm", 13: "Đao", 14: "Côn", 15: "Thương", 16: "Chùy",
  21: "Phi tiêu", 22: "Phi đao", 23: "Tụ tiễn", 24: "Cơ quan",
};
const horseRestrictions: Record<string, string> = {
  1: "Không thể thi triển khi cưỡi ngựa",
  2: "Phải cưỡi ngựa để thi triển",
};
const bookSkillColumns = ["SkillID1", "SkillID2", "SkillID3", "SkillID4"];
const previousRouteNames: Record<string, string> = {
  "1:2": "Côn Thiếu",
  "4:1": "Đao Độc",
  "4:2": "Chưởng Độc",
  "8:2": "Ma Nhẫn",
  "9:1": "Khí Võ",
  "9:2": "Kiếm Võ",
  "12:1": "Chỉ Đoàn",
  "12:2": "Khí Đoàn",
};

function parseFactions(xml: string) {
  return Array.from(xml.replace(/<!--[\s\S]*?-->/g, "").matchAll(/<faction\s+([^>]+)>([\s\S]*?)<\/faction>/g), ([, attributes, content]) => ({
    id: Number(attribute(attributes, "id")),
    name: attribute(attributes, "name"),
    series: Number(attribute(attributes, "series")),
    routes: Array.from(content.matchAll(/<route\s+([^>]+?)\s*(?:\/>|>([\s\S]*?)<\/route>)/g), ([, attributes, content = ""]) => ({
      id: Number(attribute(attributes, "id")),
      name: attribute(attributes, "name"),
      skills: Array.from(content.matchAll(/<skill\s+([^>]+)\/>/g), ([, attributes]) => ({
        id: Number(attribute(attributes, "id")),
        name: attribute(attributes, "name"),
      })),
    })),
  })).filter(({ id }) => id > 0);
}

function attribute(attributes: string, name: string) {
  return attributes.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`))?.[1].replace(/&amp;/g, "&").trim() ?? "";
}

export async function loadFactionCatalog(root: string): Promise<Faction[]> {
  const read = (file: string) => readFile(path.join(root, file), "utf8");
  const [currentXml, skillTable, environment, bookTable, wareTable, coinShop, iconManifest, damageSnapshot] = await Promise.all([
    read("setting/faction/faction.xml"),
    read("setting/fightskill/skill.txt"),
    read("script/common/env.lua"),
    read("setting/item/001/equip/general/book.txt"),
    read("setting/ibshop/warelist.txt"),
    read("setting/ibshop/coinshop.txt"),
    read("../admin/public/skill-icons/manifest.json"),
    read("../admin/lib/faction-skill-damage.json"),
  ]);
  const { icons } = JSON.parse(iconManifest) as { icons: Record<string, string> };
  const damageById = JSON.parse(damageSnapshot) as Partial<Record<number, NonNullable<FactionSkill["rankValues"]>>>;
  const gameFps = Number(environment.match(/^Env\.GAME_FPS\s*=\s*(\d+)/m)?.[1]);
  if (!gameFps) throw new Error("Missing GameServer frame rate");

  const skillRows = new Map(parseShopTable(skillTable).map((row) => [Number(row.SkillId), row]));
  const coinIds = new Set(coinShop.split(/\r?\n/).map((line) => line.split("\t")[0]));
  const itemKey = (particular: string, level: string) => `${particular}:${level}`;
  const bookPrices = new Map(parseShopTable(wareTable)
    .filter((row) => row.nGenre === "1" && row.nDetailType === "14" && coinIds.has(row.WareId))
    .map((row) => [itemKey(row.nParticular, row.nLevel), Number(row.nOrgPrice)]));
  const books = parseShopTable(bookTable).filter((row) => row.Genre === "1" && row.DetailType === "14" && row.ClassName === "book");
  return parseFactions(currentXml).map(({ id, name, series, routes }) => ({
    id,
    name: name.split(" - ")[0],
    series,
    element: elements[series],
    routes: routes.map((route) => {
      const previousName = previousRouteNames[`${id}:${route.id}`];
      const routeIndex = (id - 1) * 2 + route.id;
      const routeSkills = new Map<number, FactionSkill["book"]>(route.skills.map(({ id }) => [id, null]));
      for (const row of books) {
        const particular = Number(row.ParticularType);
        const level = Number(row.Level);
        const isSchoolBook = level <= 3 && particular === routeIndex;
        const isAdvancedBook = level === 4 && (particular === routeIndex || particular === routeIndex + 144);
        if (!isSchoolBook && !isAdvancedBook) continue;
        const name = cleanItemText(row.Name).normalize("NFC");
        const group = isAdvancedBook ? name.match(/^\[([^\]]+)\]/)?.[1] ?? null : null;
        for (const column of bookSkillColumns) {
          const skillId = Number(row[column]);
          if (!skillId) continue;
          routeSkills.set(skillId, {
            name,
            group,
            requiredLevel: row.ReqProp1Type === "5" ? Number(row.ReqProp1Value) : 0,
            price: bookPrices.get(itemKey(row.ParticularType, row.Level)) ?? null,
          });
        }
      }
      return {
        id: route.id,
        name: route.name,
        previousName: previousName && previousName !== route.name ? previousName : null,
        skills: Array.from(routeSkills, ([skillId, book]) => {
          const row = skillRows.get(skillId);
          if (!row) throw new Error(`Missing skill ${skillId} in faction ${id}, route ${route.id}`);
          const name = row.SkillName.normalize("NFC");
          const icon = row.SkillIcon.trim().replace(/\//g, "\\").toLowerCase();
          const treeName = route.skills.find(({ id }) => id === skillId)?.name.normalize("NFC");
          const requiredLevel = Math.max(Number(row.ReqLevel), book?.requiredLevel ?? 0);
          return {
            id: skillId,
            name,
            iconUrl: icons[icon] ?? null,
            description: cleanItemText(row.SkillDesc),
            property: cleanItemText(row.Property),
            requiredLevel,
            maxLevel: Number(row.MaxLevel),
            weapon: weapons[row.WeaponLimit] ?? null,
            horseRestriction: horseRestrictions[row.HorseLimit] ?? null,
            attackRadius: Number(row.AttackRadius),
            cooldownSeconds: Math.floor(Number(row.TimePerCast) * 10 / gameFps) / 10,
            rankValues: damageById[skillId] ?? null,
            treeName: treeName && treeName !== name && treeName !== "Kỹ năng cấp 120" ? treeName : null,
            unlockNote: book ? null : requiredLevel === 110 ? "Hoàn thành nhiệm vụ kỹ năng cấp 110 của môn phái."
              : requiredLevel === 120 ? "Có trong cây võ công. Đường học cần kiểm tra trong game."
              : null,
            book,
          } satisfies FactionSkill;
        }).sort((a, b) => Number(!!a.book) - Number(!!b.book) || a.requiredLevel - b.requiredLevel),
      };
    }),
  }));
}
