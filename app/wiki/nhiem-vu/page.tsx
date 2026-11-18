import type { Metadata } from "next";
import { AdminShell } from "@/app/components/admin-shell";
import catalog from "@/lib/quest-catalog.json";
import type { Quest } from "@/lib/quest-wiki";
import { QuestWiki } from "./quest-wiki";
import "./quest-wiki.css";

export const metadata: Metadata = {
  title: "Wiki Nhiệm Vụ · Kiếm Thế",
  description: "Thưởng gốc và đề xuất theo cấp: Đồng, Bạc, vật phẩm, danh vọng, tinh lực và hoạt lực của từng nhiệm vụ.",
};

export default function QuestWikiPage() {
  return <AdminShell section="wiki" wikiPage="nhiem-vu"><QuestWiki quests={catalog as Quest[]} /></AdminShell>;
}
