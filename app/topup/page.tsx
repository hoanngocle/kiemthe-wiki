"use client";

import { ArrowPathIcon, CircleStackIcon, CubeIcon, GiftIcon, SparklesIcon, StarIcon, TrophyIcon, XMarkIcon } from "@heroicons/react/24/outline";

import "./topup.css";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminShell } from "@/app/components/admin-shell";
import { topupPackages, type Character, type TopupReceipt, type TopupRequest, type TopupMilestone } from "@/lib/topup-types";
import { milestoneProgress } from "@/lib/topup-milestones";

const number = (value: number) => value.toLocaleString("vi-VN");
const time = (value: string) => new Date(value).toLocaleString("vi-VN", { hour12: false, timeZone: "Asia/Ho_Chi_Minh" });
const tierLabel = (amountK: number) => amountK >= 1000 ? `${number(amountK / 1000)} triệu` : `${number(amountK)}K`;
type TopupState = { characters: Character[]; receipts: TopupReceipt[]; totals: Record<string, number>; milestones: TopupMilestone[] };

function newTopupRequestId() {
  // getRandomValues also works on the admin's HTTP hostname.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function RewardIcon({ reward }: { reward: TopupMilestone["rewards"][number] }) {
  const [failed, setFailed] = useState(false);
  const Icon = reward.name === "Kinh nghiệm" ? SparklesIcon
    : reward.name === "Uy Danh" ? TrophyIcon
    : reward.name === "Đồng không khóa" ? CircleStackIcon
    : reward.name.startsWith("Danh Hiệu") ? StarIcon : CubeIcon;
  return <span className="topup-reward-icon" aria-hidden="true">
    {reward.iconUrl && !failed
      // Game icons are small local PNGs; keep the same rendering as the item wiki.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={reward.iconUrl} alt="" width={36} height={36} loading="lazy" onError={() => setFailed(true)} />
      : <Icon className="ui-icon" />}
  </span>;
}

export default function TopupPage() {
  const [data, setData] = useState<TopupState | null>(null);
  const [characterId, setCharacterId] = useState("");
  const [amountK, setAmountK] = useState<number>(topupPackages[0]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [retry, setRetry] = useState<TopupRequest | null>(null);
  const submitting = useRef(false);
  const milestonesDialog = useRef<HTMLDialogElement>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch("/api/topups", { cache: "no-store", signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Không tải được danh sách nhân vật.");
      if (signal?.aborted) return;
      setData(result);
      setCharacterId((current) => result.characters.some((item: Character) => item.id === current) ? current : (result.characters[0]?.id ?? ""));
      setError(null);
    } catch (error) {
      if (!signal?.aborted) { setData(null); setError(error instanceof Error ? error.message : "Không kết nối được với admin."); }
    } finally { if (!signal?.aborted) setLoading(false); }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      void refresh(controller.signal);
      // Retain the exact request through a reload after a lost response.
      try {
        const saved = sessionStorage.getItem("kiemthe-local-topup-pending");
        if (saved) setRetry(JSON.parse(saved));
      } catch { /* Submission reports unavailable tab storage if needed. */ }
    });
    return () => controller.abort();
  }, [refresh]);

  async function submit() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const input = retry ?? { requestId: newTopupRequestId(), characterId, amountK };
      sessionStorage.setItem("kiemthe-local-topup-pending", JSON.stringify(input));
      setRetry(input);
      const response = await fetch("/api/topups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
      const result = await response.json();
      if (!response.ok) {
        if ([400, 403, 404, 409, 415].includes(response.status)) {
          sessionStorage.removeItem("kiemthe-local-topup-pending");
          setRetry(null);
        }
        throw new Error(result.error ?? "Chưa hoàn tất lượt nạp. Hãy thử lại lượt này.");
      }
      const receipt = result.receipt as TopupReceipt;
      setRetry(null);
      sessionStorage.removeItem("kiemthe-local-topup-pending");
      setSuccess(`Đã ghi nạp ${number(receipt.amountK)}K cho ${receipt.character.name}. Vào Sứ giả hoạt động để nhận ${number(receipt.coin)} Đồng và thưởng mốc.`);
      await refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Mất kết nối. Hãy thử lại lượt này."); }
    finally { submitting.current = false; setBusy(false); }
  }

  const selected = data?.characters.find((item) => item.id === characterId);
  const previewK = retry?.amountK ?? amountK;
  const previewCharacter = retry ? data?.characters.find((item) => item.id === retry.characterId) : selected;
  const totalK = data?.totals[characterId] ?? 0;
  const milestones = data?.milestones ?? [];
  const progress = milestoneProgress(milestones, totalK);

  return <AdminShell section="topup" connected={!!data}>
    <div className="page-content topup-page">
      <div className="logs-heading"><div><h1>Nạp</h1></div><button className="secondary-button" disabled={busy || loading} onClick={() => void refresh()}><ArrowPathIcon className="ui-icon" aria-hidden="true" />Làm mới</button></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      {success && <div className="topup-success" role="status">{success}</div>}
      {retry && !busy && <div className="topup-notice" role="status">Có lượt nạp cần hoàn tất. Bấm <strong>Thử lại lượt này</strong>; hệ thống giữ cùng mã lượt để tránh cộng trùng.</div>}
      <div className="topup-grid">
        <section className="topup-card" aria-labelledby="topup-title">
          <div className="section-heading"><h2 id="topup-title">Nạp cho nhân vật</h2></div>
          <form className="topup-form" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
            <label htmlFor="topup-character">Nhân vật nhận</label>
            <select id="topup-character" value={characterId} disabled={busy || loading || !!retry || !data?.characters.length} onChange={(event) => { setCharacterId(event.target.value); setSuccess(null); }}>
              {!data?.characters.length && <option value="">{loading ? "Đang tải nhân vật…" : "Chưa có nhân vật"}</option>}
              {data?.characters.map((character) => <option key={character.id} value={character.id}>{character.name} · {character.account}</option>)}
            </select>
            {data && !data.characters.length && <p className="topup-help">Hãy tạo nhân vật trong game, sau đó bấm Làm mới.</p>}
            <fieldset className="topup-packages" disabled={busy || !!retry}><legend>Gói nạp</legend><div className="topup-package-options">{topupPackages.map((value) => <label key={value} className={`topup-package ${amountK === value ? "selected" : ""}`}><input type="radio" name="amountK" checked={amountK === value} onChange={() => { setAmountK(value); setSuccess(null); }} value={value} /><strong>{value >= 1000 ? `${number(value / 1000)}M` : `${number(value)}K`}</strong></label>)}</div></fieldset>
            <div className="topup-preview"><span>{previewCharacter?.name ?? "Nhân vật đã chọn"} sẽ nhận</span><strong>{number(previewK * 100000)} <small>Đồng không khóa</small></strong><span>+{number(previewK)}K tích lũy thưởng mốc</span></div>
            <button className="launch-button topup-submit" type="submit" disabled={busy || loading || (!retry && !selected)}>{busy ? <><ArrowPathIcon className="ui-icon spinner" aria-hidden="true" />Đang ghi nạp…</> : retry ? "Thử lại lượt này" : "Nạp"}</button>
          </form>
        </section>
        <div className="topup-side">
          <section className="topup-card topup-total" aria-labelledby="total-title">
            <div className="section-heading"><h2 id="total-title">Tổng tích lũy trên web</h2></div>
            <div className="topup-total-body">
              <span>{selected?.name ?? "Chọn nhân vật để xem"}</span>
              <strong className="topup-total-value">{selected ? `${number(totalK * 1000)} ₫` : "—"}</strong>
              <div className="topup-total-meta"><span>Mốc đã đạt</span><strong>{selected ? `${progress.reached} / ${milestones.length}` : "—"}</strong></div>
              {selected && milestones.length > 0 && <><progress className="topup-progress" max={100} value={progress.percent} aria-label="Tiến độ tới mốc tiếp theo" /><p className="topup-help">{progress.nextK === null ? "Đã đạt tất cả các mốc đang mở trên web." : <>Mốc tiếp theo: <strong>{tierLabel(progress.nextK)}</strong> · Còn thiếu <strong>{number(progress.remainingK)}K</strong>.</>}</p></>}
              <button type="button" className="secondary-button topup-rewards-button" aria-haspopup="dialog" aria-controls="topup-milestones-dialog" onClick={() => milestonesDialog.current?.showModal()}><GiftIcon className="ui-icon" aria-hidden="true" />Thưởng nạp tích lũy</button>
            </div>
          </section>
          <aside className="topup-card topup-instructions"><div className="section-heading"><h2>Nhận trong game</h2></div><ol><li>Đăng nhập nhân vật vừa chọn.</li><li>Gặp <strong>Cổ Phong Hà — Sứ giả hoạt động</strong>.</li><li>Chọn <strong>Nhận Đồng Nạp</strong> để rút Đồng.</li><li>Chọn <strong>Nhận Phúc Lợi Nạp</strong>, rồi nhận mốc đã đủ.</li></ol></aside>
        </div>
      </div>
      <dialog ref={milestonesDialog} id="topup-milestones-dialog" className="topup-card topup-milestones" aria-labelledby="milestones-title">
        <div className="section-heading"><div className="topup-modal-title"><h2 id="milestones-title">Thưởng nạp tích lũy</h2><span className="auto-refresh">{milestones.length || "—"} mốc đang mở</span></div><button type="button" className="secondary-button" autoFocus onClick={() => milestonesDialog.current?.close()}><XMarkIcon className="ui-icon" aria-hidden="true" />Đóng</button></div>
        <div className="topup-modal-content">
        {milestones.length ? <div className="topup-table-scroll"><table className="topup-reward-table"><thead><tr><th>Mốc tích lũy</th><th>Phần thưởng</th><th>Tiến độ trên web</th></tr></thead><tbody>{milestones.map((milestone) => {
          const qualified = !!selected && totalK >= milestone.amountK;
          return <tr key={milestone.amountK} className={qualified ? "topup-tier-qualified" : undefined}>
            <th scope="row">{tierLabel(milestone.amountK)}</th>
            <td><ul className="topup-reward-list">{milestone.rewards.map((reward) => <li key={reward.name}><RewardIcon reward={reward} /><span><strong>{number(reward.quantity)}</strong> × {reward.name}</span></li>)}</ul></td>
            <td><span className={`topup-tier-status ${qualified ? "qualified" : ""}`}>{!selected ? "Chọn nhân vật" : qualified ? "Đạt mốc" : `Thiếu ${number(milestone.amountK - totalK)}K`}</span></td>
          </tr>;
        })}</tbody></table></div> : <p className="topup-empty">{loading ? "Đang tải các mốc thưởng…" : "Chưa đọc được bảng thưởng. Bấm Làm mới để thử lại."}</p>}
        </div>
      </dialog>
      <section className="topup-card topup-history" aria-labelledby="history-title"><div className="section-heading"><h2 id="history-title">Lịch sử nạp</h2><span className="auto-refresh">20 lượt gần nhất</span></div>
        {data?.receipts.length ? <div className="topup-table-scroll"><table><thead><tr><th>Thời gian</th><th>Nhân vật</th><th>Gói nạp</th><th>Đồng</th><th>Trạng thái</th></tr></thead><tbody>{data.receipts.map((receipt) => <tr key={receipt.requestId}><td><time dateTime={receipt.createdAt}>{time(receipt.createdAt)}</time></td><td><strong>{receipt.character.name}</strong><small>{receipt.character.account}</small></td><td>{number(receipt.amountK)}K</td><td>{number(receipt.coin)}</td><td><span className="topup-queued">Đã ghi nạp</span></td></tr>)}</tbody></table></div> : <p className="topup-empty">{loading ? "Đang tải lịch sử…" : data ? "Chưa có lượt nạp." : "Lịch sử sẽ hiển thị khi kết nối lại."}</p>}
      </section>
    </div>
  </AdminShell>;
}
