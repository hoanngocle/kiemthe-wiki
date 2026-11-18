"use client";

import { PhotoIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ItemTooltip, ItemTooltipStat, ItemWikiEntry, ItemAcquisition, ItemClassification } from "@/lib/item-wiki-types";

const elements: Record<number, string> = { 1: "Kim", 2: "Mộc", 3: "Thủy", 4: "Hỏa", 5: "Thổ", [-1]: "Ngẫu nhiên 5 hệ" };
const keyOf = (variant: { source: string; line: number }) => `${variant.source}:${variant.line}`;
const hiddenAcquisitionMaps = new Set([
  "Vân Trung Trấn", "Long Môn Trấn", "Vĩnh Lạc Trấn", "Đạo Hương Thôn", "Thạch Cổ Trấn", "Giang Tân Thôn",
  "Long Tuyền Thôn", "Ba Lăng Huyện", "Biện Kinh Phủ", "Phượng Tường Phủ", "Dương Châu Phủ", "Tương Dương Phủ",
  "Thành Đô Phủ", "Đại Lý Phủ", "Lâm An Phủ", "Tiêu Dao Cốc", "Tần Lăng 1", "Tần Lăng 3",
].map((name) => name.normalize("NFC").toLocaleLowerCase("vi-VN")));

function Stats({ stats }: { stats: ItemTooltipStat[] }) {
  return <div className="item-stats">
    {stats.map((stat, index) => {
      const heading = stats[index - 1]?.section !== stat.section;
      return <div className="item-stat-group" key={`${stat.section}:${index}`}>
        {heading && <h4 className="item-stat-section">{stat.section}</h4>}
        <dl className="item-stat-line">
          <dt>{stat.label}{stat.unlock !== undefined && <small>Mở ở +{stat.unlock}</small>}</dt>
          <dd>{stat.value}</dd>
        </dl>
      </div>;
    })}
  </div>;
}

function TooltipContent({ tooltip }: { tooltip: ItemTooltip }) {
  const stats = tooltip.stats.filter((stat) => !stat.section.startsWith("Cường hóa"));
  return <>
    <strong className="item-tooltip-name">{tooltip.name}</strong>
    <div className="item-tooltip-meta">
      <span>Cấp vật phẩm {tooltip.level}</span>
      {tooltip.quality && <span>{tooltip.quality}</span>}
      {elements[tooltip.series] && <span>Hệ {elements[tooltip.series]}</span>}
    </div>
    {tooltip.requirements.length > 0 && <p className="item-tooltip-requirements">{tooltip.requirements.join(" · ")}</p>}
    {stats.length > 0 && <Stats stats={stats} />}
    {tooltip.description && <p className="item-tooltip-description">{tooltip.description}</p>}
    {!tooltip.description && !stats.length && <p className="item-tooltip-note">Mẫu vật phẩm chưa khai báo chỉ số hoặc mô tả công dụng.</p>}
  </>;
}

function AcquisitionList({ routes }: { routes: ItemAcquisition[] }) {
  return <ul className="item-acquisition">{routes.map((route, index) => {
    const maps = route.maps.filter((name) => !hiddenAcquisitionMaps.has(name.normalize("NFC").replace(/\s+/g, " ").trim().toLocaleLowerCase("vi-VN")));
    return <li key={index}>
    <p>{route.method}{route.targetId && <>{" · "}<a href={`/wiki/vat-pham?q=${encodeURIComponent(route.targetId)}`}>Tra vật phẩm</a></>}</p>
    {route.npc && <p className="item-acquisition-location"><strong>NPC: {route.npc}</strong>{maps.length ? ` · ${maps.join(", ")}` : !route.maps.length ? " · Chưa xác minh bản đồ" : ""}</p>}
    {!route.npc && maps.length > 0 && <p className="item-acquisition-location">Bản đồ: {maps.join(", ")}</p>}
    {route.cost && <p>Nguyên liệu/phí: {route.cost}</p>}
    {route.requirements.length > 0 && <ul className="item-acquisition-requirements">{route.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul>}
    </li>;
  })}</ul>;
}

export function ItemRow({ item }: { item: ItemWikiEntry }) {
  const [selected] = useState(item.selectedVariant);
  const [tooltip, setTooltip] = useState<ItemTooltip>(item.tooltip);
  const [acquisition, setAcquisition] = useState<ItemAcquisition[]>(item.acquisition);
  const [classification, setClassification] = useState<ItemClassification>(item.classification);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [failedIcon, setFailedIcon] = useState(false);
  const [retry, setRetry] = useState(0);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 16, top: 16 });
  const trigger = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tooltipId = useId();
  const variant = item.variants.find((entry) => keyOf(entry) === selected) ?? item.variants[0];
  const sources = acquisition.filter((route) => route.type !== "upgrade");
  const upgrades = acquisition.filter((route) => route.type === "upgrade");

  useEffect(() => {
    if (selected === item.selectedVariant) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const params = new URLSearchParams({ variant: selected });
        const response = await fetch(`/api/wiki/items?${params}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không tải được vật phẩm.");
        if (!controller.signal.aborted) { setTooltip(result.tooltip); setAcquisition(result.acquisition); setClassification(result.classification); }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Không tải được vật phẩm.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void load();
    return () => controller.abort();
  }, [selected, item.selectedVariant, retry]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: Event) => {
      if (!trigger.current?.contains(event.target as Node) && !card.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("pointerdown", dismiss);
    window.addEventListener("keydown", escape);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  function show() {
    clearTimeout(closeTimer.current);
    if (loading || error) return;
    const rect = trigger.current!.getBoundingClientRect();
    const width = Math.min(440, window.innerWidth - 24);
    const height = Math.min(620, window.innerHeight * .78);
    setPosition({ left: Math.max(12, Math.min(rect.right + 12, window.innerWidth - width - 12)),
      top: Math.max(12, Math.min(rect.top, window.innerHeight - height - 12)) });
    setOpen(true);
  }
  function hide() { closeTimer.current = setTimeout(() => setOpen(false), 180); }

  return <tr>
    <th scope="row">
      <button ref={trigger} className="item-identity item-tooltip-trigger" type="button"
        aria-label={`Xem tooltip ${item.name}`} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? tooltipId : undefined}
        onPointerEnter={(event) => { if (event.pointerType === "mouse") show(); }} onPointerLeave={hide}
        onFocus={show} onBlur={(event) => { if (!card.current?.contains(event.relatedTarget)) hide(); }} onClick={show}>
        <span className="item-icon" aria-hidden="true">{item.iconUrl && !failedIcon
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={item.iconUrl} alt="" width="40" height="40" loading="lazy" onError={() => setFailedIcon(true)} />
          : <PhotoIcon className="ui-icon ui-icon-lg item-icon-missing" />}</span>
        <span><strong className="item-name">{item.name}</strong><span className="item-meta">
          <code className="item-id">{variant.id}</code>
          {item.variantCount > 1 && <span>{item.variantCount.toLocaleString("vi-VN")} mã</span>}
          {elements[tooltip.series] && !loading && !error && <span>{elements[tooltip.series]}</span>}
        </span></span>
      </button>
      {!loading && !error && <div className="item-classification"><span>{classification.slotName}</span><span>{classification.familyName}</span>{classification.requiredLevel !== null && <span>Cấp mặc {classification.requiredLevel}</span>}
        {classification.group === "vu-khi" && /^[12],[12],/.test(variant.id) && <a href={`/wiki/vat-pham/${variant.id.replaceAll(",", "-")}`}>Đối chiếu chỉ số</a>}
      </div>}
      {open && createPortal(<div ref={card} id={tooltipId} role="dialog" aria-label={`Tooltip ${tooltip.name}`} className="item-tooltip" style={position}
        onFocus={() => clearTimeout(closeTimer.current)} onBlur={hide}
        onPointerEnter={() => clearTimeout(closeTimer.current)} onPointerLeave={hide}>
        <TooltipContent tooltip={tooltip} />
        <button type="button" className="item-tooltip-close" aria-label="Đóng tooltip" onClick={() => { trigger.current?.focus(); setOpen(false); }}><XMarkIcon className="ui-icon ui-icon-sm" /></button>
      </div>, document.body)}
    </th>
    <td className="item-description" aria-busy={loading}>
      {loading ? <p className="item-tooltip-note">Đang tải cách nhận…</p> : error ? <div role="alert"><p>{error}</p><button type="button" onClick={() => { setError(""); setLoading(true); setRetry((value) => value + 1); }}>Thử lại</button></div>
        : <>{sources.length ? <AcquisitionList routes={sources} /> : <span className="item-no-description">Chưa xác minh được cách nhận.</span>}
          {upgrades.length > 0 && <details className="item-upgrades"><summary>Nâng cấp / Luyện hóa ({upgrades.length})</summary><AcquisitionList routes={upgrades} /></details>}
        </>}
    </td>
  </tr>;
}
