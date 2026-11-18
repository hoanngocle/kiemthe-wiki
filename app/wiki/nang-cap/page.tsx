import type { Metadata } from "next";
import { AdminShell } from "@/app/components/admin-shell";
import { UpgradeWiki } from "./upgrade-wiki";
import { readUpgradeRecipeItems } from "@/lib/upgrade-recipe-items";
import "./upgrade-wiki.css";

export const metadata: Metadata = {
  title: "Wiki Nâng Cấp · Kiếm Thế",
  description: "Tra cứu công thức, nguyên liệu, kết quả và tỷ lệ nâng cấp, gồm hướng dẫn tu luyện Chân Nguyên và Thánh Linh.",
};

export default async function UpgradeWikiPage() {
  const items = await readUpgradeRecipeItems();
  return <AdminShell section="wiki"><UpgradeWiki items={items} /></AdminShell>;
}
