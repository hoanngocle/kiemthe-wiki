import type { Metadata } from "next";
import { connection } from "next/server";
import path from "node:path";
import { AdminShell } from "@/app/components/admin-shell";
import { loadFactionCatalog } from "@/lib/faction-wiki";
import { FactionWiki } from "./faction-wiki";
import "./faction-wiki.css";

export const metadata: Metadata = {
  title: "Wiki Môn Phái · Kiếm Thế",
  description: "Hai nhánh võ công của từng môn phái, cùng mô tả và điều kiện học, thi triển kỹ năng.",
};

export default async function FactionWikiPage() {
  await connection();
  const factions = await loadFactionCatalog(path.resolve(process.cwd(), "../gameserver"));
  return <AdminShell section="wiki" wikiPage="mon-phai"><FactionWiki factions={factions} /></AdminShell>;
}
