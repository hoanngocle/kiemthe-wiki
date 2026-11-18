"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/app/components/admin-shell";
import type { LauncherState, ServerState, ServerAction } from "@/lib/server-manager";
import { ArrowPathIcon, ArrowUpRightIcon, CubeIcon, DocumentTextIcon, PowerIcon, ServerStackIcon, StopIcon } from "@heroicons/react/24/outline";

function ServerIcon({ game = false }: { game?: boolean }) {
  const Icon = game ? CubeIcon : ServerStackIcon;
  return <Icon className="ui-icon" width={21} height={21} aria-hidden="true" />;
}

const statusLabels: Record<ServerState["status"], string> = {
  running: "Đang chạy", starting: "Đang khởi động", stopping: "Đang tắt", restarting: "Đang restart", stopped: "Chưa bật", missing: "Thiếu file", error: "Thao tác lỗi",
};
const timeOf = (value: string) => new Date(value).toLocaleTimeString("vi-VN", { hour12: false });

export default function Home() {
  const [state, setState] = useState<LauncherState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/servers", { cache: "no-store", signal });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Không đọc được trạng thái server.");
    setState(data as LauncherState);
    setError(null);
    setUpdatedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { await refresh(controller.signal); }
      catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Mất kết nối với trang quản trị.");
      }
      if (!controller.signal.aborted) timer = setTimeout(poll, 2500);
    }
    void poll();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [refresh]);

  async function control(target: string, action: ServerAction = "start") {
    setSubmitting(`${action}:${target}`);
    setError(null);
    try {
      const response = await fetch("/api/servers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target, action }),
      });
      const data = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(data.error ?? "Không thể gửi yêu cầu điều khiển server.");
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Không thể kết nối với máy chủ.");
    } finally { setSubmitting(null); }
  }

  const servers = state?.servers ?? [];
  const running = servers.filter((server) => server.status === "running").length;
  const busy = state?.job?.status === "starting" || submitting !== null;
  const unavailable = !state || error !== null || busy;
  const allRunning = running === 8;
  const operationText = state?.job?.action === "stop" ? "Đang tắt server…" : state?.job?.action === "restart" ? "Đang restart…" : "Đang khởi động…";

  return (
    <AdminShell connected={!!state && !error}>
        <div className="page-content">
          {error && <div className="error-banner" role="alert"><strong>Không thể cập nhật hệ thống</strong><span>{error}</span></div>}

          <section className="launch-panel" aria-label="Điều khiển toàn bộ server">
            <div className="launch-copy">
              <div className="panel-kicker"><span className={`tiny-dot ${busy ? "pulse" : ""}`} />{busy ? "ĐANG XỬ LÝ THAO TÁC" : allRunning ? "HỆ THỐNG ĐANG HOẠT ĐỘNG" : "SẴN SÀNG KHỞI ĐỘNG"}</div>
              <h1>Máy chủ Kiếm Thế.</h1>
              <div className="launch-actions">
                <button className="launch-button" onClick={() => void control("all")} disabled={unavailable || allRunning}>{busy ? <ArrowPathIcon className="ui-icon spinner" aria-hidden="true" /> : <PowerIcon className="ui-icon" aria-hidden="true" />}{busy ? operationText : allRunning ? "Đã bật đủ 8 server" : "Bật tất cả server"}{!busy && !allRunning && <span className="button-arrow"><ArrowUpRightIcon className="ui-icon" aria-hidden="true" /></span>}</button>
                <button className="launch-button stop-all-button" onClick={() => void control("all", "stop")} disabled={unavailable || !servers.some((server) => server.pid !== null)}><PowerIcon className="ui-icon" aria-hidden="true" />Tắt tất cả server</button>
              </div>
            </div>
            <div className="system-preview" aria-hidden="true"><div className="preview-top"><ServerIcon /><span>SERVER CLUSTER</span><span className="preview-led" /></div><div className="preview-number">{String(running).padStart(2, "0")}<span>/ 08</span></div><div className="cluster-bars">{Array.from({ length: 8 }, (_, index) => <span key={index} className={servers[index]?.status === "running" ? "active" : servers[index]?.status === "starting" ? "loading" : ""} />)}</div><div className="preview-caption">TIẾN TRÌNH ĐANG CHẠY</div></div>
          </section>


          <div className="workspace-grid">
            <section className="servers-panel" aria-labelledby="servers-title">
              <div className="section-heading"><h2 id="servers-title">Danh sách server <span>08</span></h2><span className="auto-refresh"><span className={`tiny-dot ${!error && state ? "connected" : ""}`} />Tự động cập nhật</span></div>
              {!state && <div className="loading-state"><ArrowPathIcon className="ui-icon spinner" aria-hidden="true" />{error ? "Đang chờ kết nối lại với Windows…" : "Đang kiểm tra tiến trình Windows…"}</div>}
              <div className="server-list">{servers.map((server) => <div className={`server-row server-row-${server.status}`} key={server.id}><div className="server-identity"><span className="server-order">{String(server.order).padStart(2, "0")}</span><span className={`server-icon ${server.id.startsWith("gs") ? "game-icon" : ""}`}><ServerIcon game={server.id.startsWith("gs")} /></span><div className="server-name"><strong>{server.name}</strong><span title={server.path}>{server.file}</span></div></div><div className="server-state"><span className={`status status-${server.status}`}><span className="tiny-dot" />{statusLabels[server.status]}</span></div><div className="server-pid" aria-label={`PID ${server.name}`}><span>PID</span><strong>{server.pid ?? "—"}</strong></div><div className="server-actions">
                  <button className="row-button" aria-label={`Bật ${server.name}`} disabled={unavailable || server.pid !== null || !server.exists} onClick={() => void control(server.id)}><PowerIcon className="ui-icon ui-icon-sm" aria-hidden="true" /><span>Bật</span></button>
                  <button className="row-button restart-button" aria-label={`Restart ${server.name}`} title={`Tắt rồi bật lại ${server.name}`} disabled={unavailable || server.pid === null || !server.exists} onClick={() => void control(server.id, "restart")}><ArrowPathIcon className="ui-icon ui-icon-sm" aria-hidden="true" /><span>Restart</span></button>
                  <button className="row-button stop-button" aria-label={`Tắt ${server.name}`} title={`Kết thúc tiến trình ${server.name}`} disabled={unavailable || server.pid === null} onClick={() => void control(server.id, "stop")}><StopIcon className="ui-icon ui-icon-sm" aria-hidden="true" /><span>Tắt</span></button>
                </div>{server.error && <p className="row-error">{server.error}</p>}{server.status === "missing" && <p className="row-error">Không tìm thấy {server.path}</p>}</div>)}</div>
            </section>
            <aside className="activity-panel" aria-labelledby="activity-title"><div className="section-heading"><h2 id="activity-title">Nhật ký hoạt động</h2><ArrowUpRightIcon className="ui-icon activity-symbol" aria-hidden="true" /></div><div className="activity-content" role="log" aria-live="polite" aria-relevant="additions">{state?.events.length ? [...state.events].reverse().map((event) => <div className={`activity-item event-${event.level}`} key={event.id}><span className="event-dot" /><div><time dateTime={event.time}>{timeOf(event.time)}</time><p>{event.message}</p></div></div>) : <div className="empty-log"><span className="empty-log-icon"><DocumentTextIcon className="ui-icon ui-icon-lg" aria-hidden="true" /></span><strong>Chưa có hoạt động</strong><p>Nhật ký sẽ xuất hiện khi bạn khởi động server.</p></div>}</div></aside>
          </div>

          {state?.job?.status === "failed" && <div className="job-error" role="alert"><strong>Thao tác chưa hoàn tất</strong><p>{state.job.error}</p><span>Kiểm tra lỗi phía trên rồi thử lại.</span></div>}
          <footer className="page-footer"><span className="root-path" title={state?.root}>THƯ MỤC SERVER <code>{state?.root ?? "Đang xác định…"}</code></span><span aria-live="off">{updatedAt ? `Cập nhật lúc ${timeOf(updatedAt)}` : "Đang kết nối…"}</span></footer>
        </div>
    </AdminShell>
  );
}
