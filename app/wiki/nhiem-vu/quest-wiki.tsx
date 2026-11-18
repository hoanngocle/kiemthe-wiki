"use client";

import { ArrowLeftIcon, ArrowRightIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

import { useMemo, useState } from "react";
import { filterQuests, factionQuestGroup, questTypes, rewardTiers, configuredQuestRewards, randomReputePool, type Quest, type QuestAward } from "@/lib/quest-wiki";

const PAGE_SIZE = 20;
const number = (value: number) => value.toLocaleString("vi-VN");
const groups: Record<string, string> = { fixed: "Cố định", choice: "Chọn 1", random: "Ngẫu nhiên", step: "Trong chặng", upgrade: "Thay Huyền Tinh gốc" };


function AwardLines({ awards }: { awards: QuestAward[] }) {
  // Sum only entries with identical grant semantics; keep every item variant and condition.
  const combined = new Map<string, QuestAward & { entries: number }>();
  awards.forEach((award, index) => {
    const key = ["item", "customizeitem"].includes(award.kind) || ["choice", "random"].includes(award.group) ? String(index) : JSON.stringify([award.group, award.label, award.conditions, award.note, award.rate]);
    const previous = combined.get(key);
    if (previous && typeof previous.amount === "number" && typeof award.amount === "number") {
      previous.amount += award.amount;
      previous.entries += 1;
    } else combined.set(key, { ...award, entries: 1 });
  });
  return <ul className="quest-awards">{[...combined.values()].map((award, index) => <li key={index}>
    <span><strong>{award.amount !== null ? `${number(award.amount)} ` : ""}{award.label}</strong>{award.itemId && <code className="quest-item-id">{award.itemId}</code>}</span>
    <small>{groups[award.group]}{award.group === "step" ? award.entries > 1 ? ` · tổng ${award.entries} khoản trong các chặng` : ` · chặng ${award.step}` : ""}{award.conditions.length > 0 && ` · ${award.conditions.join(", ")}`}{award.group === "random" && award.rate !== null && ` · trọng số ${award.rate}`}{award.note && !["item", "customizeitem"].includes(award.kind) && ` · ${award.note}`}</small>
  </li>)}</ul>;
}

export function QuestWiki({ quests }: { quests: Quest[] }) {
  const applied = quests.every((quest) => quest.quests.every((part) => part.awards.some((award) => award.group === "bonus")));
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [rewardType, setRewardType] = useState("all");
  const [page, setPage] = useState(0);
  const visible = useMemo(() => quests.flatMap((chain) => chain.quests.map((part, index) => ({ chain, part, last: index === chain.quests.length - 1 }))).filter(({ chain, part }) => filterQuests([{ ...chain, quests: [part] }], query, type).length > 0 && (rewardType === "all" || part.awards.some((award) => !["bonus", "upgrade"].includes(award.group) && rewardType.split(",").includes(award.kind)))), [quests, query, type, rewardType]);
  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  const displayed = visible.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const projection = visible.reduce((total, { chain, part, last }) => {
    const reward = configuredQuestRewards(chain, part, last);
    return { coin: total.coin + reward.coin, silver: total.silver + reward.silver,
      make: total.make + reward.make, gather: total.gather + reward.gather, repute: total.repute + reward.repute };
  }, { coin: 0, silver: 0, make: 0, gather: 0, repute: 0 });
  return <div className="page-content wiki-page quest-wiki" id="dau-trang-nhiem-vu">
    <header className="wiki-intro"><h1>Wiki Nhiệm Vụ</h1></header>
    <aside className="quest-projection"><strong>Đã đồng bộ cấu hình mới · 09/11/2026</strong><p>659 nhiệm vụ: Đồng thường, Bạc khóa, Tinh–Hoạt lực tổng ×15 so với gốc và danh vọng ngẫu nhiên trong 7 loại. Huyền Tinh gốc được nâng 2 cấp, tối thiểu cấp 5; cuối tuyến không lặp vẫn nhận thêm 2 Huyền Tinh khóa và Linh Khí.</p><small>Wiki phản ánh dữ liệu đã lưu trong Client/Server. Các tiến trình game cần nạp lại cấu hình để phát mức thưởng mới.</small></aside>
    <details className="wiki-card quest-policy"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />Khung thưởng bổ sung theo cấp</summary><div className="wiki-card-body">
      <p>Đồng thường = (⌊cấp / 10⌋ + 1) × 500. Danh vọng ngẫu nhiên = (⌊cấp / 10⌋ + 1) × 5 điểm. Áp dụng cùng mốc cho các loại nhiệm vụ, kể cả nhiệm vụ lặp.</p>
      <p>Tổng Tinh lực và Hoạt lực mới bằng 15 lần tổng gốc (gồm cả thưởng trong chặng). Dòng Đã thêm ghi phần chênh lệch 14 lần gốc. Nhiệm vụ gốc không có tinh/hoạt lực thì khoản tương ứng vẫn bằng 0.</p>
      <div className="newplayer-table-wrap" tabIndex={0} role="region" aria-label="Khung thưởng theo cấp"><table className="newplayer-table"><thead><tr><th>Cấp</th><th>Đồng thường</th><th>Điểm danh vọng random</th><th>Tinh / Hoạt lực mới</th><th>Quà cuối tuyến không lặp</th></tr></thead><tbody>{[1,10,20,30,40,50,60,70,80,90,100,110,120,130,140,150].map((level) => {
        const tier = rewardTiers.find((entry) => level <= entry.max) ?? rewardTiers[0];
        const step = Math.floor(level / 10) + 1;
        return <tr key={level}><td>{level === 1 ? "1–9" : `${level}–${level + 9}`}</td><td>{number(step * 500)}</td><td>{step * 5}</td><td>Gốc ×15</td><td>2 Huyền Tinh cấp {Math.min(9, tier.crystal + 1)} + {tier.spirit} Linh Khí, khóa</td></tr>;
      })}</tbody></table></div>
      <p>Huyền Tinh gốc: cấp mới = tối đa giữa 5 và cấp gốc + 2; giữ nguyên số lượng. Ví dụ HT2→5, HT3→5, HT4→6, HT5→7, HT6→8, HT7→9. Mục “Thay Huyền Tinh gốc” là thay phẩm chất, không phải phát thêm số viên đó.</p>
      <p>Bạc khóa và Linh Khí giữ công thức trước. Nhiệm vụ lặp không thêm quà cuối tuyến. Các số ở dòng Đã thêm đọc trực tiếp từ XML đã cấu hình.</p>
    </div></details>
    <details className="wiki-card quest-policy"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />Danh vọng ngẫu nhiên · {new Set(randomReputePool.map((entry) => entry.camp)).size} nhóm / {randomReputePool.length} loại phổ thông</summary><div className="wiki-card-body"><p>Mỗi loại có trọng số 1, xác suất 1/{randomReputePool.length} (khoảng {(100 / randomReputePool.length).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%). Số điểm ở dòng Đã thêm là số điểm cho loại được chọn. Danh vọng được bốc ngẫu nhiên khi game phát thưởng, không bốc lại loại khi tải Wiki.</p><div className="newplayer-table-wrap" tabIndex={0} role="region" aria-label="Danh sách danh vọng ngẫu nhiên"><table className="newplayer-table"><thead><tr><th scope="col">Nhóm danh vọng</th><th scope="col">Loại danh vọng</th><th scope="col">ID nhóm / loại</th><th scope="col">Xác suất</th></tr></thead><tbody>{randomReputePool.map((entry) => <tr key={`${entry.camp}/${entry.classId}`}><td>{entry.group}</td><td>{entry.name}</td><td>{entry.camp}/{entry.classId}</td><td>1/{randomReputePool.length}</td></tr>)}</tbody></table></div><p>Đối chiếu: <code>Server/gameserver/setting/player/repute.xml</code>. Chỉ giữ Nghĩa Quân, Quân doanh, ba nhánh Tống Kim, Bạch Hổ Đường và Tiêu Dao Cốc. Đã bỏ các nhánh chuyên biệt, môn phái, gia tộc, sự kiện cũ, cao thủ, liên đấu, lãnh thổ, Tần Lăng và Quan Ấn khỏi phương án ngẫu nhiên. Nhiệm vụ lặp cũng nhận điểm danh vọng theo mốc cấp.</p></div></details>
    <div className="wiki-toolbar">
      <label className="wiki-search"><span>Tìm nhiệm vụ, tuyến, vật phẩm thưởng hoặc ID</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} placeholder="Tên nhiệm vụ, Huyền Tinh, danh vọng, 18,1…" /></label>
      <label className="wiki-filter"><span>Loại nhiệm vụ</span><select value={type} onChange={(event) => { setType(event.target.value); setPage(0); }}><option value="all">Tất cả</option><option value="mon-phai">Môn phái (72 nhiệm vụ)</option>{Object.entries(questTypes).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
      <label className="wiki-filter"><span>Thưởng gốc có</span><select value={rewardType} onChange={(event) => { setRewardType(event.target.value); setPage(0); }}><option value="all">Tất cả</option><option value="coin,bindcoin">Đồng / Đồng khóa</option><option value="money,bindmoney,activemoney">Bạc / Bạc khóa</option><option value="item,customizeitem">Vật phẩm</option><option value="repute,KinReputeEntry">Danh vọng / Uy danh</option><option value="makepoint,gatherpoint">Tinh lực / Hoạt lực</option></select></label>
    </div>
    {type === "mon-phai" && <aside className="quest-projection"><strong>72 nhiệm vụ môn phái · 12 phái</strong><p>36 nhiệm vụ mốc 20/30/40, 24 nhiệm vụ tiếp dẫn (Tu Luyện Châu và Thi Đấu), 12 nhiệm vụ kỹ năng cấp 110. Các nhiệm vụ này thuộc loại Phụ tuyến trong XML, được lọc riêng tại đây.</p><p>Thưởng gốc nhóm 20/30/40: 500.000 / 600.000 / 700.000 kinh nghiệm, không có các khoản thưởng khác. Đồng và danh vọng dùng mốc mỗi 10 cấp; Tinh–Hoạt lực tính theo gốc ×15.</p><small>Đối chiếu nhóm 20/30/40: Server/gameserver/script/item/class/xiulianzhu.lua · tbPlayerTaskId. Cấp nhận tối thiểu trong XML lần lượt là 21/31/41.</small></aside>}
    <div className="quest-results"><p role="status">{visible.length} nhiệm vụ phù hợp · Trang {currentPage + 1}/{pages}</p><span>Cố định · Chọn 1 · Ngẫu nhiên · Trong chặng</span></div>
    <aside className="quest-projection" aria-label="Tổng thưởng bổ sung đã cấu hình"><strong>Tổng thưởng bổ sung · 1 lượt/nhiệm vụ trong bộ lọc</strong><div><span>Đồng thường <b>+{number(projection.coin)}</b></span><span>Bạc khóa <b>+{number(projection.silver)}</b></span><span>Tinh lực <b>+{number(projection.make)}</b></span><span>Hoạt lực <b>+{number(projection.gather)}</b></span><span>Điểm danh vọng ngẫu nhiên <b>+{number(projection.repute)}</b></span></div><small>Không phải sản lượng mỗi ngày; tuyến thay thế, điều kiện nhân vật và số lượt lặp ảnh hưởng tổng thực nhận. Thưởng ngẫu nhiên là trọng số, không phải số món chắc chắn nhận.</small></aside>
    <div className="quest-table-wrap" role="region" aria-label="Bảng thưởng nhiệm vụ, cuộn ngang để xem các cột" tabIndex={0}>
      <table className="quest-table">
        <caption>Đồng bổ sung là Đồng thường; Bạc bổ sung là Bạc khóa. Tinh lực/Hoạt lực tổng mới = gốc ×15; phần thêm = gốc ×14. Dòng Gốc giữ thưởng ban đầu; dòng Đã thêm là phần đã ghi vào cấu hình.</caption>
        <colgroup><col className="quest-col-name" /><col className="quest-col-kind" /><col className="quest-col-coin" /><col className="quest-col-silver" /><col className="quest-col-energy" /><col className="quest-col-energy" /><col className="quest-col-repute" /><col className="quest-col-details" /></colgroup>
        <thead><tr><th scope="col">Nhiệm vụ</th><th scope="col">Thưởng</th><th scope="col">Đồng</th><th scope="col">Bạc</th><th scope="col">Tinh lực</th><th scope="col">Hoạt lực</th><th scope="col">Danh vọng</th><th scope="col">Vật phẩm · Thưởng khác</th></tr></thead>
        {displayed.map(({ chain, part, last }) => {
          const proposal = configuredQuestRewards(chain, part, last);
          const core = [["coin", "bindcoin"], ["money", "bindmoney", "activemoney"], ["makepoint"], ["gatherpoint"]];
          const upgrades = part.awards.filter((award) => award.group === "upgrade");
          const reputes = part.awards.filter((award) => !["bonus", "upgrade"].includes(award.group) && ["repute", "KinReputeEntry"].includes(award.kind));
          const details = part.awards.filter((award) => !["bonus", "upgrade"].includes(award.group) && ![...core.flat(), "repute", "KinReputeEntry"].includes(award.kind));
          return <tbody key={`${chain.id}-${part.id}`}>
            <tr>
              <th scope="rowgroup" rowSpan={2} className="quest-name-cell"><strong>{part.name}</strong><small>Cấp {part.balanceLevel} · NV #{part.id}</small><small>{factionQuestGroup(chain) ? "Môn phái" : questTypes[String(chain.type)]}</small><small>{chain.repeat ? "Lặp lại" : "Một lần"}</small>
                <details className="quest-table-source"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />Nguồn</summary><p>{chain.name} · Tuyến #{chain.id}</p><p>Cuối nhiệm vụ: <code>{part.source}</code> · Sub #{part.id}.</p><p>Trong chặng: <code>{part.subSource}</code>.</p></details>
              </th>
              <th scope="row" className="quest-reward-kind">Gốc</th>
              {core.map((kinds) => {
                const awards = part.awards.filter((award) => !["bonus", "upgrade"].includes(award.group) && kinds.includes(award.kind));
                return <td key={kinds[0]}>{awards.length > 0 ? <AwardLines awards={awards} /> : <span className="quest-zero">0</span>}</td>;
              })}
              <td className="quest-repute-cell">{reputes.length > 0 ? <AwardLines awards={reputes} /> : <span className="quest-zero">0 điểm</span>}</td>
              <td>{details.length > 0 ? <details className="quest-item-details"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />{[...new Set(details.map((award) => award.label))].slice(0, 3).join(" · ")}{new Set(details.map((award) => award.label)).size > 3 && "…"}</summary><AwardLines awards={details} /></details> : <span className="quest-zero">Không có</span>}</td>
            </tr>
            <tr className="quest-proposed-row"><th scope="row" className="quest-reward-kind">{applied ? "Đã thêm" : "Thêm"}</th>
              <td>+{number(proposal.coin)}<small>Đồng thường</small></td><td>+{number(proposal.silver)}<small>Bạc khóa</small></td><td>+{number(proposal.make)}<small>Thêm 14× gốc</small></td><td>+{number(proposal.gather)}<small>Thêm 14× gốc</small></td>
              <td className="quest-repute-cell">{proposal.repute > 0 ? <><strong>+{number(proposal.repute)} điểm</strong><small>Cho 1 loại ngẫu nhiên · mỗi loại 1/{randomReputePool.length} ({(100 / randomReputePool.length).toLocaleString("vi-VN", { maximumFractionDigits: 2 })}%)</small><details className="quest-repute-options"><summary><ChevronRightIcon className="disclosure-icon" aria-hidden="true" />{randomReputePool.length} loại có thể nhận</summary><p>Mỗi lần nhận {number(proposal.repute)} điểm cho đúng một loại dưới đây:</p>{[...new Set(randomReputePool.map((entry) => entry.group))].map((group) => <div key={group}><strong>{group}</strong><ul>{randomReputePool.filter((entry) => entry.group === group).map((entry) => <li key={`${entry.camp}/${entry.classId}`}>{entry.name} <small>ID {entry.camp}/{entry.classId}</small></li>)}</ul></div>)}</details></> : <span className="quest-zero">0 điểm · không thêm</span>}</td>
              <td>{upgrades.length > 0 && <div className="quest-crystal-upgrade"><strong>Thay Huyền Tinh gốc:</strong><AwardLines awards={upgrades} /></div>}{proposal.crystal !== null && <><strong>+{proposal.crystalCount} Huyền Tinh cấp {proposal.crystal} khóa</strong><code>18,1,114,{proposal.crystal}</code><strong>+{proposal.spirit} Linh Khí khóa</strong><code>18,1,3071,1</code><small>Quà cuối tuyến</small></>}{proposal.crystal === null && upgrades.length === 0 && <span className="quest-zero">—</span>}</td>
            </tr>
          </tbody>;
        })}
        {visible.length === 0 && <tbody><tr><td colSpan={8} className="quest-empty">Không có nhiệm vụ phù hợp.</td></tr></tbody>}
      </table>
    </div>
    <nav className="quest-pagination" aria-label="Trang bảng thưởng"><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ArrowLeftIcon className="ui-icon ui-icon-sm" aria-hidden="true" />Trang trước</button><span>{currentPage + 1} / {pages}</span><button disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Trang sau<ArrowRightIcon className="ui-icon ui-icon-sm" aria-hidden="true" /></button></nav>
  </div>;
}
