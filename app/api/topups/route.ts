import path from "node:path";
import { readFile } from "node:fs/promises";
import { localRequest } from "@/lib/local-request";
import { listCharacters } from "@/lib/topup-database";
import { queueTopup, readTopups, readTopupHistory, TopupError, validateTopup } from "@/lib/local-topup";
import { parseMilestones, sumTopups } from "@/lib/topup-milestones";
import { readItemCatalog } from "@/lib/item-wiki";

export const runtime = "nodejs";
const root = () => path.resolve(process.cwd(), "..");
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
let iconCache: { at: number; icons: Map<string, string> } | undefined;
async function readRewardIcons() {
  if (iconCache && Date.now() - iconCache.at < 10000) return iconCache.icons;
  try {
    const [catalog, text] = await Promise.all([
      readItemCatalog(path.join(root(), "gameserver/setting/item")),
      readFile(path.resolve(process.cwd(), "public/item-icons/manifest.json"), "utf8"),
    ]);
    const manifest = JSON.parse(text) as { icons: Record<string, string> };
    const icons = new Map<string, string>();
    for (const item of catalog.items) {
      const iconUrl = manifest.icons[item.icon];
      if (iconUrl && !icons.has(item.id)) icons.set(item.id, iconUrl);
    }
    iconCache = { at: Date.now(), icons };
    return icons;
  } catch {
    // Decorative icons must never prevent loading characters or top-up totals.
    return iconCache?.icons ?? new Map<string, string>();
  }
}
function failure(error: unknown) {
  if (error instanceof TopupError) return json({ error: error.message }, error.status);
  const code = (error as NodeJS.ErrnoException | null)?.code;
  if (["ECONNREFUSED", "ETIMEDOUT", "ER_ACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR"].includes(code ?? "")) {
    return json({ error: "Chưa đọc được nhân vật. Kiểm tra MySQL và cấu hình Goddess rồi bấm Làm mới." }, 503);
  }
  return json({ error: "Chưa hoàn tất lượt nạp. Bấm Thử lại lượt này để tiếp tục, tránh tạo lượt mới." }, 503);
}

export async function GET(request: Request) {
  if (!localRequest(request)) return json({ error: "Chỉ cho phép truy cập từ trang admin trên máy này." }, 403);
  try {
    const [characters, receipts, script, icons] = await Promise.all([
      listCharacters(), readTopups(root()),
      readFile(/*turbopackIgnore: true*/ path.join(root(), "gameserver/script/npc/tuiguangyuan.lua"), "utf8"),
      readRewardIcons(),
    ]);
    return json({ characters, totals: sumTopups(receipts), milestones: parseMilestones(script, icons), receipts: await readTopupHistory(root(), receipts) });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  if (!localRequest(request)) return json({ error: "Yêu cầu phải đến từ trang admin trên máy này." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Cần gửi dữ liệu JSON." }, 415);
  let body: unknown;
  try { body = await request.json(); }
  catch { return json({ error: "Dữ liệu JSON không hợp lệ." }, 400); }
  try {
    const input = validateTopup(body);
    const character = (await listCharacters()).find((item) => item.id === input.characterId);
    if (!character) throw new TopupError("Nhân vật không còn trong danh sách. Hãy làm mới trang.", 404);
    return json({ receipt: await queueTopup(root(), character, input) }, 201);
  } catch (error) { return failure(error); }
}
