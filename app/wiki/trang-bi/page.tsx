import { redirect } from "next/navigation";
import { legacyItemUrl } from "@/lib/item-wiki-urls";

export default async function LegacyItemPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  redirect(legacyItemUrl("trang-bi", await searchParams));
}
