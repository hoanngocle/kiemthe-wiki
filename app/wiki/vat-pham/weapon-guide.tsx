import Link from "next/link";
import path from "node:path";
import type { ReactNode } from "react";
import { loadWeaponWiki } from "@/lib/weapon-wiki";

type Wiki = Awaited<ReturnType<typeof loadWeaponWiki>>;
const route = "/wiki/vat-pham?group=vu-khi";
const number = new Intl.NumberFormat("vi-VN");
const materialNames: Record<string, string> = {
  "18,1,1338,1": "Kim Nguyên Bảo Đại",
  "18,1,3035,2": "Bát Quái Lệnh",
};

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return <section id={id} className="wiki-card weapon-section" aria-labelledby={`${id}-title`}>
    <header className="wiki-card-heading"><h2 id={`${id}-title`}>{title}</h2></header>
    <div className="wiki-card-body">{children}</div>
  </section>;
}

function UpgradePath({ recipes }: { recipes: Wiki["recipes"] }) {
  const upgrades = recipes.filter((recipe) => recipe.id !== "doivukhihao");
  const exchange = recipes.find((recipe) => recipe.id === "doivukhihao")!;
  const totals = new Map<string, number>();
  for (const recipe of upgrades) {
    for (const cost of recipe.costs) totals.set(cost.id, (totals.get(cost.id) ?? 0) + cost.count);
  }

  return <Section id="ghep-vu-khi" title="Cấp 130 · Hạo Thiên đến Tử Không">
    <p>Gặp <strong>Quan Ưng Phi</strong> ở <strong>Giang Tân Thôn</strong> hoặc <strong>Phượng Tường Phủ</strong>, chọn <strong>Hệ Thống Vũ Khí Hạo Thiên</strong>. Chuẩn bị vũ khí vĩnh viễn và chừa ít nhất một ô hành trang. Các bước ghép thành công 100% khi đủ điều kiện.</p>
    <div className="weapon-table-scroll" role="region" aria-label="Công thức ghép vũ khí cấp 130" tabIndex={0}>
      <table className="weapon-table weapon-upgrades">
        <thead><tr><th scope="col">Vũ khí đem ghép</th><th scope="col">Menu tại NPC</th><th scope="col">Nguyên liệu và vị trí đặt</th><th scope="col">Rương nhận được</th></tr></thead>
        <tbody>{upgrades.map((step) => <tr key={step.id}>
          <th scope="row">{step.input}<small>Mã mẫu {step.minId}–{step.maxId}</small></th>
          <td>{step.menu}</td>
          <td><strong>{step.materialsInGift ? "Đặt vũ khí và nguyên liệu vào khung" : "Đặt vũ khí vào khung, giữ nguyên liệu trong túi"}</strong>
            <ul>{step.costs.map(({ id, count }) => <li key={id}>{number.format(count)} {materialNames[id] ?? id}</li>)}</ul>
          </td>
          <td><strong>Rương {step.output}</strong><small><code>{step.outputId}</code></small></td>
        </tr>)}</tbody>
      </table>
    </div>
    <ol className="weapon-notes">
      <li>Mở rương bằng chuột phải, chọn <strong>loại vũ khí → ngũ hành → biến thể</strong>. Kiểm tra lựa chọn trước khi nhận.</li>
      <li>Tổng nguyên liệu từ một món Thần Sa lên Tử Không 10 dòng là <strong>{[...totals].map(([id, count]) => `${number.format(count)} ${materialNames[id] ?? id}`).join(" và ")}</strong>.</li>
      <li>Đổi biến thể Hạo Thiên tại mục <strong>{exchange.menu}</strong>. Đặt Hạo Thiên vào khung và để {number.format(exchange.costs[0].count)} {materialNames[exchange.costs[0].id]} trong túi. Mở rương nhận lại để chọn mẫu.</li>
    </ol>
    <p><Link href="/wiki/nang-cap#vu-khi-hao-thien">Xem thêm công thức trong Wiki Nâng Cấp</Link></p>
  </Section>;
}


export async function WeaponGuide() {
  const wiki = await loadWeaponWiki(path.resolve(process.cwd(), "../gameserver"));
  return <div>
      <Section id="cap-1-109" title="Cấp 1–109 · Chọn vũ khí theo mốc">
        <p><strong>Cấp mặc</strong> là cấp nhân vật cần đạt. <strong>Cấp trang bị</strong> là số bậc hiển thị trên món. Ví dụ Hạo Thiên là trang bị cấp 10 và yêu cầu nhân vật cấp 130.</p>
        <p>Từ cấp 1–9, dùng vũ khí khởi đầu nào bạn đã có và đủ điều kiện mặc. Từ cấp 10, đổi sang vũ khí đúng loại và hệ mà nhánh kỹ năng yêu cầu.</p>
        <div className="weapon-levels">
          {Array.from({ length: 10 }, (_, i) => <span key={i}>Cấp {(i + 1) * 10}–{(i + 1) * 10 + 9}<strong>Trang bị cấp {i + 1}</strong></span>)}
        </div>
        <p>Giữ lại món cấp mặc 100 nếu định luyện hóa lên Thanh Đồng. Tra cột món đầu vào trong <Link href={`${route}&family=thanh-dong#danh-muc`}>danh mục Thanh Đồng</Link> để chọn đúng mẫu.</p>
      </Section>

      <Section id="tan-lang" title="Cấp 110–129 · Vũ khí Tần Lăng">
        <div className="weapon-table-scroll" role="region" aria-label="Nguồn vũ khí Tần Lăng cấp 110" tabIndex={0}>
          <table className="weapon-table">
            <thead><tr><th scope="col">Dòng vũ khí</th><th scope="col">Đầu vào hoặc điều kiện</th><th scope="col">Cách nhận</th></tr></thead>
            <tbody>
              <tr><th scope="row"><Link href={`${route}&family=thanh-dong#danh-muc`}>Thanh Đồng</Link></th><td>Vũ khí cấp mặc 100 đúng mã + 1 Luyện Hóa Đồ Thanh Đồng + 50.000 bạc.</td><td>Luyện hóa tại Dã Luyện Đại Sư. Ví dụ <strong>Long Hành Đao</strong> <code>2,2,105,10</code> → <strong>Tam Sách Đoạn Hầu Đao</strong> <code>2,2,149,10</code>. Danh mục có {wiki.refineCount} cặp luyện hóa theo mã.</td></tr>
              <tr><th scope="row"><Link href={`${route}&family=bach-kim#danh-muc`}>Tần Lăng 2 · Bạch Kim</Link></th><td>Danh vọng Phát Khâu Môn cấp 2.</td><td>Mua theo hệ tại Bạch Miêu Miêu, khu an toàn tầng 3 Tần Lăng. Ví dụ Long Vương Thương, Hồng Liên Tiễn.</td></tr>
              <tr><th scope="row"><Link href={`${route}&family=hoang-kim#danh-muc`}>Tần Lăng 3 · Hoàng Kim</Link></th><td>Danh vọng Phát Khâu Môn cấp 3.</td><td>Mua theo hệ tại Bạch Miêu Miêu. Ví dụ Liệt Hồn Kích, U Minh Tiễn.</td></tr>
            </tbody>
          </table>
        </div>
        <ul className="weapon-notes">
          <li>Dùng <strong>Tần Lăng–Ngọc Phù</strong> để tăng danh vọng Phát Khâu Môn đến cấp 2. Dùng <strong>Tần Lăng–Hòa Thị Bích</strong> để lên cấp 3.</li>
          <li>Dã Tẩu ở khu an toàn tầng 3 đổi <strong>5 Hòa Thị Bích</strong> lấy một Luyện Hóa Đồ Thanh Đồng. Có thể đổi bằng <strong>500 điểm Phát Khâu Môn</strong> nếu đủ điểm trong cấp danh vọng hiện tại.</li>
          <li>Menu Bạch Miêu Miêu ghi “cấp 120”. Cấp mặc trên các món của quầy là <strong>110</strong>.</li>
        </ul>
      </Section>

      <Section id="than-sa" title="Cấp 130 · Kiếm vũ khí Thần Sa">
        <ul className="weapon-notes">
          <li><strong>Thần Sa 0 dòng.</strong> Gặp Âu Dương Phong, vào <strong>Shop Vật Phẩm</strong>. Quầy yêu cầu danh vọng Phát Khâu Môn cấp 3. Danh mục hiển thị giá theo mẫu. Nếu đã có Rương Vũ Khí Thần Sa 0 Dòng, mở rương để chọn loại vũ khí và biến thể.</li>
          <li><strong>Thần Sa 1–4 dòng.</strong> Người kết liễu Tần Thủy Hoàng ở tầng 5 có cơ hội nhận rương hệ chính. Mỗi bậc rương chiếm một trong sáu kết quả rút thưởng theo script. Tra danh mục để kiểm tra mẫu nào có trong rương hệ chính hoặc rương song tu.</li>
          <li>Có thể dùng <strong>Thần Sa 0 dòng</strong> để ghép thẳng Hạo Thiên. Ví dụ <strong>Thần Sa–Bá Vương Kích</strong> <code>2,1,1700,10</code> → <strong>Rương Hạo Thiên 5 dòng</strong> tại Quan Ưng Phi.</li>
        </ul>
        <p><Link href={`${route}&family=than-sa#danh-muc`}>Tra vũ khí Thần Sa theo hệ</Link></p>
      </Section>

      <UpgradePath recipes={wiki.recipes} />
  </div>;
}
