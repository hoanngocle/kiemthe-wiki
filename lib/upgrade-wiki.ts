import equipment from "../docs/wiki-equipment-audit.json";
import skills from "../docs/wiki-skills-audit.json";
import companions from "../docs/wiki-companions-audit.json";
import zhenyuan from "../docs/wiki-zhenyuan-audit.json";
import thanhLinh from "../docs/wiki-thanh-linh-audit.json";

export type UpgradeStatus = "implemented" | "issues" | "missing" | "fixed";
export type UpgradeRecipe = {
  name: string;
  formula: string;
  result: string;
  chance: string;
  notes: string[];
};
export type UpgradeMenu = {
  id: string;
  title: string;
  summary: string;
  status: UpgradeStatus;
  verdict: string;
  steps: string[];
  recipes: UpgradeRecipe[];
  warnings: string[];
  sources: { path: string; line: number; label: string }[];
};

export const upgradeMenus = [...equipment, ...skills, ...companions, ...zhenyuan, ...thanhLinh] as UpgradeMenu[];

export const upgradeStatusLabels: Record<UpgradeStatus, string> = {
  fixed: "Đã sửa · đã kiểm thử Lua",
  implemented: "Có xử lý trong mã",
  issues: "Phát hiện vấn đề",
  missing: "Chưa đủ dữ liệu",
};

export function normalizeWikiSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}

export function filterUpgradeMenus(menus: UpgradeMenu[], query: string, status: UpgradeStatus | "all") {
  const terms = normalizeWikiSearch(query).trim().split(/\s+/).filter(Boolean);
  return menus.filter((menu) => (status === "all" || menu.status === status)
    && terms.every((term) => normalizeWikiSearch(JSON.stringify(menu)).includes(term)));
}
