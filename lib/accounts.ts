import { createHash } from "node:crypto";
import type { AccountCharacterGroup } from "./account-characters.ts";

export type Account = { id: number; username: string; locked: boolean; createdAt: string | null };
export type AccountList = { accounts: Account[]; total: number; characterAccounts: AccountCharacterGroup[]; characterError: string | null };

export class AccountError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}

export function validateAccountDeletion(body: unknown): number {
  const id = body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>).id : undefined;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new AccountError("Tài khoản cần xóa không hợp lệ.");
  }
  return id;
}

export function validateRegistration(body: unknown): { username: string; password: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AccountError("Thông tin đăng ký không hợp lệ.");
  const { username, password, confirmPassword } = body as Record<string, unknown>;
  if (typeof username !== "string" || !/^[a-zA-Z0-9_]{3,32}$/.test(username.trim())) {
    throw new AccountError("Tên tài khoản gồm 3–32 ký tự: chữ không dấu, số hoặc dấu gạch dưới.");
  }
  return { username: username.trim().toLowerCase(), password: validatePassword(password, confirmPassword) };
}

function validatePassword(password: unknown, confirmPassword: unknown): string {
  if (typeof password !== "string" || !/^[\x20-\x7e]{6,32}$/.test(password) || !password.trim()) {
    throw new AccountError("Mật khẩu gồm 6–32 ký tự không dấu.");
  }
  if (password !== confirmPassword) throw new AccountError("Mật khẩu nhập lại chưa khớp.");
  return password;
}

export function validatePasswordChange(body: unknown): { id: number; password: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new AccountError("Thông tin đổi mật khẩu không hợp lệ.");
  const { id, password, confirmPassword } = body as Record<string, unknown>;
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new AccountError("Tài khoản không hợp lệ.");
  }
  return { id, password: validatePassword(password, confirmPassword) };
}

// Paysys expects the existing game's MD5 representation.
export function hashGamePassword(password: string) {
  return createHash("md5").update(password, "utf8").digest("hex");
}

export function readDatabaseConfig(env: Record<string, string | undefined> = process.env) {
  const host = env.DB_HOST?.trim();
  const user = env.DB_USER?.trim();
  const database = env.DB_NAME?.trim();
  const password = env.DB_PASSWORD;
  const port = Number(env.DB_PORT ?? "3306");
  if (!host || !user || !database || password === undefined || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AccountError("Cấu hình MySQL trong .env của admin chưa hợp lệ.", 503);
  }
  return { host, user, password, database, port };
}

export function parseDatabaseConfig(contents: string, sectionName = "database") {
  let section = "";
  const values: Record<string, string> = {};
  for (const raw of contents.replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || /^[;#]/.test(line)) continue;
    const heading = line.match(/^\[([^\]]+)\]$/);
    if (heading) { section = heading[1].toLowerCase(); continue; }
    const separator = line.indexOf("=");
    if (section === sectionName.toLowerCase() && separator > 0) values[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  const port = Number(values.port ?? "3306");
  if (!values.server || !values.username || !values.database || values.password === undefined || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new AccountError("Cấu hình database trong file INI chưa hợp lệ.", 503);
  }
  return { host: values.server, user: values.username, password: values.password, database: values.database, port };
}
