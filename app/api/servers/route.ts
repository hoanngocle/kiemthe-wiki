import { serverManager } from "@/lib/windows-runtime";
import { localRequest } from "@/lib/local-request";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!localRequest(request)) return json({ error: "Chỉ cho phép truy cập từ trang quản trị trên máy này." }, 403);
  try {
    return json(await serverManager.snapshot());
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Không đọc được trạng thái server." }, 503);
  }
}

export async function POST(request: Request) {
  if (!localRequest(request)) return json({ error: "Yêu cầu phải đến từ trang quản trị trên máy này." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Cần gửi dữ liệu JSON." }, 415);
  let target: unknown;
  let action: unknown;
  try {
    const body = await request.json();
    target = body?.target;
    action = body?.action ?? "start";
  } catch {
    return json({ error: "Dữ liệu JSON không hợp lệ." }, 400);
  }
  if (typeof target !== "string") return json({ error: "Chưa chọn server cần bật." }, 400);
  if (action !== "start" && action !== "restart" && action !== "stop") return json({ error: "Thao tác không hợp lệ." }, 400);
  try {
    const result = serverManager.control(target, action);
    // The local, long-lived Node process owns the job, independently of this request.
    return json({ jobId: result.jobId, accepted: result.accepted }, result.accepted ? 202 : 409);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Không thể khởi động server." }, 400);
  }
}
