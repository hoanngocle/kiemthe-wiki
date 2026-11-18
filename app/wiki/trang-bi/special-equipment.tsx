import Link from "next/link";
import {
  cosmeticStones, selectSpecialEquipment, type SpecialEquipmentFilters, type SpecialEquipmentItem, type SpecialEquipmentSlot,
} from "@/lib/special-equipment-wiki";

const number = new Intl.NumberFormat("vi-VN");
const route = "/wiki/trang-bi";

function catalogueUrl(slot: SpecialEquipmentSlot, filters: SpecialEquipmentFilters = {}) {
  const params = new URLSearchParams({ slot: slot.key });
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  return `${route}?${params}#danh-muc`;
}

function ItemLink({ slot, item }: { slot: SpecialEquipmentSlot; item: SpecialEquipmentItem }) {
  return <Link href={catalogueUrl(slot, { q: item.id })}>{item.name} <code>{item.id}</code></Link>;
}

export function CosmeticMaterials() {
  return <details className="equipment-brief">
    <summary>Tinh Thạch luyện hóa</summary>
    <div className="weapon-table-scroll" role="region" aria-label="Tinh Thạch luyện hóa" tabIndex={0}>
      <table className="weapon-table">
        <thead><tr><th scope="col">Đá mỗi lượt</th><th scope="col">Cấp hiện tại đạt 100%</th><th scope="col">Mốc lên được</th></tr></thead>
        <tbody>{cosmeticStones.map(({ level, name, through }) => <tr key={level}>
          <th scope="row">1 {name} <small><code>18,1,1331,{level}</code></small></th>
          <td>0–{through}</td><td>{through + 1}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <ul>
      <li>Vượt mốc 1–6 cấp: 40%, 18%, 12%, 5%, 3%, 1%. Vượt 7 cấp trở lên: 0%.</li>
      <li>Bạch Hổ Đường: Tinh Thạch Phượng Hoàng. Túi Tân Thủ → Ghép Tinh Thạch: 10 viên đổi 1 viên bậc kế, đến Thánh Hỏa.</li>
      <li>Thánh Hỏa: Quan Phi Phi → Du Long (200 Tiền Du Long) hoặc Tích Lũy Sự Kiện (10 thẻ).</li>
      <li>Kim Long: Kỳ Trân Các, 160.000 Đồng thường hoặc Đồng khóa theo cấu hình.</li>
    </ul>
  </details>;
}

function QuickLookup({ slot, items }: { slot: SpecialEquipmentSlot; items: SpecialEquipmentItem[] }) {
  if (slot.key === "ngoai-trang-ao" || slot.key === "ngoai-trang-non") return <CosmeticMaterials />;
  if (slot.key === "phi-phong") return <div className="equipment-brief">
    Mua mẫu bậc Vinh dự cao hơn · Tạ Hiền → Phi Phong đổi Hồn Thạch (mẫu đúng hệ, còn ít nhất 1 ngày)
  </div>;
  if (slot.key === "dong-hanh") return <div className="equipment-brief">
    Bộ 6 → 7 → 8 → 9 → Vô Minh 10 → Vô Thần 11 · <Link href="/wiki/nang-cap#trang-bi-dong-hanh">Kỹ Năng Đồng Hành</Link>
  </div>;
  if (slot.key === "an") return <div className="equipment-brief">
    <Link href={catalogueUrl(slot, { q: "1,16,13,1" })}>Ghép Truyền Kỳ Ấn</Link>
    {" · "}<Link href={catalogueUrl(slot, { q: "1,16,22,1" })}>Truyền Kỳ 10 → Phong Thần 1</Link>
    {" · "}<Link href={`${route}?slot=thanh-linh`}>Thánh Linh</Link>
  </div>;
  if (slot.key === "mat-na") return <div className="equipment-brief">
    <Link href={catalogueUrl(slot, { q: "1,13,178,4" })}>Bôn Lôi khởi đầu</Link>
    {" · "}<Link href={catalogueUrl(slot, { q: "1,13,218,4" })}>Bôn Lôi 40 → Bá Chủ 1</Link>
  </div>;
  if (slot.key !== "ngua" && slot.key !== "phap-bao") return null;
  const starters = items.filter((item) => item.rank === 1 && item.sources.some(({ where }) =>
    where.includes(slot.key === "ngua" ? "Nhận Thú Cưỡi VIP" : "Nhận Pháp Bảo cấp 1")));
  const exchanges = items.filter((item) => item.exchange);
  return <div className="equipment-quick-links">
    <details className="equipment-brief">
      <summary>Mẫu cấp 1 ({starters.length})</summary>
      <ul>{starters.map((item) => <li key={item.id}><ItemLink slot={slot} item={item} /></li>)}</ul>
    </details>
    <details className="equipment-brief">
      <summary>Mẫu hoán đổi ({exchanges.length})</summary>
      <ul>{exchanges.map((item) => <li key={item.id}><ItemLink slot={slot} item={item} /></li>)}</ul>
    </details>
  </div>;
}

export function SpecialEquipment({ slot, items, filters }: {
  slot: SpecialEquipmentSlot; items: SpecialEquipmentItem[]; filters: SpecialEquipmentFilters;
}) {
  const result = selectSpecialEquipment(items, filters);
  const levels = [...new Set(items.map(({ wearLevel }) => wearLevel ?? 0))].sort((a, b) => a - b);
  const groups = [...new Set(items.map(({ group }) => group))];
  const byId = new Map(items.map((item) => [item.id, item]));
  const inputs = new Map<string, SpecialEquipmentItem[]>();
  for (const item of items) {
    const target = item.upgrade?.targetId;
    if (target && target !== item.id) inputs.set(target, [...(inputs.get(target) ?? []), item]);
  }
  return <section className="wiki-card weapon-section" id="danh-muc" aria-labelledby="danh-muc-title">
    <header className="wiki-card-heading" id="lo-trinh"><h2 id="danh-muc-title">{slot.name}</h2></header>
    <div className="wiki-card-body">
      <QuickLookup slot={slot} items={items} />
      <form action={`${route}#danh-muc`} className="wiki-toolbar weapon-filters">
        <input type="hidden" name="slot" value={slot.key} />
        <label className="wiki-search"><span>Tên hoặc mã vật phẩm</span><input name="q" type="search" defaultValue={filters.q} maxLength={150} /></label>
        {groups.length > 1 && <label className="wiki-filter"><span>{slot.key === "dong-hanh" ? "Vị trí đồng hành" : "Dòng trang bị"}</span><select name="group" defaultValue={filters.group ?? ""}><option value="">Tất cả</option>{groups.map((group) => <option key={group}>{group}</option>)}</select></label>}
        {levels.length > 1 && <label className="wiki-filter"><span>Cấp mặc</span><select name="level" defaultValue={filters.level ?? ""}><option value="">Tất cả</option>{levels.map((level) => <option key={level} value={level}>{level || "Chưa ghi cấp mặc"}</option>)}</select></label>}
        <button type="submit" className="weapon-submit">Lọc</button>
      </form>
      <div className="weapon-result-bar"><span>{number.format(result.total)} mẫu</span>
        {(filters.q || filters.group || filters.level) && <Link href={catalogueUrl(slot)}>Xóa bộ lọc</Link>}
      </div>
      {result.items.length ? <div className="weapon-table-scroll" role="region" aria-label={`Danh mục ${slot.name}`} tabIndex={0}>
        <table className="weapon-table weapon-catalogue equipment-catalogue">
          <thead><tr><th scope="col">Vật phẩm</th><th scope="col" title="Cấp nhân vật để mặc">Cấp mặc</th><th scope="col">Cách nhận</th>{slot.key !== "phi-phong" && <th scope="col">Lên món · Nguyên liệu · Nơi nâng</th>}</tr></thead>
          <tbody>{result.items.map((item) => {
            const target = item.upgrade && byId.get(item.upgrade.targetId);
            const previous = inputs.get(item.id) ?? [];
            const step = item.upgrade ?? item.exchange;
            const rank = item.rankLabel ?? (item.trainingCap ? `Tối đa ${item.trainingCap} mỗi dòng` : item.rank === null ? "" : `Bậc ${item.rank}`);
            return <tr key={item.id}>
              <th scope="row">{item.name}<small><code>{item.id}</code> · {item.variant || item.group}</small></th>
              <td>{item.wearLevel ?? <span title="Chưa có cấp mặc trong cấu hình">—</span>}{rank && <small>{rank}</small>}{item.wearNote && <small>{item.wearNote}</small>}</td>
              <td>{item.sources.length || previous.length || item.exchange
                ? <div className="equipment-sources">{item.sources.map((source, index) => <div key={index}>
                  {source.where}<small>{source.costs}{source.note && ` · ${source.note}`}</small>
                </div>)}
                  {previous.map((source) => <div key={source.id}>Từ <ItemLink slot={slot} item={source} /></div>)}
                  {item.exchange && <div>Hoán đổi từ {item.exchange.input}</div>}
                </div> : <span className="weapon-muted">Chưa xác minh</span>}</td>
              {slot.key !== "phi-phong" && <td>{step ? <div className="equipment-sources">
                <div>
                  <strong>{target && target.id !== item.id ? <ItemLink slot={slot} item={target} /> : item.upgrade?.result ?? item.exchange?.result ?? "Cùng món"}</strong>
                  <small>{step.costs}</small><small>{step.where}</small>{step.note && <small>{step.note}</small>}
                </div>
                {item.alternativeUpgrade && <div>
                  <strong>Dùng sách</strong>
                  <small>{item.alternativeUpgrade.costs}</small><small>{item.alternativeUpgrade.where}</small>
                  {item.alternativeUpgrade.note && <small>{item.alternativeUpgrade.note}</small>}
                </div>}
              </div> : "—"}</td>}
            </tr>;
          })}</tbody>
        </table>
      </div> : <p>Không tìm thấy mẫu trang bị.</p>}
      {result.pages > 1 && <nav className="weapon-pagination" aria-label="Phân trang trang bị">
        {result.page > 1 && <Link href={catalogueUrl(slot, { ...filters, page: String(result.page - 1) })}>Trang trước</Link>}
        <span>Trang {result.page} / {result.pages}</span>
        {result.page < result.pages && <Link href={catalogueUrl(slot, { ...filters, page: String(result.page + 1) })}>Trang sau</Link>}
      </nav>}
    </div>
  </section>;
}
