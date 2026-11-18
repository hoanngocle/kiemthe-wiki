import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function launchWindowsProcess(file: string, cwd: string): Promise<number> {
  if (process.platform !== "win32") throw new Error("Chỉ có thể bật server trên Windows.");
  if (!path.isAbsolute(file) || !path.isAbsolute(cwd)) throw new Error("Đường dẫn server không hợp lệ.");
  const powershell = path.join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
  const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");
  // Goddess and LogServer require a real console screen buffer at startup.
  // Direct Node spawn with windowsHide/ignored stdio removes that console.
  // Start-Process creates a separate console and hides its window instead.
  // Paths remain base64 data so spaces, quotes and PowerShell syntax are safe.
  const script = `
$ErrorActionPreference = 'Stop'
$file = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encode(file)}'))
$cwd = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encode(cwd)}'))
# The selected server is explicitly authorized by the launcher. ZIP extraction
# can mark it as downloaded, making ShellExecute wait on a hidden security UI.
# Only unblock this executable; leave Windows security settings unchanged.
Unblock-File -LiteralPath $file
$child = Start-Process -FilePath $file -WorkingDirectory $cwd -WindowStyle Hidden -PassThru
[Console]::WriteLine($child.Id)
`;
  const { stdout } = await execFileAsync(powershell, ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], {
    windowsHide: true, timeout: 15_000, maxBuffer: 64 * 1024, encoding: "utf8",
  });
  const value = stdout.trim();
  const pid = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error(`Windows không cung cấp PID cho ${path.basename(file)}.`);
  return pid;
}
