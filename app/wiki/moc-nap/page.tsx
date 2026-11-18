import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import path from "node:path";
import { AdminShell } from "@/app/components/admin-shell";
import { loadTopupWiki } from "@/lib/topup-wiki";
import "./topup-wiki.css";

export const metadata: Metadata = {
  title: "Wiki Mốc Nạp · Kiếm Thế",
  description: "Quà từng mốc nạp, tên danh hiệu, nguyên liệu tự chọn và cách đổi bộ trang bị đồng hành.",
};

const number = (value: number) => value.toLocaleString("vi-VN");
const amount = (k: number) => k >= 1000 ? `${number(k / 1000)} triệu` : `${number(k)}K`;
const count = (value: number) => value >= 1000000000 ? `${number(value / 1000000000)} tỷ` : value >= 1000000 ? `${number(value / 1000000)} triệu` : number(value);

export default async function TopupWikiPage() {
  await connection();
  const data = await loadTopupWiki(path.resolve(process.cwd(), "../gameserver"));
  const titleByTier = new Map(data.titles.map((title) => [title.amountK, title]));
  const highest = data.milestones.at(-1)?.amountK ?? 0;
  const links = [
    ["cach-nhan", "Cách nhận quà"], ["bang-moc", `${data.milestones.length} mốc thưởng`],
    ["nguyen-lieu", "Nguyên liệu tự chọn"], ["doi-bo", "Đổi bộ đồng hành"], ["danh-hieu", "Danh hiệu và vòng sáng"],
  ];

  return <AdminShell section="wiki" wikiPage="moc-nap">
    <div className="page-content wiki-page topup-wiki" id="dau-trang-moc-nap">
      <header className="wiki-intro">
        <h1>Wiki Mốc Nạp</h1>
        <p>Tra cứu quà nạp tích lũy và cách nhận tại Cổ Phong Hà — Sứ giả hoạt động.</p>
        <div className="wiki-stats"><span><strong>{data.milestones.length}</strong> mốc đang mở</span><span><strong>{data.totals.credits}</strong> phiếu nguyên liệu</span><span><strong>{data.titles.length}</strong> bậc danh hiệu</span></div>
      </header>
      <aside className="wiki-scope">
        <strong>Tổng quà cơ bản khi nhận đủ các mốc đến {amount(highest)}</strong>
        <p><strong>{number(data.totals.materialUnits)} nguyên liệu tự chọn khóa</strong>, {count(data.totals.exp)} kinh nghiệm, {number(data.totals.repute)} Uy Danh, {count(data.totals.bonusCoin)} Đồng thưởng và {data.totals.books} bí kíp đồng hành đặc biệt. Đồng nhận từ tiền nạp được tính riêng.</p>
        <p>Quà thêm ở các mốc 20–30 triệu: <strong>{number(data.totals.knb)} Kim Nguyên Bảo Đại</strong>; {data.totals.crystals.map((crystal) => `${number(crystal.quantity)} Huyền Tinh cấp ${crystal.level}`).join(", ")}; {number(data.totals.preservationTalismans)} Bùa Bảo Toàn và {number(data.totals.rerollGuides)} Tử Không-Vô Hạ Dẫn. Các vật phẩm bổ sung đều khóa.</p>
        <p>Mỗi mốc nhận một lần theo tổng nạp tích lũy của nhân vật. Quà mốc cao được cộng thêm với quà mốc thấp. Bộ đồng hành đi theo tuyến đổi lên; cần dùng bộ trước để đổi bộ sau.</p>
        <p>EXP và tiền hiển thị là số cơ bản, trước phần thưởng tăng thêm từ danh hiệu đang đeo.</p>
      </aside>
      <div className="wiki-layout">
        <nav className="wiki-toc" aria-label="Mục lục mốc nạp"><div className="wiki-toc-heading">MỐC NẠP</div>{links.map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
        <div className="wiki-articles">
          <article className="wiki-card" id="cach-nhan">
            <header className="wiki-card-heading"><div><h2>Cách nhận quà</h2><p>Nạp cho đúng nhân vật, sau đó nhận trong game.</p></div></header>
            <div className="wiki-card-body">
              <ol className="wiki-steps"><li>Chọn nhân vật và ghi nạp tại <Link href="/topup">trang Nạp</Link>.</li><li>Đăng nhập nhân vật đó, gặp <strong>Cổ Phong Hà — Sứ giả hoạt động</strong>.</li><li>Chọn <strong>Nhận Đồng Nạp</strong> để rút Đồng, rồi <strong>Nhận Phúc Lợi Nạp</strong> để nhận từng mốc đã đủ.</li><li>Dùng <strong>Đổi phiếu nguyên liệu tự chọn</strong> hoặc <strong>Nhận/đổi bộ trang bị đồng hành</strong> để sử dụng quyền thưởng.</li></ol>
              <h3>Ô túi và nhận tiếp</h3>
              <p>Các mốc thông thường cần <strong>5 ô trống</strong>. Mốc 26–30 triệu cần <strong>13 ô trống</strong> cho 10 bí kíp không cộng dồn và ba loại quà bổ sung. Nếu nhận quà chưa hoàn tất, sắp xếp túi rồi chọn lại mốc để nhận tiếp phần còn thiếu; vật phẩm đã trao không được cấp lại.</p>
              <h3>Đồng chờ nhận</h3>
              <p>Tỷ lệ nạp local: <strong>1K = 100.000 Đồng không khóa</strong>. Ví giữ tối đa <strong>2 tỷ Đồng</strong>; phần tiền nạp vượt sức chứa được giữ chờ. Tiêu bớt Đồng rồi mở lại Sứ giả để nhận tiếp và cập nhật phần tích lũy còn lại. Mốc có Đồng thưởng cũng cần đủ sức chứa ví.</p>
              <p>Mốc đã nhận trước khi cập nhật không được phát lại quà. Tổng trên trang Nạp gồm cả khoản còn chờ nhận; trạng thái đủ mốc trên web không xác nhận quà đã được nhận trong game.</p>
            </div>
          </article>
          <article className="wiki-card" id="bang-moc">
            <header className="wiki-card-heading"><div><h2>{data.milestones.length} mốc thưởng</h2><p>Chọn “Xem quà” ở mỗi dòng để xem đầy đủ số lượng.</p></div></header>
            <div className="wiki-card-body">
              <div className="newplayer-table-wrap" role="region" aria-label="Bảng quà từng mốc nạp" tabIndex={0}><table className="newplayer-table topup-wiki-tier-table"><thead><tr><th scope="col">Mốc tích lũy</th><th scope="col">Danh hiệu</th><th scope="col">Phần thưởng</th></tr></thead><tbody>
                {data.milestones.map((tier) => <tr key={tier.amountK} data-topup-tier={tier.amountK}><th scope="row">{amount(tier.amountK)}</th><td>{titleByTier.get(tier.amountK)?.name ?? "—"}</td><td><details className="topup-wiki-gifts"><summary>Xem quà · {tier.rewards.length} loại</summary><ul>{tier.rewards.map((reward) => <li key={reward.name}><strong>{number(reward.quantity)}</strong> × {reward.name}</li>)}</ul></details></td></tr>)}
              </tbody></table></div>
              <p>Phiếu nguyên liệu và quyền đổi bộ được lưu theo nhân vật để sử dụng tại Sứ giả. Các mốc trên {amount(highest)} hiện chưa mở.</p>
            </div>
          </article>
          <article className="wiki-card" id="nguyen-lieu">
            <header className="wiki-card-heading"><div><h2>Nguyên liệu tự chọn</h2><p>{data.totals.credits} phiếu khi nhận đủ các mốc đến {amount(highest)}.</p></div></header>
            <div className="wiki-card-body">
              <p>Chọn <strong>Đổi phiếu nguyên liệu tự chọn</strong> tại Sứ giả. Mỗi phiếu tương ứng <strong>{number(data.unitsPerCredit)} nguyên liệu khóa</strong> của một loại trong danh sách bên dưới; mỗi lần đổi tối đa {number(data.unitsPerCredit)} nguyên liệu.</p>
              <ul className="topup-wiki-materials">{data.materials.map((material) => <li key={material.id}>{material.name}</li>)}</ul>
              <p>Có thể chia phiếu cho nhiều loại hoặc tập trung vào loại đang cần nâng. Cần ít nhất một ô túi trống; phần nguyên liệu chưa nhận được giữ lại. Nguyên liệu giúp thực hiện lượt nâng, không bảo đảm nâng cấp thành công.</p>
            </div>
          </article>
          <article className="wiki-card" id="doi-bo">
            <header className="wiki-card-heading"><div><h2>Đổi bộ đồng hành</h2><p>Nhận một bộ đầu, sau đó dùng bộ cũ đổi lên bộ kế tiếp.</p></div></header>
            <div className="wiki-card-body">
              <div className="newplayer-table-wrap" role="region" aria-label="Tuyến đổi bộ đồng hành theo mốc nạp" tabIndex={0}><table className="newplayer-table"><thead><tr><th scope="col">Mốc</th><th scope="col">Bộ nhận được</th><th scope="col">Điều kiện</th></tr></thead><tbody>{data.equipment.map((stage) => <tr key={stage.amountK}><th scope="row">{amount(stage.amountK)}</th><td>{stage.name} · 5 món khóa</td><td>{stage.previousName ? `Đổi đủ 5 món bộ ${stage.previousName}` : "Nhận bộ đầu, không cần bộ cũ"}</td></tr>)}</tbody></table></div>
              <p>Nhận mốc trước, sau đó chọn <strong>Nhận/đổi bộ trang bị đồng hành</strong>. Tháo đủ 5 món bộ cũ vào túi; thuộc tính riêng của đồ cũ không chuyển sang bộ mới. Hệ thống lưu tiến độ từng món: nếu đổi gián đoạn, chọn lại để hoàn tất các món còn lại, không nhận thêm bản sao.</p>
              <p>Nhân vật đã nhận các bộ theo bảng quà trước đây được giữ đồ và lượt nhận cũ; không tự phát lại bộ mới.</p>
            </div>
          </article>
          <article className="wiki-card" id="danh-hieu">
            <header className="wiki-card-heading"><div><h2>Danh hiệu và vòng sáng</h2><p>Tên chính xác theo cấu hình danh hiệu hiện tại.</p></div></header>
            <div className="wiki-card-body">
              <p>Nhận mốc thấp sau mốc cao không hạ danh hiệu đang dùng. Danh hiệu đang đeo tăng thưởng EXP, Đồng hoặc Bạc theo mô tả bên dưới; hiệu ứng của các danh hiệu không cộng dồn.</p>
              <div className="newplayer-table-wrap" role="region" aria-label="Tên danh hiệu chính xác theo mốc nạp" tabIndex={0}><table className="newplayer-table"><thead><tr><th scope="col">Mốc</th><th scope="col">Danh hiệu</th><th scope="col">Hiệu ứng khi đeo</th><th scope="col">Thời hạn</th></tr></thead><tbody>{data.titles.map((title) => <tr key={title.amountK}><th scope="row">{amount(title.amountK)}</th><td>{title.name}</td><td>{title.description}</td><td>{title.durationMinutes === 0 ? "Vĩnh viễn" : `${number(title.durationMinutes)} phút`}</td></tr>)}</tbody></table></div>
            </div>
          </article>
        </div>
      </div>
    </div>
  </AdminShell>;
}
