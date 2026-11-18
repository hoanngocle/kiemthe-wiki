import { readFile } from "node:fs/promises";
import path from "node:path";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { parseDatabaseConfig, readDatabaseConfig } from "./accounts.ts";
import { characterFromRow, type Character } from "./local-topup.ts";

export async function listCharacters(): Promise<Character[]> {
  const config = readDatabaseConfig();
  const goddessIni = await readFile(path.resolve(process.cwd(), "../goddess/kg_goddess.ini"), "utf8");
  // Use the same working MySQL login as the existing admin account page.
  // Goddess supplies the character schema name; its old password can differ.
  const roleConfig = parseDatabaseConfig(goddessIni, "DatabaseServer");
  const connection = await createConnection({ ...config, database: roleConfig.database, charset: "utf8", connectTimeout: 5000, multipleStatements: false });
  try {
    const [rows] = await connection.query<RowDataPacket[]>("SELECT RoleName AS name, Account AS account, HEX(RoleName) AS nameHex, HEX(Account) AS accountHex FROM role WHERE Account IS NOT NULL AND Account <> '' ORDER BY Account, RoleName");
    return rows.map((row) => characterFromRow({ name: String(row.name), account: String(row.account), nameHex: String(row.nameHex), accountHex: String(row.accountHex) }));
  } finally { await connection.end().catch(() => undefined); }
}
