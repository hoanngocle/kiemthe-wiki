import { createHash, randomUUID } from "node:crypto";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

import { DATABASES, MAX_UPLOAD_BYTES, type DatabaseName } from "./database-types.ts";
export { DATABASES, MAX_UPLOAD_BYTES } from "./database-types.ts";
export const MAX_BACKUP_BYTES = 512 * 1024 * 1024;
export type DatabaseDump = { name: DatabaseName; sql: string };
export type BackupPackage = { createdAt: string; databases: DatabaseDump[] };
export class BackupError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
const zip = promisify(gzip);
const unzip = promisify(gunzip);
const checksum = (sql: string) => createHash("sha256").update(sql, "utf8").digest("hex");

export async function encodeBackup(databases: DatabaseDump[]): Promise<Buffer> {
  const json = JSON.stringify({ format: "kiemthe-database", version: 1, createdAt: new Date().toISOString(), databases: databases.map((db) => ({ ...db, sha256: checksum(db.sql) })) });
  if (Buffer.byteLength(json) > MAX_BACKUP_BYTES) throw new BackupError("Bản sao lưu vượt giới hạn 512 MB sau giải nén.");
  const data = await zip(json);
  if (data.length > MAX_UPLOAD_BYTES) throw new BackupError("Gói sao lưu vượt giới hạn 128 MB.");
  // Validate our own manifest as well as uploaded ones.
  await decodeBackup(data);
  return data;
}

export async function decodeBackup(data: Buffer): Promise<BackupPackage> {
  if (data.length > MAX_UPLOAD_BYTES) throw new BackupError("Gói sao lưu vượt giới hạn 128 MB.", 413);
  try {
    const parsed = JSON.parse((await unzip(data, { maxOutputLength: MAX_BACKUP_BYTES })).toString("utf8"));
    if (parsed?.format !== "kiemthe-database" || parsed.version !== 1 || typeof parsed.createdAt !== "string" || !Number.isFinite(Date.parse(parsed.createdAt)) || !Array.isArray(parsed.databases) || parsed.databases.length !== DATABASES.length) throw new Error();
    const names = new Set<string>();
    for (const db of parsed.databases) {
      if (!db || !DATABASES.includes(db.name) || names.has(db.name) || typeof db.sql !== "string" || !db.sql.trim() || db.sha256 !== checksum(db.sql)) throw new Error();
      names.add(db.name);
    }
    return { createdAt: parsed.createdAt, databases: DATABASES.map((name) => {
      const db = parsed.databases.find((item: DatabaseDump) => item.name === name);
      return { name, sql: db.sql };
    }) };
  } catch {
    throw new BackupError("Gói sao lưu không hợp lệ, bị hỏng hoặc không đủ đúng 5 database. Chọn file .ktdb.gz được Export từ menu Database.");
  }
}

export type DatabaseJob = {
  id: string;
  action: "export" | "import";
  status: "running" | "completed" | "failed";
  phase: string;
  startedAt: string;
  finishedAt: string | null;
  backupPath: string | null;
  error: string | null;
  databases: { name: DatabaseName; status: "pending" | "running" | "completed" | "failed" }[];
};
export type BackupRuntime = {
  preflight: (databases: DatabaseDump[]) => Promise<void>;
  maintenance: <T>(run: () => Promise<T>, requireStopped: boolean) => Promise<T>;
  capture: (allowMissing: boolean) => Promise<DatabaseDump[]>;
  save: (data: Buffer, id: string, kind: "export" | "safety") => Promise<string>;
  restore: (database: DatabaseDump) => Promise<void>;
};

export class DatabaseBackupManager {
  private job: DatabaseJob | null = null;
  private archive: Buffer | null = null;
  private runtime: BackupRuntime;
  constructor(runtime: BackupRuntime) { this.runtime = runtime; }
  snapshot(): DatabaseJob | null { return this.job ? structuredClone(this.job) : null; }
  download(id: string): Buffer | null { return this.job?.id === id && this.job.backupPath ? this.archive : null; }
  startExport() { return this.start("export"); }
  startImport(backup: BackupPackage) { return this.start("import", backup); }

  private start(action: "export" | "import", backup?: BackupPackage) {
    if (this.job?.status === "running") throw new BackupError("Đang có tác vụ Database. Vui lòng chờ hoàn tất.", 409);
    const job: DatabaseJob = { id: randomUUID(), action, status: "running", phase: "Đang kiểm tra…", startedAt: new Date().toISOString(), finishedAt: null, backupPath: null, error: null, databases: DATABASES.map((name) => ({ name, status: "pending" })) };
    this.job = job;
    this.archive = null;
    const completion = this.run(job, backup);
    return { id: job.id, completion };
  }

  private async run(job: DatabaseJob, backup?: BackupPackage) {
    try {
      await this.runtime.maintenance(async () => {
        if (backup) await this.runtime.preflight(backup.databases);
        job.phase = job.action === "import" ? "Đang sao lưu dữ liệu hiện tại trước khi import…" : "Đang export đủ 5 database…";
        const captured = await this.runtime.capture(job.action === "import");
        // Ensure the safety backup can itself be restored with current packet limits.
        if (backup) await this.runtime.preflight(captured);
        const data = await encodeBackup(captured);
        job.backupPath = await this.runtime.save(data, job.id, job.action === "export" ? "export" : "safety");
        this.archive = data;
        if (job.action === "import") {
          for (const db of backup!.databases) {
            const state = job.databases.find((item) => item.name === db.name)!;
            state.status = "running";
            job.phase = `Đang import ${db.name}…`;
            try { await this.runtime.restore(db); state.status = "completed"; }
            catch (error) { state.status = "failed"; throw error; }
          }
        } else {
          job.databases.forEach((db) => { db.status = "completed"; });
        }
        job.status = "completed";
        job.phase = job.action === "export" ? "Đã export đủ 5 database." : "Đã import đủ 5 database.";
      }, job.action === "import");
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Tác vụ Database thất bại.";
      job.phase = job.backupPath && job.action === "import" ? "Import chưa hoàn tất. Dữ liệu có thể đã được thay thế một phần; bản sao lưu trước import vẫn được giữ lại." : "Tác vụ đã dừng trước khi thay thế dữ liệu.";
    } finally { job.finishedAt = new Date().toISOString(); }
  }
}
