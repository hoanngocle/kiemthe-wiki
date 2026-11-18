import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import type { RunningProcess } from "./server-manager.ts";

const execFileAsync = promisify(execFile);

export async function stopWindowsProcess(target: RunningProcess): Promise<void> {
  if (process.platform !== "win32") throw new Error("Chỉ có thể tắt server trên Windows.");
  if (!Number.isSafeInteger(target.pid) || target.pid <= 0 || !path.isAbsolute(target.path)) throw new Error("Tiến trình không hợp lệ.");
  const powershell = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const encodedPath = Buffer.from(target.path, "utf8").toString("base64");
  // Hold the process handle and verify its path before closing/terminating it.
  // Paths are passed as base64 data, never interpolated as PowerShell source.
  const script = `
$ErrorActionPreference = 'Stop'
$expected = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPath}'))
try { $target = [Diagnostics.Process]::GetProcessById(${target.pid}) }
catch [ArgumentException] { exit 0 }
try {
  $null = $target.Handle
  if ($target.HasExited) { exit 0 }
  if (-not [String]::Equals($target.MainModule.FileName, $expected, [StringComparison]::OrdinalIgnoreCase)) { throw 'Duong dan tien trinh da thay doi; huy thao tac.' }
  $closing = $target.CloseMainWindow()
  if (-not $closing -or -not $target.WaitForExit(5000)) {
    if (-not $target.HasExited) { $target.Kill() }
  }
  if (-not $target.WaitForExit(5000)) { throw 'Tien trinh chua ket thuc.' }
} finally { $target.Dispose() }
`;
  try {
    await execFileAsync(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 15_000, maxBuffer: 64 * 1024 });
  } catch (error) {
    throw new Error(`Không tắt được PID ${target.pid}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
