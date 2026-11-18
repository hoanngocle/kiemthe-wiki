import { localRequest } from "@/lib/local-request";
import { BackupError, decodeBackup, MAX_UPLOAD_BYTES } from "@/lib/database-backup";
import { databaseManager } from "@/lib/database-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: Request) {
  if (!localRequest(request)) return json({ error: "Chỉ cho phép truy cập từ trang quản trị trên máy này." }, 403);
  const id = new URL(request.url).searchParams.get("download");
  if (id) {
    const data = databaseManager.download(id);
    if (!data) return json({ error: "Bản sao lưu chưa sẵn sàng hoặc tác vụ đã thay đổi. Hãy export lại." }, 404);
    const kind = databaseManager.snapshot()?.action === "import" ? "safety" : "export";
    return new Response(new Uint8Array(data), { headers: { "Content-Type": "application/gzip", "Content-Disposition": `attachment; filename="kiemthe-${kind}-${id}.ktdb.gz"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  }
  return json({ job: databaseManager.snapshot() });
}

async function readUpload(request: Request) {
  const length = request.headers.get("content-length");
  if (length && Number(length) > MAX_UPLOAD_BYTES) throw new BackupError("File vượt giới hạn 128 MB.", 413);
  if (!request.body) throw new BackupError("Chưa chọn file sao lưu.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_UPLOAD_BYTES) { await reader.cancel(); throw new BackupError("File vượt giới hạn 128 MB.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  if (!localRequest(request)) return json({ error: "Yêu cầu phải đến từ trang quản trị trên máy này." }, 403);
  try {
    if (databaseManager.snapshot()?.status === "running") throw new BackupError("Đang có tác vụ Database. Vui lòng chờ hoàn tất.", 409);
    const action = new URL(request.url).searchParams.get("action");
    if (action === "export") {
      const result = databaseManager.startExport();
      return json({ jobId: result.id, job: databaseManager.snapshot() }, 202);
    }
    if (action !== "import") throw new BackupError("Thao tác Database không hợp lệ.");
    if (request.headers.get("x-database-confirm") !== "replace-all-five") throw new BackupError("Cần xác nhận thay thế toàn bộ 5 database.");
    if (!request.headers.get("content-type")?.startsWith("application/gzip")) throw new BackupError("Cần gửi gói sao lưu .ktdb.gz.", 415);
    const backup = await decodeBackup(await readUpload(request));
    const result = databaseManager.startImport(backup);
    return json({ jobId: result.id, job: databaseManager.snapshot() }, 202);
  } catch (error) {
    return json({ error: error instanceof BackupError ? error.message : "Không xử lý được yêu cầu Database." }, error instanceof BackupError ? error.status : 503);
  }
}
