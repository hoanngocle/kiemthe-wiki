"use client";

import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, PhotoIcon, QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

import Link from "next/link";
import { useRef, useState } from "react";
import { currencyGuides, filterShopProducts, groupShopProducts, isElementEquipmentShop, type ShopCatalog } from "@/lib/shop-wiki-types";

const format = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
const pageSize = 40;
const currencyAnchor = (id: string) => `tien-${id.replaceAll(",", "-")}`;
function productPrice(amount: number | null, options: { amount: number | null }[]) {
  if (amount !== null) return format(amount);
  const prices = [...new Set(options.flatMap((p) => p.amount === null ? [] : [p.amount]))].sort((a, b) => a - b);
  return prices.length > 1 ? prices.map(format).join(" / ") : "Chưa rõ giá";
}

function ItemIcon({ url, name }: { url: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  return <span className="shop-icon">{url && !failed
    // Game icons are exported local PNGs; retain their native pixel appearance.
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt={name ? `Icon ${name}` : ""} width={40} height={40} loading="lazy" onError={() => setFailed(true)} />
    : <span aria-label={name ? "Chưa có icon" : undefined} aria-hidden={!name} role="img"><PhotoIcon className="ui-icon ui-icon-lg" aria-hidden="true" /></span>}</span>;
}

export function ShopWiki({ catalog }: { catalog: ShopCatalog }) {
  const productSection = useRef<HTMLElement>(null);
  const shoppingGuide = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [shop, setShop] = useState(catalog.shops[0]?.id ?? "");
  const [currency, setCurrency] = useState("");
  const [page, setPage] = useState(1);
  const currencies = [...new Map(catalog.products.map((p) => [p.currencyId, p.currency])).entries()];
  const groupedCatalog = groupShopProducts(catalog.products);
  const filtered = groupShopProducts(filterShopProducts(catalog.products, { query, shop, currency }));
  const showSystems = isElementEquipmentShop(shop) || !shop;
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const reset = () => { setQuery(""); setShop(""); setCurrency(""); setPage(1); };

  return <div className="page-content wiki-page shop-wiki">
    <header className="wiki-intro">
      <h1>Wiki Cửa Hàng</h1>
    </header>

    <section aria-labelledby="chon-quay">
      <div className="shop-section-heading"><div><div className="eyebrow">CỬA HÀNG VIP</div><h2 id="chon-quay">Chọn quầy hàng</h2></div><button type="button" className="shop-help-button" aria-label="Hướng dẫn mua sắm" title="Hướng dẫn mua sắm" aria-haspopup="dialog" aria-controls="shop-guide-dialog" onClick={() => shoppingGuide.current?.showModal()}><QuestionMarkCircleIcon className="ui-icon ui-icon-lg" aria-hidden="true" /></button></div>
      <div className="shop-menu" aria-label="18 quầy hàng">{catalog.shops.map((s) => {
        const products = groupedCatalog.filter((p) => p.shopId === s.id);
        const preview = products.find((p) => p.iconUrl);
        return <button className={`shop-menu-card ${shop === s.id ? "is-active" : ""}`} key={s.id} aria-pressed={shop === s.id} onClick={() => { setShop(s.id); setQuery(""); setCurrency(""); setPage(1); productSection.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
          <span className="shop-menu-top"><ItemIcon url={preview?.iconUrl ?? null} name="" /><span className="shop-menu-number">{products.length} sản phẩm</span></span>
          <strong>{s.name}</strong>
        </button>;
      })}</div>
    </section>

    <section aria-labelledby="danh-muc-hang" id="san-pham" ref={productSection}>
      <div className="shop-section-heading"><div><div className="eyebrow">TRA CỨU GIÁ BÁN</div><h2 id="danh-muc-hang">{catalog.shops.find((s) => s.id === shop)?.name ?? "Tất cả sản phẩm"}</h2></div><button className="shop-reset" onClick={reset}>Xóa bộ lọc</button></div>
      <div className="wiki-toolbar shop-toolbar">
        <label className="wiki-search"><span>Tìm sản phẩm, công dụng, tiền hoặc mã vật phẩm</span><input type="search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Ví dụ: phi phong, nguyen bao, 18,1,3103,1…" /></label>

        <label className="wiki-filter"><span>Thanh toán bằng</span><select value={currency} onChange={(e) => { setCurrency(e.target.value); setPage(1); }}><option value="">Tất cả loại tiền</option>{currencies.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
      </div>
      <p className="shop-result" role="status">{format(filtered.length)} / {format(groupedCatalog.length)} sản phẩm{filtered.length > 0 ? ` · Hiển thị ${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)}` : ""}</p>
      {visible.length === 0 ? <div className="wiki-empty"><h3>Không tìm thấy sản phẩm phù hợp</h3><p>Thử tên không dấu hoặc bỏ bớt bộ lọc.</p><button onClick={reset}>Hiện tất cả sản phẩm</button></div> : <>
        <div className="shop-table-wrap" role="region" aria-label="Sản phẩm và giá bán" tabIndex={0}>
          <table className={`shop-table ${showSystems ? "shop-table-systems" : ""}`}><thead><tr><th scope="col">Sản phẩm</th><th scope="col">Giá / 1 món</th><th scope="col">Mô tả ngắn</th><th scope="col">Loại danh vọng</th>{showSystems && <th scope="col">Hệ</th>}</tr></thead><tbody>{visible.map((p) => <tr key={p.key}>
            <th scope="row"><div className="shop-product-name"><ItemIcon url={p.iconUrl} name={p.name} /><div><strong>{p.name}</strong><span className="shop-item-meta">{p.shop}</span></div></div></th>
            <td><strong className="shop-price">{productPrice(p.amount, p.priceOptions)}</strong><span className="shop-item-meta">{p.currency}{p.amount === null && p.priceOptions.length > 1 ? " · Giá cấu hình chưa thống nhất" : ""}</span></td>
            <td>{p.description}</td>
            <td>{p.reputation ?? "—"}</td>
            {showSystems && <td>{p.systems.join(" · ") || "—"}</td>}

          </tr>)}</tbody></table>
        </div>
        <nav className="shop-pagination" aria-label="Phân trang sản phẩm"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}><ArrowLeftIcon className="ui-icon ui-icon-sm" aria-hidden="true" />Trước</button><span>Trang {currentPage} / {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Tiếp<ArrowRightIcon className="ui-icon ui-icon-sm" aria-hidden="true" /></button></nav>
      </>}
    </section>
    <dialog ref={shoppingGuide} id="shop-guide-dialog" className="shop-guide-dialog" aria-labelledby="shop-guide-title">
      <header className="shop-guide-header"><h2 id="shop-guide-title">Hướng dẫn mua sắm</h2><form method="dialog"><button className="shop-help-button" aria-label="Đóng hướng dẫn"><XMarkIcon className="ui-icon" aria-hidden="true" /></button></form></header>
      <div className="shop-guide-body">
        <div className="shop-section-heading"><h3>Tiền kiếm kiểu gì?</h3><Link href="/wiki/hoat-dong">Xem hoạt động <ArrowUpRightIcon className="ui-icon ui-icon-sm" aria-hidden="true" /></Link></div>
        <div className="shop-money-grid">{currencyGuides.map((guide) => <article className="shop-money-card" id={currencyAnchor(guide.id)} key={guide.id}><h4>{guide.name}</h4><p>{guide.summary}</p></article>)}</div>
      </div>
    </dialog>
  </div>;
}
