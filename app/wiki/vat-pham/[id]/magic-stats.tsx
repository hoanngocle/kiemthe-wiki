"use client";

import { useState } from "react";
import { compareMagicRoll, formatStatRange, maxWeaponEnhancement, rangeAt, type MagicStat } from "@/lib/weapon-stats";

const statusLabels = {
  current: "Trong khoảng sau sửa",
  legacy: "Chỉ khớp khoảng cũ",
  outside: "Ngoài hai khoảng",
  invalid: "Nhập một số nguyên",
  unknown: "Thiếu khoảng đối chiếu",
} as const;

function MagicRange({ values, unit }: { values: ReturnType<typeof rangeAt>; unit: string }) {
  return <>
    <strong>{values.value ? formatStatRange(values.value, unit) : "Thiếu cấu hình"}</strong>
    <small>Tra cấp {values.level}</small>
    {values.extra.map(({ parameter, range }) => <small key={parameter}>MA{parameter} {formatStatRange(range)}</small>)}
  </>;
}

export function MagicStats({ stats, hasExample }: { stats: MagicStat[]; hasExample: boolean }) {
  const [enhancement, setEnhancement] = useState(0);
  const [rolls, setRolls] = useState<Record<number, string>>({});

  if (!stats.length) return <p>Mẫu vũ khí này không có dòng <code>MagicName</code> và <code>MagicLevel</code> cố định. Các chỉ số khai báo trực tiếp nằm ở bảng bên dưới.</p>;

  return <>
    <p>Chọn mức cường hóa của món rồi nhập giá trị từng dòng trong tooltip game. Bảng đối chiếu chỉ số chính của từng dòng. Thuộc tính cơ bản và thưởng mốc cường hóa nằm ở các bảng riêng bên dưới.</p>
    <div className="weapon-stat-controls">
      <label className="wiki-filter"><span>Cường hóa của món</span><select value={enhancement} onChange={(event) => setEnhancement(Number(event.target.value))}>
        {Array.from({ length: maxWeaponEnhancement + 1 }, (_, level) => <option value={level} key={level}>+{level}</option>)}
      </select></label>
      {hasExample && <button type="button" className="weapon-stat-example" onClick={() => {
        setEnhancement(0);
        setRolls({ 1: "+98%", 2: "+18", 3: "+488", 4: "+928", 5: "+95" });
      }}>Điền số từ ảnh Hạo Thiên</button>}
    </div>
    <div className="weapon-table-scroll" role="region" aria-label="Khoảng chỉ số ngẫu nhiên của vũ khí" tabIndex={0}>
      <table className="weapon-table weapon-magic-table">
        <thead><tr>
          <th scope="col">MagicLevel</th><th scope="col">Thuộc tính</th><th scope="col">Giá trị trong game</th>
          <th scope="col">Khoảng engine cũ (+{enhancement})</th><th scope="col">Khoảng sau sửa (+{enhancement})</th>
        </tr></thead>
        <tbody>{stats.map((stat) => {
          const value = rolls[stat.slot] ?? "";
          const status = compareMagicRoll(stat, enhancement, value);
          return <tr key={stat.slot}>
            <td>{stat.level}</td>
            <th scope="row">{stat.label}<small><code>{stat.code}</code></small></th>
            <td>
              <input className="weapon-roll" type="text" inputMode="numeric" maxLength={20} value={value}
                aria-label={`Giá trị trong game, dòng ${stat.slot} ${stat.label}`}
                placeholder={stat.unit === "%" ? "Ví dụ +98%" : "Nhập giá trị"}
                onChange={(event) => setRolls({ ...rolls, [stat.slot]: event.target.value })} />
              {status && <small className={`weapon-roll-status weapon-roll-${status}`} role="status">{statusLabels[status]}</small>}
            </td>
            <td><MagicRange values={rangeAt(stat, enhancement, true)} unit={stat.unit} /></td>
            <td><MagicRange values={rangeAt(stat, enhancement)} unit={stat.unit} /></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
    <p className="weapon-muted">Engine cũ giới hạn cấp tra gốc ở 10. Bản sửa dùng <code>MagicLevel</code> của mẫu và giới hạn cấp tra sau cường hóa ở 26. MA2 và MA3 là các tham số phụ trong cấu hình.</p>
  </>;
}
