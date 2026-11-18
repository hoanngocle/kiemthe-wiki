import path from "node:path";
import { localRequest } from "@/lib/local-request";
import { LogFileError, readLogView } from "@/lib/log-files";
import { serverManager } from "@/lib/windows-runtime";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (!localRequest(request)) return Response.json({ error: "Chỉ cho phép truy cập từ trang quản trị trên máy này." }, { status: 403, headers });
  try {
    const root = path.resolve(process.cwd(), "..");
    const id = new URL(request.url).searchParams.get("file");
    return Response.json({ ...await readLogView(root, id), ...serverManager.activity() }, { headers });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Không thể đọc log server." }, { status: error instanceof LogFileError ? error.status : 500, headers });
  }
}
