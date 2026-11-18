"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowPathIcon,
  ArrowRightStartOnRectangleIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  BanknotesIcon,
  BookOpenIcon,
  ChevronDownIcon,
  GiftIcon,
  MagnifyingGlassIcon,
  ShieldCheckIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { filterNewplayerSections, type NewplayerSectionInfo } from "@/lib/newplayer-wiki";

type Section = NewplayerSectionInfo & { content: ReactNode };

const sectionIcons: Record<string, typeof BookOpenIcon> = {
  "tra-cuu-nhanh": BookOpenIcon,
  "tien-hanh-chuyen-sinh": ArrowPathIcon,
  "mua-kim-nguyen-bao-ai": BanknotesIcon,
  "nhan-lai-tui-tan-thu": GiftIcon,
  "nhan-lenh-bai-admin": ShieldCheckIcon,
  "tieu-huy-ao-cu": TrashIcon,
  "lan-toi-ta-quay-lai": ArrowRightStartOnRectangleIcon,
};

export function NewplayerWiki({ sections }: { sections: Section[] }) {
  const [query, setQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set());
  const visible = filterNewplayerSections(sections, query);

  function openSection(id: string) {
    setExpandedSections((current) => new Set(current).add(id));
  }

  useEffect(() => {
    function openLinkedSection() {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (sections.some((section) => section.id === id)) {
        setExpandedSections((current) => new Set(current).add(id));
      }
    }
    const frame = window.requestAnimationFrame(openLinkedSection);
    window.addEventListener("hashchange", openLinkedSection);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openLinkedSection);
    };
  }, [sections]);

  return <div className="page-content wiki-page newplayer-wiki" id="dau-trang">
    <header className="wiki-intro">
      <h1>Wiki Tân Thủ</h1>
    </header>
    <div className="wiki-toolbar">
      <label className="wiki-search"><span>Tìm kiếm</span><span className="newplayer-search-input"><MagnifyingGlassIcon className="newplayer-icon" aria-hidden="true" /><input type="search" value={query} placeholder="Chức năng, điều kiện, phần thưởng…" onChange={(event) => {
        const next = event.target.value;
        setQuery(next);
        setExpandedSections(new Set(next.trim() ? filterNewplayerSections(sections, next).map((section) => section.id) : []));
      }} /></span></label>
      <div className="newplayer-disclosure-actions">
        <button type="button" disabled={visible.length === 0 || visible.every((section) => expandedSections.has(section.id))} onClick={() => setExpandedSections(new Set(visible.map((section) => section.id)))}><ArrowsPointingOutIcon className="newplayer-icon" aria-hidden="true" />Mở tất cả</button>
        <button type="button" disabled={!visible.some((section) => expandedSections.has(section.id))} onClick={() => setExpandedSections(new Set())}><ArrowsPointingInIcon className="newplayer-icon" aria-hidden="true" />Thu gọn tất cả</button>
      </div>
    </div>
    <div className="wiki-layout">
      <nav className="wiki-toc" aria-label="Mục lục tân thủ"><div className="wiki-toc-heading">MENU TÂN THỦ <span aria-live="polite">{visible.length}/{sections.length}</span></div>{visible.map((section) => {
        const Icon = sectionIcons[section.id] ?? BookOpenIcon;
        return <a key={section.id} href={`#${section.id}`} onClick={() => openSection(section.id)}><Icon className="newplayer-icon" aria-hidden="true" />{section.title}</a>;
      })}</nav>
      <div className="wiki-articles">
        {visible.length === 0 && <section className="wiki-empty" role="status"><h2>Không tìm thấy mục phù hợp</h2><button type="button" onClick={() => { setQuery(""); setExpandedSections(new Set()); }}>Hiện tất cả nội dung</button></section>}
        {visible.map((section) => {
          const Icon = sectionIcons[section.id] ?? BookOpenIcon;
          return <article className="wiki-card" id={section.id} key={section.id}>
          <header className="wiki-card-heading"><h2 className="newplayer-menu-heading"><button type="button" className="newplayer-menu-toggle"
            aria-expanded={expandedSections.has(section.id)} aria-controls={`${section.id}-body`}
            onClick={() => setExpandedSections((current) => {
              const next = new Set(current);
              if (next.has(section.id)) next.delete(section.id); else next.add(section.id);
              return next;
            })}
          ><span className="newplayer-menu-icon"><Icon className="newplayer-icon" aria-hidden="true" /></span><span className="newplayer-menu-title">{section.title}</span><ChevronDownIcon className="newplayer-icon newplayer-menu-chevron" aria-hidden="true" /></button></h2></header>
          <div className="newplayer-menu-body" id={`${section.id}-body`} hidden={!expandedSections.has(section.id)}>{section.content}</div>
        </article>;
        })}
      </div>
    </div>
  </div>;
}
