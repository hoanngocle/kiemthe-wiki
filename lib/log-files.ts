import { open, readdir, realpath, stat } from "node:fs/promises";
import path from "node:path";

const sources = [
  { name: "Goddess", directory: "goddess/logs" },
  { name: "LogServer", directory: "logserver/Logs" },
  { name: "Bishop", directory: "bishop/logs" },
  { name: "GameCenter", directory: "gamecenter/log" },
  { name: "GameServer", directory: "gameserver/log" },
  { name: "Hệ thống", directory: "ErrLog" },
];
const maxBytes = 128 * 1024;
const maxLines = 500;
const extensions = new Set([".log", ".txt", ".err"]);
export type LogFile = { id: string; source: string; name: string; size: number; modifiedAt: string };
export type LogContent = { file: LogFile; content: string; truncated: boolean; encoding: string };

export class LogFileError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

const inside = (parent: string, file: string) => {
  const relative = path.relative(parent, file);
  return relative !== "" && relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const isMissing = (error: unknown) => ["ENOENT", "ENOTDIR"].includes((error as NodeJS.ErrnoException).code ?? "");
const invalid = () => new LogFileError("Đường dẫn file log không hợp lệ.", 400);

export async function listLogFiles(root: string): Promise<{ files: LogFile[]; limited: boolean }> {
  const base = await realpath(root);
  const files: LogFile[] = [];
  let visited = 0;
  let limited = false;
  async function walk(directory: string, source: string, depth: number) {
    if (depth > 8 || visited >= 5000) { limited = true; return; }
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (++visited > 5000) { limited = true; return; }
      if (entry.isSymbolicLink()) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(full, source, depth + 1);
      else if (entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase())) {
        try {
          const info = await stat(full);
          files.push({ id: path.relative(base, full).split(path.sep).join("/"), source, name: entry.name, size: info.size, modifiedAt: info.mtime.toISOString() });
        } catch (error) { if (!isMissing(error)) throw error; }
      }
    }
  }
  for (const source of sources) {
    try {
      // Server logs are external runtime data, never application build assets.
      const expectedDirectory = path.join(/*turbopackIgnore: true*/ base, source.directory);
      const directory = await realpath(/*turbopackIgnore: true*/ expectedDirectory);
      if (inside(base, directory) && path.relative(expectedDirectory, directory) === "") {
        await walk(directory, source.name, 0);
      }
    } catch (error) { if (!isMissing(error)) throw error; }
  }
  files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt) || a.id.localeCompare(b.id));
  return { files: files.slice(0, 200), limited: limited || files.length > 200 };
}

export async function readLogFile(root: string, id: string): Promise<LogContent> {
  if (id.includes("\0") || path.isAbsolute(id) || path.win32.isAbsolute(id) || !extensions.has(path.extname(id).toLowerCase())) throw invalid();
  const base = await realpath(root);
  const full = path.resolve(base, id);
  const source = sources.find((item) => inside(path.join(base, item.directory), full));
  if (!source) throw invalid();
  try {
    const directory = await realpath(path.join(base, source.directory));
    const resolved = await realpath(full);
    if (!inside(base, directory) || path.relative(path.join(base, source.directory), directory) !== "" || !inside(directory, resolved)) throw invalid();
    const handle = await open(resolved, "r");
    try {
      const info = await handle.stat();
      if (!info.isFile()) throw invalid();
      const header = Buffer.alloc(2);
      await handle.read(header, 0, 2, 0);
      const utf16 = header[0] === 0xff && header[1] === 0xfe ? "UTF-16LE" : header[0] === 0xfe && header[1] === 0xff ? "UTF-16BE" : null;
      let start = Math.max(0, info.size - maxBytes);
      if (utf16 && start % 2) start++;
      const buffer = Buffer.alloc(Math.max(0, info.size - start));
      const { bytesRead } = await handle.read(buffer, 0, buffer.length, start);
      let bytes = buffer.subarray(0, bytesRead);
      if (start > 0) {
        const newline = bytes.indexOf(utf16 === "UTF-16LE" ? Buffer.from([10, 0]) : utf16 === "UTF-16BE" ? Buffer.from([0, 10]) : Buffer.from([10]));
        if (newline >= 0) bytes = bytes.subarray(newline + (utf16 ? 2 : 1));
      }
      let text: string;
      let encoding: string = utf16 ?? "UTF-8";
      if (utf16) text = new TextDecoder(utf16).decode(bytes);
      else {
        try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
        catch { text = new TextDecoder("gb18030").decode(bytes); encoding = "GB18030"; }
      }
      const lines = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
      if (lines.at(-1) === "") lines.pop();
      return {
        file: { id: path.relative(base, full).split(path.sep).join("/"), source: source.name, name: path.basename(full), size: info.size, modifiedAt: info.mtime.toISOString() },
        content: lines.slice(-maxLines).join("\n"), truncated: start > 0 || lines.length > maxLines, encoding,
      };
    } finally { await handle.close(); }
  } catch (error) {
    if (isMissing(error)) throw new LogFileError("File log không còn tồn tại. Hãy chọn file khác hoặc tải lại danh sách.", 404);
    throw error;
  }
}

export async function readLogView(root: string, id: string | null): Promise<{ files: LogFile[]; limited: boolean; selected: LogContent | null; fileError: string | null }> {
  let listing: { files: LogFile[]; limited: boolean } = { files: [], limited: false };
  try {
    listing = await listLogFiles(root);
    const selectedId = id ?? listing.files[0]?.id;
    const selected = selectedId ? await readLogFile(root, selectedId) : null;
    return { ...listing, selected, fileError: null };
  } catch (error) {
    if (error instanceof LogFileError && error.status === 400) throw error;
    // Files may be locked by an EXE or rotated. Keep launcher activity available.
    return { ...listing, selected: null, fileError: error instanceof Error ? error.message : "Không thể đọc file log server." };
  }
}
