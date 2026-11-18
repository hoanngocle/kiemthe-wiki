"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdjustmentsHorizontalIcon, ArrowPathIcon, ArrowsPointingInIcon, ArrowsPointingOutIcon, BoltIcon, BookOpenIcon, ChevronDownIcon, ChevronRightIcon, CircleStackIcon, FaceSmileIcon, FlagIcon, HeartIcon, MoonIcon, PhotoIcon, ShieldCheckIcon, SparklesIcon, StarIcon, TrophyIcon, UsersIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import { filterUpgradeMenus, upgradeMenus, upgradeStatusLabels } from "@/lib/upgrade-wiki";
import { conciseChance, conciseResult, recipeParts, withoutItemIds, type RecipeItem } from "@/lib/upgrade-recipe-display";

const guardianGroups = [
  { title: "Hộ Linh I", ids: ["phapsu", "thientuong", "hauvuong", "baochau"] },
  { title: "Hộ Linh II", ids: ["covan", "thankhi", "phunghoang", "kynangbang"] },
];

const upgradeIcons: Record<string, typeof SparklesIcon> = {
  "duc-lai-chi-so-vu-khi": WrenchScrewdriverIcon,
  "vu-khi-hao-thien": BoltIcon,
  "thu-cuoi": StarIcon,
  "mat-na": FaceSmileIcon,
  "luan-hoi-an": ArrowPathIcon,
  "gia-lam-kinh": BookOpenIcon,
  "trang-bi-dong-hanh": UsersIcon,
  phapbao: ShieldCheckIcon,
  kinhmach: AdjustmentsHorizontalIcon,
  baochau: CircleStackIcon,
  kynangbang: MoonIcon,
  thucung: HeartIcon,
  tinvat: FlagIcon,
  huychuong: TrophyIcon,
  "chan-nguyen": SparklesIcon,
  "thanh-linh": ShieldCheckIcon,
};

function UpgradeMenuIcon({ id }: { id: string }) {
  const Icon = upgradeIcons[id] ?? SparklesIcon;
  return <Icon className="ui-icon" aria-hidden="true" />;
}

function RecipeIcon({ item }: { item: RecipeItem }) {
  const [failed, setFailed] = useState(false);
  return <span className="upgrade-item-icon" aria-hidden="true">
    {item.iconUrl && !failed
      // Small, local game sprites retain their native pixels.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={item.iconUrl} alt="" width={32} height={32} loading="lazy" onError={() => setFailed(true)} />
      : <PhotoIcon className="ui-icon" aria-hidden="true" />}
  </span>;
}

function RecipeContent({ text, items, inline = false }: { text: string; items: RecipeItem[]; inline?: boolean }) {
  const Wrapper = inline ? "span" : "div";
  return <Wrapper className={inline ? "upgrade-recipe-inline" : "upgrade-recipe-content"}>{recipeParts(text, items).map((part, index) => "item" in part
    ? <span className={inline ? "upgrade-item-inline" : "upgrade-item"} key={index}>{!inline && <RecipeIcon item={part.item} />}<span><strong className={`upgrade-item-name upgrade-rarity-${part.item.rarity ?? "common"}`}>{part.item.name}</strong>{part.quantity && <span className="upgrade-item-quantity"> × {part.quantity}</span>}</span></span>
    : <span className="upgrade-recipe-text" key={index}>{part.text}</span>)}</Wrapper>;
}

export function UpgradeWiki({ items }: { items: RecipeItem[] }) {
  const [query, setQuery] = useState("");
  const [expandedMenus, setExpandedMenus] = useState<Set<string>>(() => new Set());
  const menus = filterUpgradeMenus(upgradeMenus, query, "all");
  const allExpanded = menus.length > 0 && menus.every((menu) => expandedMenus.has(menu.id));
  const navigationGroups = [
    { title: "Trang bị & nâng cấp khác", menus: menus.filter((menu) => !guardianGroups.some((group) => group.ids.includes(menu.id))) },
    ...guardianGroups.map((group) => ({ title: group.title, menus: group.ids.flatMap((id) => menus.filter((menu) => menu.id === id)) })),
  ].filter((group) => group.menus.length > 0);

  function openMenu(id: string) {
    setExpandedMenus((current) => new Set(current).add(id));
  }

  useEffect(() => {
    function openLinkedMenu() {
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (upgradeMenus.some((menu) => menu.id === id)) {
        setExpandedMenus((current) => new Set(current).add(id));
      }
    }
    const frame = window.requestAnimationFrame(openLinkedMenu);
    window.addEventListener("hashchange", openLinkedMenu);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openLinkedMenu);
    };
  }, []);

  return <div className="page-content wiki-page upgrade-wiki">
    <section className="wiki-intro">
      <h1>Wiki Nâng Cấp</h1>
      <p><Link href="/wiki/vat-pham?group=vu-khi">Xem lộ trình vũ khí và tra theo mã</Link></p>
    </section>
    <div className="wiki-toolbar" id="wiki-search-help">
      <label className="wiki-search"><span>Tìm kiếm</span><input type="search" value={query} onChange={(event) => {
        const nextQuery = event.target.value;
        setQuery(nextQuery);
        setExpandedMenus(new Set(nextQuery.trim() ? filterUpgradeMenus(upgradeMenus, nextQuery, "all").map((menu) => menu.id) : []));
      }} placeholder="Tên menu hoặc nguyên liệu…" /></label>
      <div className="upgrade-disclosure-actions">
        <button type="button" disabled={menus.length === 0} onClick={() => setExpandedMenus(allExpanded ? new Set() : new Set(menus.map((menu) => menu.id)))}>
          {allExpanded ? <ArrowsPointingInIcon className="ui-icon ui-icon-sm" aria-hidden="true" /> : <ArrowsPointingOutIcon className="ui-icon ui-icon-sm" aria-hidden="true" />}
          {allExpanded ? "Thu gọn tất cả" : "Mở tất cả"}
        </button>
      </div>
    </div>
    <div className="wiki-layout">
      <nav className="wiki-toc" aria-label="Mục lục nâng cấp"><div className="wiki-toc-heading">MENU NÂNG CẤP <span aria-live="polite">{menus.length}/{upgradeMenus.length}</span></div>{navigationGroups.map((group) => <details className="upgrade-toc-group" key={group.title} open>
        <summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />{group.title}<span>{group.menus.length}</span></summary>
        {group.menus.map((menu) => <a key={menu.id} href={`#${menu.id}`} onClick={() => openMenu(menu.id)}><UpgradeMenuIcon id={menu.id} />{menu.title}<i className={`wiki-dot wiki-dot-${menu.status}`} aria-label={upgradeStatusLabels[menu.status]} /></a>)}
      </details>)}</nav>
      <div className="wiki-articles">
        {menus.length === 0 && <section className="wiki-empty" role="status"><h2>Không tìm thấy mục phù hợp</h2><button type="button" onClick={() => setQuery("")}>Hiện tất cả menu</button></section>}
        {menus.map((menu) => <article id={menu.id} key={menu.id} className="wiki-card">
          <header className="wiki-card-heading"><h2 className="upgrade-menu-heading"><button
            type="button" className="upgrade-menu-toggle"
            aria-expanded={expandedMenus.has(menu.id)} aria-controls={`${menu.id}-body`}
            onClick={() => setExpandedMenus((current) => {
              const next = new Set(current);
              if (next.has(menu.id)) next.delete(menu.id); else next.add(menu.id);
              return next;
            })}
          ><span className="wiki-number"><UpgradeMenuIcon id={menu.id} /></span><span className="upgrade-menu-title">{menu.title}</span><ChevronDownIcon className="ui-icon upgrade-menu-chevron" aria-hidden="true" /></button></h2></header>
          <div id={`${menu.id}-body`} className="upgrade-menu-body" hidden={!expandedMenus.has(menu.id)}>
          <div className="upgrade-table-wrap" role="region" aria-label={`Công thức ${menu.title}`} tabIndex={0}>
            <table className="upgrade-table">
              <thead><tr><th scope="col">Công thức</th><th scope="col">Nguyên liệu / Điều kiện</th><th scope="col">Kết quả</th><th scope="col">Tỷ lệ</th></tr></thead>
              <tbody>{menu.recipes.map((recipe, index) => <tr key={index}>
                <th scope="row"><RecipeContent text={recipe.name} items={items} inline /><details className="upgrade-row-notes"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />Chi tiết</summary><p><RecipeContent text={recipe.formula} items={items} inline /></p><p><RecipeContent text={recipe.result} items={items} inline /></p><p><RecipeContent text={recipe.chance} items={items} inline /></p>{recipe.notes.length > 0 && <ul>{recipe.notes.map((note, noteIndex) => <li key={noteIndex}><RecipeContent text={note} items={items} inline /></li>)}</ul>}</details></th>
                <td><RecipeContent text={recipe.formula} items={items} /></td>
                <td><RecipeContent text={conciseResult(recipe.result, menu.title, recipe.name)} items={items} /></td>
                <td><span className="upgrade-chance" title={withoutItemIds(recipe.chance)}><RecipeContent text={conciseChance(recipe.chance)} items={items} inline /></span></td>
              </tr>)}</tbody>
            </table>
          </div>
          <details className="upgrade-menu-details"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />Hướng dẫn & lưu ý</summary>
            <ol>{menu.steps.map((step, index) => <li key={index}><RecipeContent text={step} items={items} inline /></li>)}</ol>
            {menu.warnings.length > 0 && <ul>{menu.warnings.map((warning, index) => <li key={index}><RecipeContent text={warning} items={items} inline /></li>)}</ul>}
            <details className="wiki-sources"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />Đối chiếu dữ liệu</summary><p>{upgradeStatusLabels[menu.status]} · <RecipeContent text={menu.verdict} items={items} inline /></p><ul>{menu.sources.map((source, index) => <li key={index}><strong>{withoutItemIds(source.label)}</strong><code>{source.path}:{source.line}</code></li>)}</ul></details>
          </details>
          </div>
        </article>)}
      </div>
    </div>
  </div>;
}
