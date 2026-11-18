"use client";

import { ArrowUpIcon, ArrowUpRightIcon, ChevronRightIcon, ClipboardDocumentListIcon, GiftIcon, MapIcon, TrophyIcon, WrenchScrewdriverIcon } from "@heroicons/react/24/outline";

import { useState } from "react";
import { activities, activityCategories, filterActivities, type ActivityCategory } from "@/lib/activity-wiki";

const categoryIcons = {
  "doi-khang": TrophyIcon,
  "pho-ban": MapIcon,
  "thu-thap": GiftIcon,
  "nhiem-vu": ClipboardDocumentListIcon,
  "che-tao": WrenchScrewdriverIcon,
};

function ActivityIcon({ category }: { category: ActivityCategory }) {
  const Icon = categoryIcons[category];
  return <Icon className="ui-icon" aria-hidden="true" />;
}

export function ActivityWiki() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const visible = filterActivities(query, category);

  return <div className="page-content wiki-page activity-wiki" id="dau-trang-hoat-dong">
    <header className="wiki-intro">
      <h1>Wiki Hoạt Động</h1>
    </header>

    <div className="wiki-toolbar" id="tim-hoat-dong">
      <label className="wiki-search"><span>Tìm hoạt động, thời gian, nguyên liệu hoặc phần thưởng</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ví dụ: hoa son, 18:50, bánh, kinh nghiệm…" /></label>
      <label className="wiki-filter"><span>Loại hoạt động</span><select value={category} onChange={(event) => setCategory(event.target.value as ActivityCategory | "all")}><option value="all">Tất cả hoạt động</option>{Object.entries(activityCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>

    <section className="activity-overview" aria-labelledby="lich-nhanh-title"><div className="activity-overview-heading"><h2 id="lich-nhanh-title">Lịch hoạt động</h2><span aria-live="polite">{visible.length}/{activities.length} hoạt động</span></div><p className="activity-no-schedule">Thời gian tính theo giờ máy chủ.</p><div className="newplayer-table-wrap" role="region" aria-label="Lịch hoạt động" tabIndex={0}><table className="newplayer-table activity-schedule-table"><thead><tr><th scope="col">Hoạt động</th><th scope="col">Thời gian</th><th scope="col">Nhóm</th></tr></thead><tbody>{visible.map((activity) => <tr key={activity.id}><td><a href={`#${activity.id}`}>{activity.title} <ArrowUpRightIcon className="ui-icon ui-icon-sm" aria-hidden="true" /></a></td><td>{activity.schedule}</td><td>{activityCategories[activity.category]}</td></tr>)}</tbody></table></div></section>

    <div className="wiki-layout">
      <nav className="wiki-toc" aria-label="Mục lục hoạt động"><div className="wiki-toc-heading">{activities.length} HOẠT ĐỘNG <span>{visible.length}/{activities.length}</span></div>{visible.map((activity) => <a key={activity.id} href={`#${activity.id}`}><ActivityIcon category={activity.category} />{activity.title}</a>)}</nav>
      <div className="wiki-articles">
        {visible.length === 0 && <section className="wiki-empty" role="status"><h2>Không tìm thấy hoạt động phù hợp</h2><p>Thử tên không dấu, tên phần thưởng hoặc bỏ bộ lọc.</p><button onClick={() => { setQuery(""); setCategory("all"); }}>Hiện tất cả {activities.length} hoạt động</button></section>}
        {visible.map((activity) => <article className="wiki-card" id={activity.id} key={activity.id}>
          <header className="wiki-card-heading"><span className="wiki-number"><ActivityIcon category={activity.category} /></span><div><div className="activity-category">{activityCategories[activity.category]}</div><h2>{activity.title}</h2><p>{activity.summary}</p></div></header>
          <div className="wiki-card-body">
            <h3>Tham gia</h3><p className="activity-schedule-summary">{activity.schedule}</p><ul className="activity-list activity-entry">{activity.entry.map((entry, index) => <li key={index}>{entry}</li>)}</ul>
            <h3>Cách chơi</h3><ol className="wiki-steps">{activity.steps.map((step, index) => <li key={index}>{step}</li>)}</ol>
            <h3>Phần thưởng và cách nhận</h3><dl className="activity-rewards">{activity.rewards.map((reward, index) => <div key={index}><dt>{reward.title}</dt><dd>{reward.detail}</dd></div>)}</dl>
            {(activity.limits.length > 0 || activity.issues.length > 0) && <><h3>Lưu ý</h3><ul className="activity-list">{[...activity.limits, ...activity.issues].map((note, index) => <li key={index}>{note}</li>)}</ul></>}
            {(activity.timings.length > 0 || activity.mechanics.length > 0) && <details className="activity-details"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />Chi tiết hoạt động</summary>{activity.timings.length > 0 && <dl className="activity-timings">{activity.timings.map((timing, index) => <div key={index}><dt>{timing.label}<strong>{timing.when}</strong></dt><dd>{timing.detail}</dd></div>)}</dl>}<div className="activity-mechanics">{activity.mechanics.map((mechanic, index) => <section key={index}><h4>{mechanic.title}</h4><p>{mechanic.description}</p></section>)}</div></details>}
            <details className="wiki-sources"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />Nguồn đối chiếu</summary><ul>{activity.sources.map((source, index) => <li key={index}><strong>{source.label}</strong><code>{source.path}:{source.line}</code></li>)}</ul></details>
            <a className="wiki-back-top" href="#tim-hoat-dong"><ArrowUpIcon className="ui-icon ui-icon-sm" aria-hidden="true" /> Về tìm kiếm và lịch</a>
          </div>
        </article>)}
      </div>
    </div>
  </div>;
}
