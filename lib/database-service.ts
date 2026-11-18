import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { access, mkdir, readdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { readDatabaseConfig } from "./accounts";
import { BackupError, DatabaseBackupManager, DATABASES, MAX_BACKUP_BYTES, type DatabaseDump } from "./database-backup";
import { serverManager } from "./windows-runtime";
import { assertPacketLimit, withDatabaseDeadline } from "./database-guards";

type Tools = { mysql: string; dump: string };
const backupDirectory = path.resolve(process.cwd(), ".database-backups");

async function installedTools(version: string): Promise<Tools> {
  const explicit = { mysql: process.env.MYSQL_CLIENT_PATH, dump: process.env.MYSQL_DUMP_PATH };
  if (explicit.mysql || explicit.dump) {
    if (!explicit.mysql || !explicit.dump) throw new BackupError("Cần khai báo cả MYSQL_CLIENT_PATH và MYSQL_DUMP_PATH trong .env.", 503);
    try { await Promise.all([access(explicit.mysql), access(explicit.dump)]); }
    catch { throw new BackupError("Không tìm thấy công cụ MySQL theo đường dẫn trong .env.", 503); }
    return { mysql: explicit.mysql, dump: explicit.dump };
  }
  const family = version.match(/^(\d+\.\d+)/)?.[1];
  const roots = [...new Set([process.env.ProgramFiles, process.env["ProgramFiles(x86)"], "C:\\Program Files"].filter((value): value is string => Boolean(value)))];
  const bins: { version: number; bin: string; name: string }[] = [];
  for (const root of roots) {
    const folders = await readdir(path.join(root, "MySQL"), { withFileTypes: true }).catch(() => []);
    for (const folder of folders.filter((entry) => entry.isDirectory())) {
      const match = folder.name.match(/^MySQL Server (\d+)\.(\d+)/);
      if (match) bins.push({ version: Number(match[1]) * 100 + Number(match[2]), bin: path.join(root, "MySQL", folder.name, "bin"), name: folder.name });
    }
  }
  // Old 5.5 mysqldump is needed for old game schemas; restoration uses a modern
  // client because 5.5 mysql has no --binary-mode to disable local commands.
  for (const source of bins.filter((entry) => entry.name === `MySQL Server ${family}`)) {
    for (const client of bins.filter((entry) => entry.version >= 506).sort((a, b) => b.version - a.version)) {
      const tools = { mysql: path.join(client.bin, "mysql.exe"), dump: path.join(source.bin, "mysqldump.exe") };
      try { await Promise.all([access(tools.mysql), access(tools.dump)]); return tools; } catch { /* Try the next installation. */ }
    }
  }
  throw new BackupError(`Không tìm thấy công cụ MySQL ${family ?? "phù hợp"}. Khai báo MYSQL_CLIENT_PATH và MYSQL_DUMP_PATH trong .env.`, 503);
}

// No shell and no password in command arguments. Never return raw MySQL stderr
// (which can include restored SQL/account records) to the browser.
async function runTool(file: string, args: string[], input?: string): Promise<Buffer> {
  const config = readDatabaseConfig();
  return new Promise((resolve, reject) => {
    const child = spawn(file, ["--no-defaults", `--host=${config.host}`, `--port=${config.port}`, `--user=${config.user}`, "--default-character-set=utf8", "--max-allowed-packet=1073741824", ...args], {
      // MySQL 8 reads .mylogin.cnf even with --no-defaults. A random nonexistent
      // login file ensures .env is the only credential source for every tool.
      windowsHide: true, shell: false, env: { ...process.env, MYSQL_PWD: config.password, MYSQL_TEST_LOGIN_FILE: path.join(tmpdir(), `kiemthe-no-login-${randomUUID()}`) }, stdio: ["pipe", "pipe", "pipe"],
    });
    const chunks: Buffer[] = [];
    let length = 0;
    let stderr = "";
    let failure: string | null = null;
    const timer = setTimeout(() => { failure = "Công cụ MySQL đã quá thời gian 10 phút."; child.kill(); }, 10 * 60_000);
    child.stdout.on("data", (chunk: Buffer) => {
      length += chunk.length;
      if (length > MAX_BACKUP_BYTES) { failure = "Dữ liệu SQL vượt giới hạn 512 MB."; child.kill(); }
      else chunks.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => { if (stderr.length < 65536) stderr += chunk.toString("utf8"); });
    child.stdin.on("error", () => { failure ??= "Không gửi được dữ liệu tới MySQL."; });
    child.on("error", () => { clearTimeout(timer); reject(new BackupError("Không chạy được công cụ MySQL. Kiểm tra đường dẫn và quyền truy cập.", 503)); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failure || code !== 0) {
        const number = stderr.match(/(?:ERROR|Error:)\s*(\d+)/)?.[1];
        reject(new BackupError(failure ?? `Công cụ MySQL thất bại${number ? ` (mã ${number})` : ""}. Kiểm tra quyền MySQL, cấu hình .env và dung lượng ổ đĩa.`, 503));
      } else resolve(Buffer.concat(chunks));
    });
    child.stdin.end(input);
  });
}

async function connect() {
  return createConnection({ ...readDatabaseConfig(), database: undefined, charset: "utf8", connectTimeout: 5000, multipleStatements: false });
}

async function capture(allowMissing: boolean): Promise<DatabaseDump[]> {
  let connection;
  try {
    connection = await connect();
    const [rows] = await connection.query<RowDataPacket[]>("SELECT VERSION() AS version");
    const tools = await installedTools(String(rows[0].version));
    const [schemas] = await connection.query<RowDataPacket[]>("SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA WHERE SCHEMA_NAME IN (?, ?, ?, ?, ?)", [...DATABASES]);
    if (!allowMissing && schemas.length !== DATABASES.length) throw new BackupError("MySQL chưa có đủ 5 database cần sao lưu. Không thay thế dữ liệu.", 503);
    // All five dumps observe the same quiescent dataset, including MyISAM tables.
    // Individual dumps skip table locks because this connection holds the global lock.
    const lockConnection = connection;
    await withDatabaseDeadline(() => lockConnection.query("FLUSH TABLES WITH READ LOCK"), () => lockConnection.destroy());
    const dumps: DatabaseDump[] = [];
    let size = 0;
    for (const name of DATABASES) {
      if (!schemas.some((schema) => schema.name === name)) {
        // Record absence in a safety backup too. A previous interrupted import
        // may have dropped a schema; this must not prevent restoring a good backup.
        dumps.push({ name, sql: `-- Database ${name} was absent before import.\nDROP DATABASE IF EXISTS \`${name}\`;\n` });
        continue;
      }
      const sql = await runTool(tools.dump, ["--skip-lock-tables", "--hex-blob", "--routines", "--events", "--triggers", "--add-drop-database", "--databases", name]);
      size += sql.length;
      if (size > MAX_BACKUP_BYTES) throw new BackupError("Tổng dữ liệu SQL vượt giới hạn 512 MB.");
      dumps.push({ name, sql: sql.toString("utf8") });
    }
    return dumps;
  } catch (error) {
    if (error instanceof BackupError) throw error;
    if (error instanceof Error && error.message.includes("thời gian")) throw new BackupError(error.message, 503);
    throw new BackupError("Không sao lưu được MySQL. Kiểm tra .env, đủ 5 database và quyền RELOAD/SELECT/SHOW VIEW/TRIGGER/EVENT của tài khoản MySQL.", 503);
  } finally {
    // Closing releases the global read lock even on dump failure.
    await connection?.end().catch(() => undefined);
  }
}

async function preflight(databases: DatabaseDump[]) {
  let connection;
  try {
    connection = await connect();
    const active = connection;
    const [rows] = await withDatabaseDeadline(() => active.query<RowDataPacket[]>("SELECT VERSION() AS version, @@max_allowed_packet AS packetLimit"), () => active.destroy());
    assertPacketLimit(databases, Number(rows[0].packetLimit));
    const tools = await installedTools(String(rows[0].version));
    await runTool(tools.mysql, ["--binary-mode", "--batch", "--local-infile=0", "--execute=SELECT 1"]);
  } catch (error) {
    if (error instanceof Error && (error instanceof BackupError || error.message.includes("max_allowed_packet") || error.message.includes("thời gian"))) throw error;
    throw new BackupError("Không kiểm tra được công cụ import và giới hạn MySQL. Chưa thay thế dữ liệu.", 503);
  } finally { await connection?.end().catch(() => undefined); }
}

async function restore(database: DatabaseDump) {
  let connection;
  try {
    connection = await connect();
    const [rows] = await connection.query<RowDataPacket[]>("SELECT VERSION() AS version");
    const tools = await installedTools(String(rows[0].version));
    await connection.end();
    connection = undefined;
    // --binary-mode disables mysql client commands such as system/source in input.
    // Do not pass --force: stop immediately on the first SQL error.
    await runTool(tools.mysql, ["--binary-mode", "--batch", "--local-infile=0"], database.sql);
  } catch (error) {
    if (error instanceof BackupError) throw error;
    throw new BackupError(`Không import được ${database.name}. Bản sao lưu trước import được giữ lại.`, 503);
  } finally { await connection?.end().catch(() => undefined); }
}

async function save(data: Buffer, id: string, kind: "export" | "safety") {
  const target = path.join(backupDirectory, `${kind}-${new Date().toISOString().replace(/[:.]/g, "-")}-${id}.ktdb.gz`);
  const temporary = `${target}.partial`;
  try {
    await mkdir(backupDirectory, { recursive: true });
    await writeFile(temporary, data, { flag: "wx", mode: 0o600, flush: true });
    await rename(temporary, target);
    return target;
  } catch {
    await rm(temporary, { force: true }).catch(() => undefined);
    throw new BackupError("Không lưu được bản sao lưu trên ổ đĩa. Chưa import dữ liệu; kiểm tra dung lượng và quyền ghi thư mục .database-backups.", 503);
  }
}

const globals = globalThis as typeof globalThis & { kiemTheDatabaseV1?: DatabaseBackupManager };
export const databaseManager = globals.kiemTheDatabaseV1 ??= new DatabaseBackupManager({ capture, preflight, restore, save, maintenance: (run, requireStopped) => serverManager.withMaintenance(run, requireStopped) });
