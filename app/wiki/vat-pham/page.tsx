import type { Metadata } from "next";
import { AdminShell } from "@/app/components/admin-shell";
import { ItemWiki } from "./item-wiki";
import type { ItemFilters } from "@/lib/item-wiki-types";
import { WeaponGuide } from "./weapon-guide";
import { CosmeticMaterials } from "../trang-bi/special-equipment";
import "./item-wiki.css";
import "../vu-khi/weapon-wiki.css";
import "../trang-bi/equipment-wiki.css";

export const metadata: Metadata = {
  title: "Wiki Vật Phẩm · Kiếm Thế",
  description: "Tra toàn bộ vật phẩm, vũ khí và trang bị theo vị trí, dòng và hệ; xem chỉ số, nguồn nhận và nâng cấp.",
};
export default async function ItemWikiPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const initial = Object.fromEntries(["q", "group", "slot", "family", "series", "page", "size"].flatMap((name) => typeof params[name] === "string" ? [[name, params[name]]] : [])) as ItemFilters & { q?: string; page?: string; size?: string };
  return <AdminShell section="wiki" wikiPage="vat-pham"><ItemWiki key={JSON.stringify(initial)} initial={initial} guides={<>
    <details className="item-guides"><summary>Lộ trình và công thức vũ khí</summary><WeaponGuide /></details>
    <details className="item-guides"><summary>Hướng dẫn luyện hóa ngoại trang</summary><div><CosmeticMaterials /></div></details>
  </>} /></AdminShell>;
}
