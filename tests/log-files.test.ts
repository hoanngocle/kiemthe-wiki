import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { listLogFiles, readLogFile } from "../lib/log-files.ts";

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), "kiemthe-logs-"));
  await mkdir(path.join(root, "goddess", "logs", "2026"), { recursive: true });
  return root;
}

test("discovers only files in configured log folders and tolerates absent folders", async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, "goddess", "logs", "2026", "server.log"), "hello");
    await writeFile(path.join(root, "goddess", "logs", "config.ini"), "secret");
    await writeFile(path.join(root, "other.log"), "outside");
    const { files } = await listLogFiles(root);
    assert.equal(files.length, 1);
    assert.equal(files[0].id, "goddess/logs/2026/server.log");
    assert.equal(files[0].source, "Goddess");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rejects traversal, absolute paths and non-log config files", async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, "secret.txt"), "secret");
    await writeFile(path.join(root, "goddess", "logs", "config.ini"), "secret");
    for (const id of ["goddess/logs/../../secret.txt", "../secret.txt", path.join(root, "secret.txt"), "goddess/logs/config.ini"]) {
      await assert.rejects(readLogFile(root, id), /không hợp lệ/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("reads the newest 500 lines without loading an unbounded file", async () => {
  const root = await fixture();
  try {
    const contents = Array.from({ length: 4000 }, (_, i) => `entry-${i} ${"x".repeat(90)}`).join("\n");
    await writeFile(path.join(root, "goddess", "logs", "huge.log"), contents);
    const result = await readLogFile(root, "goddess/logs/huge.log");
    assert.equal(result.truncated, true);
    assert.equal(result.content.split("\n").length, 500);
    assert.match(result.content, /^entry-3500 /);
    assert.match(result.content, /entry-3999 /);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("decodes UTF-16LE logs and retains Vietnamese text", async () => {
  const root = await fixture();
  try {
    await writeFile(path.join(root, "goddess", "logs", "unicode.log"), Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("Khởi động máy chủ\r\nHoàn tất", "utf16le")]));
    const result = await readLogFile(root, "goddess/logs/unicode.log");
    assert.equal(result.content, "Khởi động máy chủ\nHoàn tất");
    assert.equal(result.encoding, "UTF-16LE");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rejects a directory junction escaping the permitted log root", async () => {
  const root = await fixture();
  const outside = await mkdtemp(path.join(tmpdir(), "kiemthe-outside-"));
  try {
    await writeFile(path.join(outside, "private.log"), "private");
    await symlink(outside, path.join(root, "goddess", "logs", "escape"), "junction");
    assert.equal((await listLogFiles(root)).files.length, 0);
    await assert.rejects(readLogFile(root, "goddess/logs/escape/private.log"), /không hợp lệ/);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("reports rotated or missing log files clearly", async () => {
  const root = await fixture();
  try { await assert.rejects(readLogFile(root, "goddess/logs/gone.log"), /không còn tồn tại/); }
  finally { await rm(root, { recursive: true, force: true }); }
});

test("rejects a configured log root redirected to private files within Sever", async () => {
  const root = await fixture();
  try {
    await mkdir(path.join(root, "private"));
    await mkdir(path.join(root, "bishop"));
    await writeFile(path.join(root, "private", "secret.txt"), "private");
    await symlink(path.join(root, "private"), path.join(root, "bishop", "logs"), "junction");
    assert.equal((await listLogFiles(root)).files.length, 0);
    await assert.rejects(readLogFile(root, "bishop/logs/secret.txt"), /không hợp lệ/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("returns a recoverable game-log error so admin activity can still be shown", async () => {
  const root = await fixture();
  try {
    const { readLogView } = await import("../lib/log-files.ts");
    assert.equal(typeof readLogView, "function");
    const result = await readLogView(path.join(root, "unavailable"), null);
    assert.deepEqual(result.files, []);
    assert.equal(result.selected, null);
    assert.ok(result.fileError);
  } finally { await rm(root, { recursive: true, force: true }); }
});
