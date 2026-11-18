import { createConnection, type Connection, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";
import { AccountError, hashGamePassword, readDatabaseConfig, type Account, type AccountList } from "./accounts.ts";
import { groupAccountCharacters } from "./account-characters.ts";
import { listCharacters } from "./topup-database.ts";

async function connect() {
  const config = readDatabaseConfig();
  return createConnection({ ...config, charset: "utf8", connectTimeout: 5000, multipleStatements: false });
}

const columns = "accid AS id, loginName AS username, LockState AS locked, time AS createdAt";
function accountOf(row: RowDataPacket): Account {
  return { id: Number(row.id), username: String(row.username), locked: Number(row.locked) !== 0, createdAt: row.createdAt ? String(row.createdAt) : null };
}

export async function listAccounts(): Promise<AccountList> {
  const connection = await connect();
  try {
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT ${columns} FROM account ORDER BY accid DESC LIMIT 200`);
    const [counts] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS total FROM account");
    // Include registered accounts beyond the displayed page when checking owners.
    const [names] = await connection.query<RowDataPacket[]>("SELECT loginName FROM account");
    let characterAccounts: AccountList["characterAccounts"] = [];
    let characterError: string | null = null;
    try { characterAccounts = groupAccountCharacters(names.map((row) => String(row.loginName)), await listCharacters()); }
    catch { characterError = "Không tải được danh sách nhân vật. Hãy kiểm tra database nhân vật rồi bấm Làm mới."; }
    return { accounts: rows.map(accountOf), total: Number(counts[0].total), characterAccounts, characterError };
  } finally { await connection.end(); }
}

// A named lock prevents simultaneous admin requests from creating duplicate names,
// including on the original account table, which has no unique username index.
export async function insertAccount(connection: Connection, username: string, password: string): Promise<Account> {
  let locked = false;
  try {
    const [locks] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK('kiemthe-admin:register', 5) AS acquired");
    locked = Number(locks[0].acquired) === 1;
    if (!locked) throw new AccountError("Đang có yêu cầu đăng ký khác. Vui lòng thử lại.", 409);
    const [existing] = await connection.execute<RowDataPacket[]>("SELECT accid FROM account WHERE loginName = ? LIMIT 1", [username]);
    if (existing.length) throw new AccountError("Tên tài khoản đã tồn tại. Vui lòng chọn tên khác.", 409);
    const createdAt = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    const [result] = await connection.execute<ResultSetHeader>("INSERT INTO account (loginName, password_hash, time) VALUES (?, ?, ?)", [username, hashGamePassword(password), createdAt]);
    return { id: result.insertId, username, locked: false, createdAt };
  } finally {
    if (locked) {
      // Closing a failed connection also releases its advisory lock. Never turn
      // an already committed registration into an apparent failure on cleanup.
      await connection.query("SELECT RELEASE_LOCK('kiemthe-admin:register')").catch(() => undefined);
    }
  }
}

export async function registerAccount(username: string, password: string) {
  const connection = await connect();
  try { return await insertAccount(connection, username, password); }
  finally { await connection.end().catch(() => undefined); }
}

export async function deleteAccountById(connection: Connection, id: number) {
  const [result] = await connection.execute<ResultSetHeader>("DELETE FROM account WHERE accid = ? LIMIT 1", [id]);
  if (result.affectedRows === 0) throw new AccountError("Tài khoản không còn tồn tại.", 404);
}

export async function removeAccount(id: number) {
  const connection = await connect();
  try { await deleteAccountById(connection, id); }
  finally { await connection.end().catch(() => undefined); }
}

export async function updateAccountPasswordById(connection: Connection, id: number, password: string) {
  const [result] = await connection.execute<ResultSetHeader>("UPDATE account SET password_hash = ? WHERE accid = ? LIMIT 1", [hashGamePassword(password), id]);
  if (result.affectedRows === 0) {
    // Some MySQL clients report zero affected rows when the hash is unchanged.
    const [existing] = await connection.execute<RowDataPacket[]>("SELECT accid FROM account WHERE accid = ? LIMIT 1", [id]);
    if (!existing.length) throw new AccountError("Tài khoản không còn tồn tại.", 404);
  }
}

export async function changeAccountPassword(id: number, password: string) {
  const connection = await connect();
  try { await updateAccountPasswordById(connection, id, password); }
  finally { await connection.end().catch(() => undefined); }
}

export function accountErrorResponse(error: unknown) {
  if (error instanceof AccountError) return { message: error.message, status: error.status };
  const code = (error as { code?: string } | null)?.code;
  if (code === "ER_DUP_ENTRY") return { message: "Tên tài khoản đã tồn tại. Vui lòng chọn tên khác.", status: 409 };
  if (code === "ER_ACCESS_DENIED_ERROR") return { message: "Không đăng nhập được database. Kiểm tra cấu hình MySQL trong .env của admin.", status: 503 };
  return { message: "Không truy cập được database tài khoản. Kiểm tra MySQL và .env của admin rồi thử lại.", status: 503 };
}
