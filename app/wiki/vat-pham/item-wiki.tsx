"use client";

import { ArrowLeftIcon, ArrowRightIcon, ArrowPathIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ItemFilters, ItemWikiResponse } from "@/lib/item-wiki-types";
import { ItemRow } from "./item-row";

const number = (value: number) => value.toLocaleString("vi-VN");

export function ItemWiki({ initial = {}, guides }: { initial?: ItemFilters & { q?: string; page?: string; size?: string }; guides?: ReactNode }) {
  const [query, setQuery] = useState(initial.q ?? "");
  const [filters, setFilters] = useState<ItemFilters>({ group: initial.group, slot: initial.slot, family: initial.family, series: initial.series });
  const [page, setPage] = useState(Math.max(1, Number(initial.page) || 1));
  const [pageSize, setPageSize] = useState([25, 50, 100, 200].includes(Number(initial.size)) ? Number(initial.size) : 50);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<ItemWikiResponse | null>(null);
  const [resultVersion, setResultVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [jump, setJump] = useState("");
  const lastRefresh = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ q: query, ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), page: String(page), size: String(pageSize), ...(revision !== lastRefresh.current ? { refresh: "1" } : {}) });
        lastRefresh.current = revision;
        const response = await fetch(`/api/wiki/items?${params}`, { signal: controller.signal, cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Không tải được vật phẩm.");
        if (!controller.signal.aborted) {
          setData(result); setResultVersion((value) => value + 1); setJump("");
          const visibleParams = new URLSearchParams(params); visibleParams.delete("refresh");
          if (!query) visibleParams.delete("q");
          window.history.replaceState(null, "", `${window.location.pathname}?${visibleParams}${window.location.hash}`);
        }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Không tải được vật phẩm.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, filters, page, pageSize, revision]);

  function changePage(next: number) {
    if (next === page) { setJump(""); return; }
    setLoading(true);
    setPage(next);
  }

  function reset() {
    setLoading(true);
    setQuery("");
    setFilters({});
    setPage(1);
  }

  function refresh() {
    setLoading(true);
    setRevision((value) => value + 1);
  }

  const currentPage = data?.page ?? 1;
  const pages = data?.pages ?? 1;
  const filtered = query || Object.values(filters).some(Boolean);
  function changeFilter(name: keyof ItemFilters, value: string) {
    setLoading(true); setPage(1);
    setFilters((current) => name === "group" ? { group: value }
      : name === "slot" ? { ...current, slot: value, family: "" } : { ...current, [name]: value });
  }
  return <div className="page-content wiki-page item-wiki-page">
    <section className="wiki-intro"><h1>Wiki Vật Phẩm</h1><p>Rê chuột hoặc bấm vào tên/icon để xem tooltip.</p></section>
    <section id="danh-muc" className="item-catalog" aria-label="Danh sách vật phẩm">
      <nav className="item-groups" aria-label="Nhóm vật phẩm">
        <button type="button" aria-pressed={!filters.group} onClick={() => changeFilter("group", "")}>Tất cả</button>
        {(data?.facets.groups ?? [{ value: "vu-khi", label: "Vũ khí" }, { value: "trang-bi", label: "Trang bị" }, { value: "vat-pham", label: "Vật phẩm khác" }]).map((group) => <button type="button" key={group.value} aria-pressed={filters.group === group.value} onClick={() => changeFilter("group", group.value)}>{group.label}{"count" in group && <span>{number(group.count)}</span>}</button>)}
      </nav>
      <div className="wiki-toolbar item-toolbar">
        <label className="wiki-search"><span>Tìm vật phẩm</span><input type="search" value={query} onChange={(event) => { setLoading(true); setQuery(event.target.value); setPage(1); }} placeholder="Tên hoặc mã vật phẩm" /></label>
        <label className="wiki-filter"><span>Vị trí / Loại</span><select value={filters.slot ?? ""} onChange={(event) => changeFilter("slot", event.target.value)}><option value="">Tất cả vị trí / loại</option>{data?.facets.slots.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}</select></label>
        <label className="wiki-filter"><span>Dòng / Bộ</span><select value={filters.family ?? ""} onChange={(event) => changeFilter("family", event.target.value)}><option value="">Tất cả dòng / bộ</option>{data?.facets.families.map((family) => <option key={family.value} value={family.value}>{family.label}</option>)}</select></label>
        <label className="wiki-filter"><span>Hệ</span><select value={filters.series ?? ""} onChange={(event) => changeFilter("series", event.target.value)}><option value="">Tất cả hệ</option>{["Kim", "Mộc", "Thủy", "Hỏa", "Thổ"].map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>
        <label className="item-page-size"><span>Mỗi trang</span><select value={pageSize} onChange={(event) => { setLoading(true); setPageSize(Number(event.target.value)); setPage(1); }}>{[25, 50, 100, 200].map((size) => <option key={size} value={size}>{size}</option>)}</select></label>
        <button className="item-refresh" disabled={loading} onClick={refresh}><ArrowPathIcon className="ui-icon ui-icon-sm" aria-hidden="true" />Làm mới</button>
      </div>
      <div className="item-result-bar">
        <span role="status">{loading ? "Đang tải…" : error ? "" : `${number(data?.total ?? 0)} vật phẩm`}</span>
        {filtered && <button className="item-clear" onClick={reset}>Xóa bộ lọc<XMarkIcon className="ui-icon ui-icon-sm" aria-hidden="true" /></button>}
      </div>
      {error ? <div className="item-error" role="alert"><p>{error}</p><button onClick={refresh}>Thử lại</button></div>
        : data && <div aria-busy={loading} className={loading ? "item-results-loading" : undefined}>
          {data.items.length === 0 ? <p className="item-empty">Không tìm thấy vật phẩm.</p>
            : <table className="item-table">
              <thead><tr><th scope="col">Vật phẩm</th><th scope="col">Cách nhận</th></tr></thead>
              <tbody>{data.items.map((item) => <ItemRow key={`${resultVersion}:${item.key}:${item.selectedVariant}`} item={item} />)}</tbody>
            </table>}
          {pages > 1 && <nav className="item-pagination" aria-label="Phân trang vật phẩm">
            <button disabled={loading || currentPage <= 1} onClick={() => changePage(1)} aria-label="Trang đầu"><ChevronDoubleLeftIcon className="ui-icon ui-icon-sm" aria-hidden="true" /></button>
            <button disabled={loading || currentPage <= 1} onClick={() => changePage(currentPage - 1)}><ArrowLeftIcon className="ui-icon ui-icon-sm" aria-hidden="true" />Trước</button>
            <form onSubmit={(event) => {
              event.preventDefault();
              const next = Math.min(pages, Math.max(1, Number(jump)));
              if (Number.isFinite(next)) changePage(Math.floor(next));
            }}>
              <label>Trang <input type="number" min="1" max={pages} aria-label="Đến trang" value={jump || currentPage} onChange={(event) => setJump(event.target.value)} disabled={loading} /> / {number(pages)}</label>
              <button type="submit" disabled={loading || !jump}>Đi</button>
            </form>
            <button disabled={loading || currentPage >= pages} onClick={() => changePage(currentPage + 1)}>Sau<ArrowRightIcon className="ui-icon ui-icon-sm" aria-hidden="true" /></button>
            <button disabled={loading || currentPage >= pages} onClick={() => changePage(pages)} aria-label="Trang cuối"><ChevronDoubleRightIcon className="ui-icon ui-icon-sm" aria-hidden="true" /></button>
          </nav>}
        </div>}
    </section>
    {guides}
  </div>;
}
