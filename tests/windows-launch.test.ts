import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
import { launchWindowsProcess } from "../lib/windows-launch.ts";
import { stopWindowsProcess } from "../lib/windows-process.ts";

const execFileAsync = promisify(execFile);

test("launches downloaded legacy servers without a hidden security prompt, preserving their console and working directory", {
  skip: process.platform !== "win32", timeout: 30_000,
}, async () => {
  // Real Win32 console requirement used by Goddess/LogServer; no game data needed.
  const cwd = await mkdtemp(path.join(os.tmpdir(), "kiemthe console ' test "));
  const file = path.join(cwd, "Console probe.exe");
  let pid: number | undefined;
  try {
    const source = path.join(cwd, "Probe.cs");
    await writeFile(source, `using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
class Probe {
  [DllImport("kernel32.dll")] static extern IntPtr GetStdHandle(int id);
  [DllImport("kernel32.dll")] static extern bool GetConsoleScreenBufferInfo(IntPtr h, IntPtr info);
  static int Main() {
    IntPtr info = Marshal.AllocHGlobal(32);
    bool ok = GetConsoleScreenBufferInfo(GetStdHandle(-11), info);
    Marshal.FreeHGlobal(info);
    File.WriteAllText("console-result.txt", ok ? "ready" : "no console");
    if (!ok) return 1;
    Thread.Sleep(20000);
    return 0;
  }
}`);
    const compiler = path.join(process.env.SystemRoot ?? "C:\\Windows", "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
    await execFileAsync(compiler, ["/nologo", "/target:exe", `/out:${file}`, source], { windowsHide: true });
    // ZIP extraction can propagate Mark of the Web to the game executables.
    // ShellExecute then waits for a security prompt hidden behind the launcher.
    await writeFile(`${file}:Zone.Identifier`, "[ZoneTransfer]\r\nZoneId=3\r\n");
    pid = await launchWindowsProcess(file, cwd);
    assert.ok(Number.isSafeInteger(pid) && pid > 0);
    let result = "";
    for (let attempt = 0; attempt < 40; attempt++) {
      try { result = await readFile(path.join(cwd, "console-result.txt"), "utf8"); } catch {}
      if (result) break;
      await setTimeout(100);
    }
    assert.equal(result, "ready", "legacy server needs a real console screen buffer to initialize");
  } finally {
    if (pid) await stopWindowsProcess({ pid, path: file });
    await rm(cwd, { recursive: true, force: true });
  }
});
