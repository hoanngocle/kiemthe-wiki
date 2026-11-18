"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { AdminShell } from "@/app/components/admin-shell";
import { MAX_UPLOAD_BYTES } from "@/lib/database-types";
import type { DatabaseJob } from "@/lib/database-backup";
import "./database.css";

const labels = { pending: "Đang chờ", running: "Đang xử lý", completed: "Hoàn tất", failed: "Lỗi" };

export default function DatabasePage() {
  const [job, setJob] = useState<DatabaseJob | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const autoDownload = useRef<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const busy = sending || job?.status === "running";

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch("/api/database", { cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không đọc được trạng thái Database.");
      if (signal?.aborted) return;
      setJob(data.job);
      setConnected(true);
    } catch (err) {
      if (!signal?.aborted) { setConnected(false); setError(err instanceof Error ? err.message : "Không kết nối được admin."); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const initial = setTimeout(() => { void refresh(controller.signal); }, 0);
    const timer = setInterval(() => { void refresh(controller.signal); }, 2000);
    return () => { controller.abort(); clearTimeout(initial); clearInterval(timer); };
  }, [refresh]);

  useEffect(() => {
    if (job?.status === "completed" && job.action === "export" && autoDownload.current === job.id) {
      autoDownload.current = null;
      const link = document.createElement("a");
      link.href = `/api/database?download=${encodeURIComponent(job.id)}`;
      link.download = "";
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }, [job]);

  async function start(action: "export" | "import") {
    if (busy || (action === "import" && !file)) return;
    setError(null);
    if (action === "import" && file!.size > MAX_UPLOAD_BYTES) { setError("File vượt giới hạn 128 MB."); return; }
    setSending(true);
    dialog.current?.close();
    try {
      const response = await fetch(`/api/database?action=${action}`, action === "import" ? {
        method: "POST", headers: { "Content-Type": "application/gzip", "X-Database-Confirm": "replace-all-five" }, body: file,
      } : { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Không bắt đầu được tác vụ Database.");
      if (action === "export") autoDownload.current = data.jobId;
      setJob(data.job);
    } catch (err) { setError(err instanceof Error ? err.message : "Không kết nối được admin. Hãy làm mới để kiểm tra tác vụ trước khi thử lại."); }
    finally { setSending(false); }
  }

  return <AdminShell section="database" connected={connected}>
    <div className="page-content database-page">
      <div className="page-heading"><div><div className="eyebrow">SAO LƯU & KHÔI PHỤC</div><h1>Database</h1></div><span className="version-tag">5 DATABASE</span></div>
      {error && <div className="database-message database-error" role="alert">{error}<button type="button" onClick={() => { setError(null); void refresh(); }}>Làm mới trạng thái</button></div>}
      <div className="database-grid">
        <section className="database-card"><ArrowDownTrayIcon className="database-symbol" aria-hidden="true" /><h2>Export tất cả</h2><p>Sao lưu đầy đủ cấu trúc và dữ liệu của cả 5 database. Tải về một file <strong>.ktdb.gz</strong> để lưu trữ hoặc chuyển máy.</p><button className="launch-button" disabled={busy || loading || !connected} onClick={() => { void start("export"); }}>Export 5 database</button><small>Dữ liệu MySQL tạm khóa ghi trong lúc export để giữ bản sao đồng bộ.</small></section>
        <section className="database-card"><ArrowUpTrayIcon className="database-symbol" aria-hidden="true" /><h2>Import tất cả</h2><p>Chọn gói đã export để thay thế cả 5 database. Hệ thống tự lưu bản sao dữ liệu hiện tại trước khi import.</p><label className="database-file-label" htmlFor="database-file">Gói sao lưu (.ktdb.gz)</label><input id="database-file" type="file" accept=".gz,.ktdb.gz,application/gzip" disabled={busy} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(null); }}/><button className="launch-button database-import" disabled={busy || loading || !connected || !file} onClick={() => dialog.current?.showModal()}>Import 5 database</button><small>Cần dừng tất cả server game. Tối đa 128 MB nén / 512 MB giải nén.</small></section>
      </div>
      {job && <section className="database-card database-progress" aria-live="polite" aria-busy={busy}>
        <div className="database-progress-heading"><h2>{`${job.action === "export" ? "Export" : "Import"} · ${labels[job.status]}`}</h2>{busy && <span className="database-working">Đang xử lý…</span>}</div>
        {loading ? <p>Đang tải trạng thái…</p> : job && <p>{job.phase}</p>}
        {job?.error && <p className="database-error" role="alert">{job.error}</p>}
        {job?.backupPath && <div className="database-backup-result"><p>{job.action === "import" ? "Bản sao lưu trước import:" : "Bản sao lưu trên máy:"} <code>{job.backupPath}</code></p><a className="database-download" href={`/api/database?download=${encodeURIComponent(job.id)}`} download>{job.action === "import" ? "Tải bản sao lưu trước import" : "Tải gói sao lưu"}</a></div>}
        {job?.action === "import" && <p className="database-note">Nếu import lỗi, hãy giữ server dừng và dùng bản sao lưu trước import để khôi phục. Chỉ bật lại server khi đã import hoàn tất.</p>}
      </section>}
      <dialog ref={dialog} className="database-dialog"><h2>Thay thế cả 5 database?</h2><p>Gói <strong>{file?.name}</strong> sẽ thay thế toàn bộ dữ liệu hiện tại. Hệ thống kiểm tra server đã dừng và lưu đủ bản sao trước khi bắt đầu.</p><p>Hãy lưu dữ liệu game và dừng server trước khi tiếp tục.</p><div><button type="button" onClick={() => dialog.current?.close()}>Hủy</button><button type="button" className="launch-button" disabled={busy} onClick={() => { void start("import"); }}>Sao lưu và import</button></div></dialog>
    </div>
  </AdminShell>;
}
