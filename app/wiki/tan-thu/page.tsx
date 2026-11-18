import type { Metadata } from "next";
import { AdminShell } from "@/app/components/admin-shell";
import { NewplayerWiki } from "./newplayer-wiki";
import { newplayerSections } from "./newplayer-content";
import "./newplayer-wiki.css";

export const metadata: Metadata = {
  title: "Wiki Tân Thủ · Kiếm Thế",
  description: "Tra cứu chức năng, điều kiện, giá mua và phần thưởng trong menu Tân Thủ.",
};

export default function NewplayerWikiPage() {
  return <AdminShell section="wiki" wikiPage="tan-thu"><NewplayerWiki sections={newplayerSections} /></AdminShell>;
}
