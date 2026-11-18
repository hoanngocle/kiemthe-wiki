import type { Metadata } from "next";
import { AdminShell } from "@/app/components/admin-shell";
import { ActivityWiki } from "./activity-wiki";

export const metadata: Metadata = {
  title: "Wiki Hoạt Động · Kiếm Thế",
  description: "Lịch mở, điều kiện tham gia, cách chơi và phần thưởng các hoạt động Kiếm Thế.",
};

export default function ActivityWikiPage() {
  return <AdminShell section="wiki" wikiPage="hoat-dong"><ActivityWiki /></AdminShell>;
}
