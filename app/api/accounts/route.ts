import { localRequest } from "@/lib/local-request";
import { validateRegistration, validateAccountDeletion, validatePasswordChange } from "@/lib/accounts";
import { listAccounts, registerAccount, removeAccount, changeAccountPassword, accountErrorResponse } from "@/lib/account-database";

export const runtime = "nodejs";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  if (!localRequest(request)) return json({ error: "Chỉ cho phép truy cập từ trang quản trị trên máy này." }, 403);
  try { return json(await listAccounts()); }
  catch (error) { const result = accountErrorResponse(error); return json({ error: result.message }, result.status); }
}

export async function POST(request: Request) {
  if (!localRequest(request)) return json({ error: "Yêu cầu phải đến từ trang quản trị trên máy này." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Cần gửi dữ liệu JSON." }, 415);
  let body: unknown;
  try { body = await request.json(); }
  catch { return json({ error: "Dữ liệu JSON không hợp lệ." }, 400); }
  try {
    const { username, password } = validateRegistration(body);
    return json({ account: await registerAccount(username, password) }, 201);
  } catch (error) { const result = accountErrorResponse(error); return json({ error: result.message }, result.status); }
}

export async function DELETE(request: Request) {
  if (!localRequest(request)) return json({ error: "Yêu cầu phải đến từ trang quản trị trên máy này." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Cần gửi dữ liệu JSON." }, 415);
  let body: unknown;
  try { body = await request.json(); }
  catch { return json({ error: "Dữ liệu JSON không hợp lệ." }, 400); }
  try {
    const id = validateAccountDeletion(body);
    await removeAccount(id);
    return json({ deletedId: id });
  } catch (error) { const result = accountErrorResponse(error); return json({ error: result.message }, result.status); }
}

export async function PATCH(request: Request) {
  if (!localRequest(request)) return json({ error: "Yêu cầu phải đến từ trang quản trị trên máy này." }, 403);
  if (!request.headers.get("content-type")?.includes("application/json")) return json({ error: "Cần gửi dữ liệu JSON." }, 415);
  let body: unknown;
  try { body = await request.json(); }
  catch { return json({ error: "Dữ liệu JSON không hợp lệ." }, 400); }
  try {
    const { id, password } = validatePasswordChange(body);
    await changeAccountPassword(id, password);
    return json({ updatedId: id });
  } catch (error) { const result = accountErrorResponse(error); return json({ error: result.message }, result.status); }
}
