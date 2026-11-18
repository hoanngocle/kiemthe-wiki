"use client";

import { ArrowPathIcon } from "@heroicons/react/24/outline";

import { useEffect, useRef, useState } from "react";
import { AdminShell } from "@/app/components/admin-shell";
import type { LogContent, LogFile } from "@/lib/log-files";
import type { LauncherEvent, StartupJob } from "@/lib/server-manager";

type LogState = { files: LogFile[]; limited: boolean; selected: LogContent | null; fileError: string | null; events: LauncherEvent[]; job: StartupJob | null };
const sizeOf = (size: number) => size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
const dateOf = (value: string) => new Date(value).toLocaleString("vi-VN", { hour12: false });

export default function LogsPage() {
  const [tab, setTab] = useState<"server" | "admin">("server");
  const [data, setData] = useState<LogState | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [source, setSource] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const viewer = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let first = true;
    async function poll() {
      try {
        const response = await fetch(`/api/logs${fileId ? `?file=${encodeURIComponent(fileId)}` : ""}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Không thể đọc log.");
        if (controller.signal.aborted) return;
        setData(result as LogState);
        setError(null);
        setUpdatedAt(new Date().toISOString());
        if (first) setLoading(false);
      } catch (error) {
        if (!controller.signal.aborted) { setError(error instanceof Error ? error.message : "Mất kết nối."); setLoading(false); }
      }
      first = false;
      if (autoRefresh && !controller.signal.aborted) timer = setTimeout(poll, 3000);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [fileId, autoRefresh, refreshKey]);

  useEffect(() => {
    if (autoRefresh && viewer.current) viewer.current.scrollTop = viewer.current.scrollHeight;
  }, [data?.selected?.content, autoRefresh]);

  function selectFile(id: string) {
    if (id === fileId) setRefreshKey((key) => key + 1);
    setFileId(id);
    setLoading(true);
    setError(null);
  }

  const files = (data?.files ?? []).filter((file) => source === "all" || file.source === source);
  const selected = data?.selected;
  const matchesSelection = !fileId || selected?.file.id === fileId;
  const visibleContent = matchesSelection && !loading && !error ? selected : null;
  const sources = [...new Set(data?.files.map((file) => file.source) ?? [])];

  return <AdminShell section="logs" connected={!!data && !error}>
    <div className="page-content logs-page">
      <div className="logs-heading"><div><div className="eyebrow">THEO DÕI HỆ THỐNG</div><h1>Log</h1><p>Xem log server và nhật ký khởi động.</p></div><button className="secondary-button" onClick={() => { setRefreshKey((key) => key + 1); setLoading(true); }}><ArrowPathIcon className="ui-icon" aria-hidden="true" />Làm mới</button></div>
      <div className="log-toolbar"><div className="log-tabs" role="tablist" aria-label="Loại log"><button id="server-log-tab" role="tab" aria-controls="server-log-panel" aria-selected={tab === "server"} className={tab === "server" ? "selected" : ""} onClick={() => setTab("server")}>Log server <span>{data?.files.length ?? "—"}</span></button><button id="admin-log-tab" role="tab" aria-controls="admin-log-panel" aria-selected={tab === "admin"} className={tab === "admin" ? "selected" : ""} onClick={() => setTab("admin")}>Nhật ký admin <span>{data?.events.length ?? "—"}</span></button></div><label className="refresh-toggle"><input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />Tự cập nhật mỗi 3 giây</label></div>
      {error && <div className="error-banner" role="alert"><strong>Không đọc được log</strong><span>{error}</span></div>}

      {tab === "server" ? <section id="server-log-panel" role="tabpanel" aria-labelledby="server-log-tab" className="log-workspace">
        <aside className="log-file-panel"><div className="log-file-heading"><strong>File log</strong><span>{files.length}</span></div><div className="log-source-filter"><label htmlFor="log-source">Nguồn log</label><select id="log-source" value={source} onChange={(event) => {
          const value = event.target.value;
          setSource(value);
          const first = data?.files.find((file) => value === "all" || file.source === value);
          if (first) selectFile(first.id);
        }}><option value="all">Tất cả server</option>{sources.map((name) => <option key={name} value={name}>{name}</option>)}</select></div><div className="log-files">{files.map((file) => <button className={`log-file ${file.id === (fileId ?? selected?.file.id) ? "selected" : ""}`} key={file.id} onClick={() => selectFile(file.id)} aria-pressed={file.id === (fileId ?? selected?.file.id)}><span className="log-file-source">{file.source}<small>{sizeOf(file.size)}</small></span><strong>{file.name}</strong><time dateTime={file.modifiedAt}>{dateOf(file.modifiedAt)}</time></button>)}{!files.length && <div className="log-empty-small">{data ? "Chưa có file log trong thư mục server." : "Đang tìm file log…"}</div>}</div>{data?.limited && <p className="log-limit-note">Hiển thị tối đa 200 file mới nhất.</p>}</aside>
        <div className="log-reader"><header className="log-reader-heading"><div><span className="eyebrow">{visibleContent?.file.source ?? "NỘI DUNG FILE"}</span><h2>{visibleContent?.file.name ?? (loading ? "Đang tải log…" : "Chọn file log")}</h2></div><span className="read-only-badge">CHỈ ĐỌC</span></header>{visibleContent && <div className="log-file-meta"><code>{visibleContent.file.id}</code><span>{visibleContent.encoding} · {sizeOf(visibleContent.file.size)}</span></div>}
          {loading ? <div className="log-reader-empty"><ArrowPathIcon className="ui-icon spinner" aria-hidden="true" />Đang đọc log…</div> : data?.fileError ? <div className="log-reader-empty" role="status">{data.fileError}</div> : visibleContent ? <pre className="log-output" ref={viewer} tabIndex={0} aria-label={`Nội dung ${visibleContent.file.name}`}>{visibleContent.content || "File log đang trống."}</pre> : <div className="log-reader-empty">{error ? "Chưa thể tải nội dung log." : "Chọn một file bên trái để xem nội dung."}</div>}
          <footer className="log-reader-footer"><span>{visibleContent?.truncated ? "Đang hiển thị phần cuối file · tối đa 500 dòng / 128 KB" : "Hiển thị nội dung file log"}</span><span>{visibleContent ? `Sửa lúc ${dateOf(visibleContent.file.modifiedAt)}` : ""}</span></footer>
        </div>
      </section> : <section id="admin-log-panel" role="tabpanel" aria-labelledby="admin-log-tab" className="admin-log-panel"><div className="section-heading"><h2>Nhật ký khởi động server</h2><span className="auto-refresh">{data?.job?.status === "starting" ? "Đang xử lý thao tác" : "60 sự kiện gần nhất"}</span></div><div className="admin-events">{data?.events.length ? [...data.events].reverse().map((event) => <div key={event.id} className={`admin-event event-${event.level}`}><time dateTime={event.time}>{dateOf(event.time)}</time><span className={`event-level level-${event.level}`}>{event.level === "success" ? "Thành công" : event.level === "error" ? "Lỗi" : "Thông tin"}</span><p>{event.message}</p></div>) : <div className="log-reader-empty">Chưa có nhật ký khởi động. Sự kiện sẽ xuất hiện khi bật server từ trang Máy chủ.</div>}</div><div className="list-footer">Nhật ký admin được lưu trong phiên chạy hiện tại; khởi động lại admin sẽ làm mới nhật ký này.</div></section>}
      <footer className="page-footer"><span>GameServer 1–4 dùng chung thư mục log.</span><span>{updatedAt ? `Cập nhật lúc ${dateOf(updatedAt)}` : "Đang kết nối…"}</span></footer>
    </div>
  </AdminShell>;
}
