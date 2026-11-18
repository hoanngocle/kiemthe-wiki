import path from "node:path";
import { readFile } from "node:fs/promises";
import { localRequest } from "@/lib/local-request";
import { groupItemVariants, searchItems } from "@/lib/item-wiki";
import { toItemWikiEntry } from "@/lib/item-tooltip";
import { loadUnifiedItemCatalog } from "@/lib/item-catalog";
import { filterItemCatalog, itemFacets } from "@/lib/item-classification";
import type { ItemWikiResponse } from "@/lib/item-wiki-types";

export const runtime = "nodejs";
let cached: { at: number; data: Awaited<ReturnType<typeof loadCatalog>> } | undefined;
let pending: ReturnType<typeof loadCatalog> | undefined;

async function loadCatalog() {
  const catalog = await loadUnifiedItemCatalog(path.resolve(process.cwd(), "../gameserver"));
  const acquisition = catalog.acquisition;
  const manifest = JSON.parse(await readFile(path.resolve(process.cwd(), "public/item-icons/manifest.json"), "utf8")) as { icons: Record<string, string> };
  const groups = new Map<string, number>();
  for (const item of catalog.items) {
    item.iconUrl = manifest.icons[item.icon] ?? null;
  }
  const items = groupItemVariants(catalog.items);
  for (const item of items) {
    for (const category of item.categories) {
      groups.set(category, (groups.get(category) ?? 0) + 1);
    }
  }
  return { items, acquisition, categories: [...groups].map(([name, count]) => ({ name, count })) };
}

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!localRequest(request)) return Response.json({ error: "Chỉ cho phép truy cập từ trang quản trị trên máy này." }, { status: 403, headers });
  try {
    const params = new URL(request.url).searchParams;
    if (!cached || Date.now() - cached.at > 30000 || params.get("refresh") === "1") {
      pending ??= loadCatalog();
      try { cached = { at: Date.now(), data: await pending }; }
      finally { pending = undefined; }
    }
    const { items, categories, acquisition } = cached.data;
    const variantKey = params.get("variant");
    if (variantKey) {
      const variant = items.flatMap((item) => item.variants).find((entry) => `${entry.source}:${entry.line}` === variantKey);
      return variant ? Response.json({ tooltip: variant.tooltip, classification: variant.classification, acquisition: (acquisition.get(variant.id) ?? []).filter((route) => !route.series || variant.tooltip.series === -1 || route.series === variant.tooltip.series) }, { headers })
        : Response.json({ error: "Không tìm thấy biến thể vật phẩm." }, { status: 404, headers });
    }
    const filters = Object.fromEntries(["group", "slot", "family", "series", "level", "quality"].map((name) => [name, params.get(name) ?? ""]));
    const result = searchItems(filterItemCatalog(items, filters), { query: (params.get("q") ?? "").slice(0, 300), category: params.get("category") ?? "", page: Number(params.get("page") ?? 1), pageSize: Number(params.get("size") ?? 50) });
    const response: ItemWikiResponse = {
      ...result, categories, facets: itemFacets(items, filters),
      items: result.items.map((item) => toItemWikiEntry(item, acquisition)),
    };
    return Response.json(response, { headers });
  } catch (error) {
    console.error("Cannot read item wiki catalog", error);
    return Response.json({ error: "Không tải được vật phẩm. Vui lòng thử lại." }, { status: 500, headers });
  }
}
