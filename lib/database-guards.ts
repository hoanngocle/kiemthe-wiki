import type { DatabaseDump } from "./database-backup.ts";

// Understand the delimiters emitted by mysqldump, including routines/triggers.
// A hex BLOB is twice its binary size; comparing file size or row count is not
// sufficient to know whether the server will accept the resulting INSERT.
export function largestSqlStatementBytes(sql: string): number {
  let delimiter = ";";
  let quote = "";
  let comment: "line" | "block" | "" = "";
  let start = 0;
  let largest = 0;
  const measure = (end: number) => { largest = Math.max(largest, Buffer.byteLength(sql.slice(start, end).trim())); };
  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const next = sql[i + 1];
    if (comment === "line") { if (char === "\n") comment = ""; continue; }
    if (comment === "block") { if (char === "*" && next === "/") { comment = ""; i++; } continue; }
    if (quote) {
      if (char === "\\") { i++; continue; }
      if (char === quote) { if (next === quote) i++; else quote = ""; }
      continue;
    }
    if (i === 0 || sql[i - 1] === "\n") {
      const lineEnd = sql.indexOf("\n", i);
      const end = lineEnd < 0 ? sql.length : lineEnd;
      // Only inspect short lines; the potentially huge INSERT line need not be copied.
      if (end - i < 200) {
        const change = sql.slice(i, end).match(/^[ \t]*DELIMITER[ \t]+(\S+)[ \t]*\r?$/i);
        if (change) { measure(i); delimiter = change[1]; i = end; start = end + 1; continue; }
      }
    }
    if (char === "'" || char === '"' || char === "`") { quote = char; continue; }
    if (char === "/" && next === "*") { comment = "block"; i++; continue; }
    if (char === "#" || (char === "-" && next === "-" && /\s/.test(sql[i + 2] ?? ""))) { comment = "line"; continue; }
    if (sql.startsWith(delimiter, i)) {
      measure(i);
      i += delimiter.length - 1;
      start = i + 1;
    }
  }
  measure(sql.length);
  return largest;
}

export function assertPacketLimit(databases: DatabaseDump[], limit: number) {
  if (!Number.isSafeInteger(limit) || limit <= 1024) throw new Error("Không đọc được max_allowed_packet của MySQL.");
  for (const db of databases) {
    if (largestSqlStatementBytes(db.sql) + 1024 > limit) throw new Error(`Database ${db.name} có câu SQL vượt max_allowed_packet (${limit} byte). Tăng giới hạn MySQL trước khi import; chưa thay thế dữ liệu.`);
  }
}

export async function withDatabaseDeadline<T>(run: () => Promise<T>, destroy: () => void, timeout = 15_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([run(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => { destroy(); reject(new Error("MySQL đã quá thời gian chờ khóa/kết nối (15 giây). Hãy thử lại khi database hết bận.")); }, timeout);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}
