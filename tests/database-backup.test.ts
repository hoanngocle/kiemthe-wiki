import assert from "node:assert/strict";
import { test } from "node:test";
import { gzipSync, gunzipSync } from "node:zlib";
import { DATABASES, encodeBackup, decodeBackup, DatabaseBackupManager, type BackupRuntime } from "../lib/database-backup.ts";

const dumps = () => DATABASES.map((name) => ({ name, sql: `-- ${name}\nCREATE TABLE test (b BLOB); INSERT INTO test VALUES (0x00ff);` }));
type MutableManifest = { version: number; databases: { name: string; sql: string }[] };

test("backup round trips all five SQL dumps without changing binary literals or unicode", async () => {
  const source = dumps();
  source[0].sql += " -- Kiếm Thế";
  assert.deepEqual((await decodeBackup(await encodeBackup(source))).databases, source);
});

test("rejects missing, duplicate, foreign and checksum-corrupt databases before import", async () => {
  const packed = await encodeBackup(dumps());
  for (const change of [
    (p: MutableManifest) => p.databases.pop(),
    (p: MutableManifest) => p.databases[0].name = p.databases[1].name,
    (p: MutableManifest) => p.databases[0].name = "mysql",
    (p: MutableManifest) => p.databases[0].sql += "changed",
    (p: MutableManifest) => p.version = 999,
  ]) {
    const payload = JSON.parse(gunzipSync(packed).toString());
    change(payload);
    await assert.rejects(decodeBackup(gzipSync(JSON.stringify(payload))));
  }
  await assert.rejects(decodeBackup(Buffer.from("invalid")));
});

function fixture() {
  const calls: string[] = [];
  let failCapture = false;
  let failRestore = "";
  let failSave = false;
  let failPreflight = false;
  const captureMissing: boolean[] = [];
  const runtime: BackupRuntime = {
    preflight: async () => { if (failPreflight) throw new Error("packet limit"); },
    maintenance: async (run) => { calls.push("maintenance"); return run(); },
    capture: async (allowMissing) => { captureMissing.push(Boolean(allowMissing)); calls.push("capture"); if (failCapture) throw new Error("capture failed"); return dumps(); },
    save: async () => { calls.push("save"); if (failSave) throw new Error("disk full"); return "C:/backup/safety.ktdb.gz"; },
    restore: async (db) => { calls.push(`restore:${db.name}`); if (db.name === failRestore) throw new Error("restore failed"); },
  };
  return { manager: new DatabaseBackupManager(runtime), calls, captureMissing, setFailPreflight: () => { failPreflight = true; }, setFailCapture: () => { failCapture = true; }, setFailSave: () => { failSave = true; }, setFailRestore: (name: string) => { failRestore = name; } };
}

test("failed import preflight prevents capture and all database replacements", async () => {
  const f = fixture();
  f.setFailPreflight();
  await f.manager.startImport(await decodeBackup(await encodeBackup(dumps()))).completion;
  assert.deepEqual(f.calls, ["maintenance"]);
  assert.equal(f.manager.snapshot()?.status, "failed");
});

test("import saves all current databases before replacing any and reports every result", async () => {
  const f = fixture();
  await f.manager.startImport(await decodeBackup(await encodeBackup(dumps()))).completion;
  assert.deepEqual(f.calls.slice(0, 3), ["maintenance", "capture", "save"]);
  assert.deepEqual(f.captureMissing, [true], "safety backup must represent missing schemas so a partial restore can be recovered");
  assert.deepEqual(f.calls.slice(3), DATABASES.map((name) => `restore:${name}`));
  assert.equal(f.manager.snapshot()?.status, "completed");
  assert.equal(f.manager.snapshot()?.backupPath, "C:/backup/safety.ktdb.gz");
  assert.ok(f.manager.snapshot()?.databases.every((db) => db.status === "completed"));
});

test("backup or disk failure prevents all database replacement", async () => {
  for (const failure of ["capture", "save"]) {
    const f = fixture();
    if (failure === "capture") f.setFailCapture(); else f.setFailSave();
    await f.manager.startImport(await decodeBackup(await encodeBackup(dumps()))).completion;
    assert.equal(f.manager.snapshot()?.status, "failed");
    assert.ok(!f.calls.some((call) => call.startsWith("restore:")));
  }
});

test("partial import stops at first failure and preserves safety backup path", async () => {
  const f = fixture();
  f.setFailRestore(DATABASES[1]);
  await f.manager.startImport(await decodeBackup(await encodeBackup(dumps()))).completion;
  const job = f.manager.snapshot()!;
  assert.equal(job.status, "failed");
  assert.equal(job.databases[0].status, "completed");
  assert.equal(job.databases[1].status, "failed");
  assert.equal(job.databases[2].status, "pending");
  assert.ok(job.backupPath);
});

test("concurrent jobs are rejected and only successful export is downloadable", async () => {
  const f = fixture();
  const first = f.manager.startExport();
  assert.throws(() => f.manager.startExport(), /đang/i);
  await first.completion;
  assert.equal(f.manager.snapshot()?.status, "completed");
  assert.ok(f.manager.download(first.id));
  assert.equal(f.manager.download("wrong-id"), null);
});
