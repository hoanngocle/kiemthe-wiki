import type { Metadata } from "next";
import { connection } from "next/server";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { AdminShell } from "@/app/components/admin-shell";
import { loadShopCatalog } from "@/lib/shop-wiki";
import { ShopWiki } from "./shop-wiki";
import "./shop-wiki.css";

export const metadata: Metadata = {
  title: "Wiki Cửa Hàng · Kiếm Thế",
  description: "Sản phẩm, giá bán và cách kiếm tiền tại các quầy Cửa Hàng VIP.",
};

export default async function ShopWikiPage() {
  await connection();
  const manifest = JSON.parse(await readFile(path.resolve(process.cwd(), "public/item-icons/manifest.json"), "utf8")) as { icons: Record<string, string> };
  const catalog = await loadShopCatalog(path.resolve(process.cwd(), "../gameserver"), manifest.icons);
  return <AdminShell section="wiki" wikiPage="cua-hang"><ShopWiki catalog={catalog} /></AdminShell>;
}
