import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { topupPackages, type Character, type TopupRequest, type TopupReceipt } from "./topup-types.ts";
export { topupPackages, type Character, type TopupRequest, type TopupReceipt } from "./topup-types.ts";
export class TopupError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const identityPattern = /^(?:[0-9A-F]{2}){1,32}-(?:[0-9A-F]{2}){1,32}$/;
const requestPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const retiredTopupPackages = [50, 100, 300];

export function validateTopup(body: unknown): TopupRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new TopupError("Thông tin nạp không hợp lệ.");
  const { requestId, characterId, amountK } = body as Record<string, unknown>;
  if (typeof requestId !== "string" || !requestPattern.test(requestId)) throw new TopupError("Mã lượt nạp không hợp lệ. Hãy tải lại trang.");
  if (typeof characterId !== "string" || !identityPattern.test(characterId)) throw new TopupError("Hãy chọn một nhân vật trong danh sách.");
  if (typeof amountK !== "number" || ![...topupPackages, ...retiredTopupPackages].includes(amountK)) throw new TopupError("Hãy chọn một gói nạp có sẵn.");
  return { requestId, characterId, amountK };
}

// Keep raw database bytes for matching Lua's szAccount/szName, even if a
// legacy latin1 column stores UTF8 text. Display decoding never changes the key.
export function characterFromRow(row: { accountHex: string; nameHex: string; name: string; account: string }): Character {
  const id = `${row.accountHex}-${row.nameHex}`.toUpperCase();
  if (!identityPattern.test(id)) throw new TopupError("Dữ liệu nhân vật không hợp lệ.", 503);
  function label(hex: string, fallback: string) {
    try { return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.from(hex, "hex")); }
    catch { return fallback; }
  }
  return { id, name: label(row.nameHex, row.name), account: label(row.accountHex, row.account) };
}

const journalPath = (root: string) => path.join(/*turbopackIgnore: true*/ root, "admin/.local-topups/receipts.json");
const storageError = () => new TopupError("Không đọc được lịch sử nạp local. Giữ nguyên dữ liệu và kiểm tra thư mục admin/.local-topups.", 503);

export async function readTopups(root: string): Promise<TopupReceipt[]> {
  let text: string;
  try { text = await readFile(/*turbopackIgnore: true*/ journalPath(root), "utf8"); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw storageError();
  }
  try {
    const data = JSON.parse(text);
    if (data.version !== 1 || !Array.isArray(data.receipts)) throw storageError();
    const ids = new Set<string>();
    const totals = new Map<string, number>();
    for (const receipt of data.receipts) {
      validateTopup({ ...receipt, characterId: receipt.character?.id });
      if (typeof receipt.character.name !== "string" || typeof receipt.character.account !== "string" || receipt.coin !== receipt.amountK * 100000 || !Number.isFinite(Date.parse(receipt.createdAt)) || ids.has(receipt.requestId)) throw storageError();
      ids.add(receipt.requestId);
      const total = (totals.get(receipt.character.id) ?? 0) + receipt.amountK;
      if (total > 1000000) throw storageError();
      totals.set(receipt.character.id, total);
    }
    return data.receipts;
  } catch { throw storageError(); }
}

export async function readTopupHistory(root: string, receipts: TopupReceipt[]): Promise<TopupReceipt[]> {
  // The cutoff only affects the display. The journal still drives totals and retries.
  const file = path.join(/*turbopackIgnore: true*/ root, "admin/.local-topups/history-cleared-at.txt");
  let cutoff = -Infinity;
  try {
    cutoff = Date.parse((await readFile(/*turbopackIgnore: true*/ file, "utf8")).trim());
    if (!Number.isFinite(cutoff)) throw storageError();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw storageError();
  }
  return receipts.filter((receipt) => Date.parse(receipt.createdAt) > cutoff).slice(-20).reverse();
}

async function writeAtomic(file: string, text: string) {
  await mkdir(/*turbopackIgnore: true*/ path.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    const handle = await open(/*turbopackIgnore: true*/ temporary, "wx");
    try { await handle.writeFile(text, "utf8"); await handle.sync(); }
    finally { await handle.close(); }
    await rename(/*turbopackIgnore: true*/ temporary, file);
  } finally { await rm(/*turbopackIgnore: true*/ temporary, { force: true }).catch(() => undefined); }
}

// The existing admin runs as one Node process. Share the serialization queue
// through hot reloads too, so read/modify/write operations cannot lose credits.
const globals = globalThis as typeof globalThis & { localTopupWrites?: Map<string, Promise<unknown>> };
const writes = globals.localTopupWrites ??= new Map();
export async function queueTopup(root: string, character: Character, body: TopupRequest): Promise<TopupReceipt> {
  const input = validateTopup(body);
  if (input.characterId !== character.id) throw new TopupError("Nhân vật được chọn không khớp.");
  const key = path.resolve(root);
  const work = (writes.get(key) ?? Promise.resolve()).catch(() => undefined).then(async () => {
    const receipts = await readTopups(root);
    let receipt = receipts.find((item) => item.requestId === input.requestId);
    if (receipt && (receipt.character.id !== input.characterId || receipt.amountK !== input.amountK)) throw new TopupError("Mã lượt nạp đã được dùng với nhân vật hoặc gói khác.", 409);
    let totalK = receipts.filter((item) => item.character.id === character.id).reduce((sum, item) => sum + item.amountK, 0);
    if (!receipt) {
      // Retired amounts are valid only for history and retrying committed receipts.
      if (!topupPackages.some((value) => value === input.amountK)) throw new TopupError("Hãy chọn một gói nạp có sẵn.");
      totalK += input.amountK;
      if (totalK > 1000000) throw new TopupError("Nhân vật đã đạt giới hạn tích lũy nạp local.");
      receipt = { requestId: input.requestId, character, amountK: input.amountK, coin: input.amountK * 100000, createdAt: new Date().toISOString() };
      receipts.push(receipt);
      // Commit the receipt first. If publication fails, the SAME request ID
      // republishes the cumulative total, without adding another receipt.
      await writeAtomic(journalPath(root), JSON.stringify({ version: 1, receipts }, null, 2) + "\n");
    }
    const bridge = path.join(/*turbopackIgnore: true*/ root, "gameserver/local-topup", `${character.id}.txt`);
    await writeAtomic(bridge, `KTL1\t${character.id}\t${totalK}\n`);
    return receipt;
  });
  writes.set(key, work);
  try { return await work; }
  finally { if (writes.get(key) === work) writes.delete(key); }
}
