import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import path from "node:path";
import { AdminShell } from "@/app/components/admin-shell";
import { loadWeaponStats, weaponElements } from "@/lib/weapon-wiki";
import { formatStatRange } from "@/lib/weapon-stats";
import { MagicStats } from "./magic-stats";
import "../../vu-khi/weapon-wiki.css";

export const metadata: Metadata = {
  title: "Chỉ số vũ khí · Wiki Kiếm Thế",
  description: "Đối chiếu khoảng thuộc tính vũ khí theo mã vật phẩm, MagicLevel và mức cường hóa.",
};

type WeaponStats = NonNullable<Awaited<ReturnType<typeof loadWeaponStats>>>;

function FixedStats({ title, stats, milestones = false }: {
  title: string; stats: WeaponStats["basic"]; milestones?: boolean;
}) {
  if (!stats.length) return null;
  return <section className="wiki-card weapon-section">
    <header className="wiki-card-heading"><h2>{title}</h2></header>
    <div className="wiki-card-body">
      <div className="weapon-table-scroll" role="region" aria-label={title} tabIndex={0}>
        <table className="weapon-table weapon-fixed-table">
          <thead><tr>
            {milestones && <th scope="col">Mốc mở</th>}
            <th scope="col">Thuộc tính</th><th scope="col">Khoảng cấu hình (PA1)</th><th scope="col">Tham số phụ</th>
          </tr></thead>
          <tbody>{stats.map((stat) => <tr key={stat.slot}>
            {milestones && <td>{stat.unlock !== undefined ? `+${stat.unlock}` : "—"}</td>}
            <th scope="row">{stat.label}<small><code>{stat.code}</code></small></th>
            <td>{formatStatRange(stat.value, stat.unit)}</td>
            <td>{stat.extra.length ? stat.extra.map(({ parameter, range }) =>
              <span className="weapon-stat-parameter" key={parameter}>PA{parameter} {formatStatRange(range)}</span>) : "—"}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
  </section>;
}

export default async function WeaponStatsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const weapon = await loadWeaponStats(path.resolve(process.cwd(), "../gameserver"), id);
  if (!weapon) notFound();

  return <AdminShell section="wiki" wikiPage="vat-pham">
    <div className="page-content wiki-page weapon-page">
      <section className="wiki-intro">
        <Link href={`/wiki/vat-pham?group=vu-khi&q=${encodeURIComponent(weapon.id)}#danh-muc`}>← Về Vật Phẩm</Link>
        <h1>{weapon.name}</h1>
        <p><code>{weapon.id}</code>{weapon.kind && <> · {weapon.kind}</>} · Cấp mặc {weapon.requiredLevel ?? "—"} · Trang bị cấp {weapon.equipLevel}{weaponElements[weapon.series] && <> · Hệ {weaponElements[weapon.series]}</>}</p>
      </section>
      <section className="wiki-card weapon-section">
        <header className="wiki-card-heading"><h2>Đối chiếu chỉ số ngẫu nhiên</h2></header>
        <div className="wiki-card-body">
          <MagicStats stats={weapon.magic} hasExample={weapon.id === "2,1,12084,10"} />
        </div>
      </section>
      <FixedStats title="Thuộc tính cơ bản" stats={weapon.basic} />
      <FixedStats title="Thưởng mốc cường hóa" stats={weapon.bonuses} milestones />
      <FixedStats title="Thuộc tính gia cường (StrMA)" stats={weapon.strengthen} milestones />
    </div>
  </AdminShell>;
}
