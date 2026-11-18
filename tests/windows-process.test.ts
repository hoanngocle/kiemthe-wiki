import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { stopWindowsProcess } from "../lib/windows-process.ts";

test("stops a disposable Windows process by its verified PID and path", { skip: process.platform !== "win32", timeout: 25_000 }, async () => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", windowsHide: true });
  await once(child, "spawn");
  const exited = once(child, "exit");
  try {
    assert.ok(child.pid);
    await stopWindowsProcess({ pid: child.pid, path: process.execPath });
    await exited;
    assert.notEqual(child.exitCode, null);
  } finally { if (child.exitCode === null) { child.kill(); await exited; } }
});

test("refuses to stop a process if its executable path does not match", { skip: process.platform !== "win32", timeout: 25_000 }, async () => {
  const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", windowsHide: true });
  await once(child, "spawn");
  const exited = once(child, "exit");
  try {
    assert.ok(child.pid);
    await assert.rejects(stopWindowsProcess({ pid: child.pid, path: path.join(path.dirname(process.execPath), "different.exe") }), /Không tắt được/);
    assert.equal(child.exitCode, null);
  } finally { child.kill(); await exited; }
});
