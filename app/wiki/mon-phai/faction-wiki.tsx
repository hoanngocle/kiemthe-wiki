"use client";

import { ChevronRightIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import type { Faction, FactionSkill } from "@/lib/faction-wiki";

const formatNumber = new Intl.NumberFormat("vi-VN");

function SkillDetails({ skill }: { skill: FactionSkill }) {
  return (
    <li className="faction-skill">
      <div className="faction-skill-header">
        <div className="faction-skill-title">
          {skill.iconUrl && <Image src={skill.iconUrl} alt="" width={36} height={36} unoptimized />}
          <h3>{skill.name}</h3>
        </div>
        <span className="faction-skill-level">Cấp {skill.requiredLevel}</span>
      </div>
      {skill.treeName && <p className="faction-skill-type">Tên trong cây phái · {skill.treeName}</p>}
      {skill.property && <p className="faction-skill-type">{skill.property}</p>}
      {skill.description && <p className="faction-skill-description">{skill.description}</p>}
      <dl className="faction-skill-stats">
        <div><dt>Bậc tối đa</dt><dd>{skill.maxLevel}</dd></div>
        {skill.weapon && <div><dt>Vũ khí</dt><dd>{skill.weapon}</dd></div>}
        {skill.attackRadius > 0 && <div><dt>Tầm thi triển</dt><dd>{skill.attackRadius}</dd></div>}
        {skill.cooldownSeconds > 0 && <div><dt>Hồi chiêu cơ bản</dt><dd>{formatNumber.format(skill.cooldownSeconds)} giây</dd></div>}
        <div><dt>ID kỹ năng</dt><dd>{skill.id}</dd></div>
      </dl>
      {skill.rankValues && <dl className="faction-skill-damage">
        <div><dt>Bậc 1</dt><dd>{skill.rankValues[1]}</dd></div>
        <div><dt>Bậc 20</dt><dd>{skill.rankValues[20]}</dd></div>
      </dl>}
      {skill.horseRestriction && <p className="faction-skill-horse">{skill.horseRestriction}</p>}
      {skill.unlockNote && <p className="faction-skill-type">{skill.unlockNote}</p>}
      {skill.book && <div className="faction-skill-book">
        <strong>{skill.book.name}</strong>
        <p>Trang bị để học. {skill.book.price !== null && `Kỳ Trân Các · ${formatNumber.format(skill.book.price)} đồng thường.`}</p>
      </div>}
    </li>
  );
}

export function FactionWiki({ factions }: { factions: Faction[] }) {
  const [faction, setFaction] = useState<Faction | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const tabs = useRef<HTMLDivElement>(null);
  const details = useRef<HTMLDivElement>(null);
  const routeCount = factions.reduce((count, faction) => count + faction.routes.length, 0);
  const skillCount = factions.reduce((count, faction) => count + faction.routes.reduce((sum, route) => sum + route.skills.length, 0), 0);

  function openFaction(nextFaction: Faction) {
    setFaction(nextFaction);
    setActiveTab(0);
    dialog.current?.showModal();
    closeButton.current?.focus();
  }

  function selectTab(index: number) {
    setActiveTab(index);
    if (details.current) details.current.scrollTop = 0;
  }

  function handleTabKeys(event: KeyboardEvent<HTMLButtonElement>, index: number, count: number) {
    let target: number;
    switch (event.key) {
      case "ArrowLeft": target = (index + count - 1) % count; break;
      case "ArrowRight": target = (index + 1) % count; break;
      case "Home": target = 0; break;
      case "End": target = count - 1; break;
      default: return;
    }
    event.preventDefault();
    selectTab(target);
    tabs.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[target]?.focus();
  }

  return (
    <div className="page-content wiki-page faction-wiki">
      <header className="wiki-intro">
        <h1>Môn Phái</h1>
        <p>Chọn môn phái để xem kỹ năng và điều kiện sử dụng của từng nhánh võ công.</p>
        <div className="wiki-stats">
          <span><strong>{factions.length}</strong> môn phái</span>
          <span><strong>{routeCount}</strong> nhánh võ công</span>
          <span><strong>{skillCount}</strong> mục kỹ năng theo nhánh</span>
        </div>
      </header>

      <ul className="faction-grid" aria-label="Danh sách môn phái">
        {factions.map((entry) => (
          <li key={entry.id}>
            <button type="button" className="faction-card" data-series={entry.series} aria-haspopup="dialog" aria-controls="faction-dialog" onClick={() => openFaction(entry)}>
              <span className="faction-element">Hệ {entry.element}</span>
              <strong>{entry.name}</strong>
              <span className="faction-card-routes">{entry.routes.map(({ name }) => name).join(" · ")}</span>
              <ChevronRightIcon className="faction-card-arrow" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <dialog ref={dialog} id="faction-dialog" className="faction-dialog" aria-labelledby="faction-dialog-title" onClose={() => setFaction(null)}>
        <div className="faction-dialog-layout">
          <header className="faction-dialog-header">
            <div>
              <h2 id="faction-dialog-title">{faction?.name}</h2>
              {faction && <span className="faction-element" data-series={faction.series}>Hệ {faction.element}</span>}
            </div>
            <button ref={closeButton} type="button" className="faction-close" aria-label="Đóng" onClick={() => dialog.current?.close()}>
              <XMarkIcon className="ui-icon" aria-hidden="true" />
            </button>
          </header>

          {faction && <div ref={tabs} className="faction-tabs" role="tablist" aria-label="Nhánh võ công">
            {faction.routes.map((route, index) => (
              <button key={route.id} id={`faction-tab-${route.id}`} type="button" role="tab" aria-selected={index === activeTab}
                aria-controls={`faction-panel-${route.id}`} tabIndex={index === activeTab ? 0 : -1}
                onClick={() => selectTab(index)} onKeyDown={(event) => handleTabKeys(event, index, faction.routes.length)}>
                {route.name}
              </button>
            ))}
          </div>}

          {faction && <div ref={details} className="faction-dialog-content">
            {faction.routes.map((route, index) => {
              const factionSkills = route.skills.filter(({ book }) => !book);
              const bookGroups = new Map<string, FactionSkill[]>();
              for (const skill of route.skills) {
                if (!skill.book) continue;
                const name = skill.book.group ?? "Kỹ năng từ mật tịch";
                const group = bookGroups.get(name) ?? [];
                group.push(skill);
                bookGroups.set(name, group);
              }
              return (
              <section key={route.id} id={`faction-panel-${route.id}`} role="tabpanel" tabIndex={0}
                aria-labelledby={`faction-tab-${route.id}`} hidden={index !== activeTab}>
                <p className="faction-route-summary">
                  <span>{route.skills.length} kỹ năng</span>
                  {route.previousName && <span>Nhánh trước đây là {route.previousName}</span>}
                </p>
                <div className="faction-skill-groups">
                  <section aria-label="Cây võ công">
                    <h3>Cây võ công</h3>
                    <ul className="faction-skill-grid">
                      {factionSkills.map((skill) => <SkillDetails key={skill.id} skill={skill} />)}
                    </ul>
                  </section>
                  {[...bookGroups].map(([group, skills]) => <section key={group} aria-label={group}>
                    <h3>{group}</h3>
                    <ul className="faction-skill-grid">
                      {skills.map((skill) => <SkillDetails key={skill.id} skill={skill} />)}
                    </ul>
                  </section>)}
                </div>
              </section>
              );
            })}
          </div>}
        </div>
      </dialog>
    </div>
  );
}
