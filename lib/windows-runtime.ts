import { access, constants } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";
import { processNames, ServerManager, type RunningProcess, type Runtime } from "./server-manager";
import { stopWindowsProcess } from "./windows-process";
import { launchWindowsProcess } from "./windows-launch";

const execFileAsync = promisify(execFile);
const root = path.resolve(process.cwd(), "..");
const powershell = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
// This query is compiled from a fixed allowlist, never from a request body.
const filter = processNames.map((name) => `Name = '${name}'`).join(" OR ");
const query = `$ErrorActionPreference = 'Stop'; [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); $items = @(Get-CimInstance Win32_Process -Filter "${filter}" | Select-Object ProcessId, ExecutablePath, Name); ConvertTo-Json -InputObject $items -Compress`;

let pendingInventory: Promise<RunningProcess[]> | null = null;

async function readProcesses(): Promise<RunningProcess[]> {
  if (process.platform !== "win32") throw new Error("Hãy chạy trang quản trị trên máy Windows chứa server.");
  try {
    const { stdout } = await execFileAsync(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", query], {
      windowsHide: true, timeout: 15_000, maxBuffer: 1024 * 1024, encoding: "utf8",
    });
    const rows: { ProcessId: number; ExecutablePath: string | null; Name: string }[] = JSON.parse(stdout.trim().replace(/^\uFEFF/, "") || "[]");
    if (!Array.isArray(rows)) throw new Error("Windows trả về danh sách tiến trình không hợp lệ.");
    return rows.map((row) => {
      if (!row.ExecutablePath) throw new Error(`Không đọc được đường dẫn ${row.Name} (PID ${row.ProcessId}). Hãy chạy admin bằng cùng tài khoản/quyền với server.`);
      return { pid: row.ProcessId, path: row.ExecutablePath };
    });
  } catch (error) {
    throw new Error(`Không thể kiểm tra tiến trình Windows: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const runtime: Runtime = {
  platform: process.platform,
  root,
  exists: async (file) => {
    try { await access(file, constants.F_OK); return true; } catch { return false; }
  },
  listProcesses: () => {
    // Concurrent polls share a CIM query; later polls always read fresh state.
    if (!pendingInventory) pendingInventory = readProcesses().finally(() => { pendingInventory = null; });
    return pendingInventory;
  },
  launch: launchWindowsProcess,
  wait: (ms) => setTimeout(ms),
  stop: stopWindowsProcess,
};

// Retain the startup lock and history across dev hot reloads and route requests.
const globals = globalThis as typeof globalThis & { kiemTheLauncher?: ServerManager };
export const serverManager = globals.kiemTheLauncher ??= new ServerManager(runtime);
