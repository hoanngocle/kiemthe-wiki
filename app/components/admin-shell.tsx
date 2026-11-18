import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenIcon, ChevronRightIcon, ComputerDesktopIcon, CreditCardIcon, CircleStackIcon, DocumentTextIcon, ServerStackIcon, SparklesIcon, UsersIcon } from "@heroicons/react/24/outline";

export function AdminShell({ children, section = "servers", connected = false, wikiPage = "nang-cap" }: { children: ReactNode; section?: "servers" | "logs" | "accounts" | "wiki" | "topup" | "database"; connected?: boolean; wikiPage?: "tan-thu" | "nang-cap" | "hoat-dong" | "vat-pham" | "nhiem-vu" | "cua-hang" | "moc-nap" | "mon-phai" }) {
  return <div className="shell">
    <aside className="sidebar">
      <Link className="brand" href="/" aria-label="Kiếm Thế Admin"><span className="brand-mark">K<span><SparklesIcon className="ui-icon ui-icon-sm" aria-hidden="true" /></span></span><span className="brand-name">KIẾM THẾ<small>SERVER ADMIN</small></span></Link>
      <div className="nav-label">KHÔNG GIAN QUẢN TRỊ</div>
      <nav className="main-nav" aria-label="Menu quản trị">
        <Link href="/" className={`nav-item ${section === "servers" ? "active" : ""}`} aria-current={section === "servers" ? "page" : undefined}><span className="nav-icon"><ServerStackIcon className="ui-icon" aria-hidden="true" /></span>Máy chủ<span className="nav-count">8</span></Link>
        <Link href="/logs" className={`nav-item ${section === "logs" ? "active" : ""}`} aria-current={section === "logs" ? "page" : undefined}><span className="nav-icon"><DocumentTextIcon className="ui-icon" aria-hidden="true" /></span>Log</Link>
        <Link href="/accounts" className={`nav-item ${section === "accounts" ? "active" : ""}`} aria-current={section === "accounts" ? "page" : undefined}><span className="nav-icon"><UsersIcon className="ui-icon" aria-hidden="true" /></span>Tài khoản</Link>
        <details className={`nav-group ${section === "wiki" ? "nav-group-active" : ""}`} open>
          <summary className="nav-item"><span className="nav-icon"><BookOpenIcon className="ui-icon" aria-hidden="true" /></span>Wiki<ChevronRightIcon className="ui-icon ui-icon-sm nav-chevron" aria-hidden="true" /></summary>
          <nav className="nav-submenu" aria-label="Menu Wiki">
            <Link href="/wiki/tan-thu" className={`nav-subitem ${section === "wiki" && wikiPage === "tan-thu" ? "active" : ""}`} aria-current={section === "wiki" && wikiPage === "tan-thu" ? "page" : undefined}>Tân Thủ</Link>
            <Link href="/wiki/mon-phai" className={`nav-subitem ${section === "wiki" && wikiPage === "mon-phai" ? "active" : ""}`} aria-current={section === "wiki" && wikiPage === "mon-phai" ? "page" : undefined}>Môn Phái</Link>
            <Link href="/wiki/nang-cap" className={`nav-subitem ${section === "wiki" && wikiPage === "nang-cap" ? "active" : ""}`} aria-current={section === "wiki" && wikiPage === "nang-cap" ? "page" : undefined}>Nâng Cấp</Link>
            <Link href="/wiki/vat-pham" className={`nav-subitem ${section === "wiki" && wikiPage === "vat-pham" ? "active" : ""}`} aria-current={section === "wiki" && wikiPage === "vat-pham" ? "page" : undefined}>Vật Phẩm</Link>
            <Link href="/wiki/cua-hang" className={`nav-subitem ${section === "wiki" && wikiPage === "cua-hang" ? "active" : ""}`} aria-current={section === "wiki" && wikiPage === "cua-hang" ? "page" : undefined}>Cửa Hàng</Link>
            <Link href="/wiki/moc-nap" className={`nav-subitem ${section === "wiki" && wikiPage === "moc-nap" ? "active" : ""}`} aria-current={section === "wiki" && wikiPage === "moc-nap" ? "page" : undefined}>Mốc Nạp</Link>
            <Link href="/wiki/nhiem-vu" className={`nav-subitem ${section === "wiki" && wikiPage === "nhiem-vu" ? "active" : ""}`} aria-current={section === "wiki" && wikiPage === "nhiem-vu" ? "page" : undefined}>Nhiệm Vụ</Link>
            <Link href="/wiki/hoat-dong" className={`nav-subitem ${section === "wiki" && wikiPage === "hoat-dong" ? "active" : ""}`} aria-current={section === "wiki" && wikiPage === "hoat-dong" ? "page" : undefined}>Hoạt Động</Link>
          </nav>
        </details>
        <Link href="/topup" className={`nav-item ${section === "topup" ? "active" : ""}`} aria-current={section === "topup" ? "page" : undefined}><span className="nav-icon"><CreditCardIcon className="ui-icon" aria-hidden="true" /></span>Nạp</Link>
        <Link href="/database" className={`nav-item ${section === "database" ? "active" : ""}`} aria-current={section === "database" ? "page" : undefined}><span className="nav-icon"><CircleStackIcon className="ui-icon" aria-hidden="true" /></span>Database<span className="nav-count">5</span></Link>
      </nav>
      <div className="sidebar-bottom"><div className="local-machine"><span className="machine-icon"><ComputerDesktopIcon className="ui-icon" aria-hidden="true" /></span><div>Windows hiện tại<small>127.0.0.1 · Localhost</small></div><span className={`connection-dot ${connected ? "online" : ""}`} /></div></div>
    </aside>
    <main className="main-content"><header className="topbar"><span>Quản trị <span className="breadcrumb-slash">/</span><strong>{section === "database" ? "Database" : section === "topup" ? "Nạp" : section === "wiki" ? <>Wiki <span className="breadcrumb-slash">/</span>{wikiPage === "mon-phai" ? "Môn Phái" : wikiPage === "moc-nap" ? "Mốc Nạp" : wikiPage === "cua-hang" ? "Cửa Hàng" : wikiPage === "tan-thu" ? "Tân Thủ" : wikiPage === "vat-pham" ? "Vật Phẩm" : wikiPage === "hoat-dong" ? "Hoạt Động" : wikiPage === "nhiem-vu" ? "Nhiệm Vụ" : "Nâng Cấp"}</> : section === "accounts" ? "Tài khoản" : section === "logs" ? "Log" : "Máy chủ"}</strong></span></header>{children}</main>
  </div>;
}
