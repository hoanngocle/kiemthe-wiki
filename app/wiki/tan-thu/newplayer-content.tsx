import { Children, isValidElement, type ReactNode } from "react";

function contentText(children: ReactNode): string {
  return Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    return isValidElement<{ children?: ReactNode }>(child) ? contentText(child.props.children) : "";
  }).join(" ");
}

const sectionContent = [
  {
    id: "tra-cuu-nhanh",
    title: "Tra cứu nhanh",
    content: <div className="wiki-card-body">
<div className="newplayer-table-wrap" role="region" aria-label="Menu Tân Thủ trong game" tabIndex={0}><table className="newplayer-table"><thead><tr><th scope="col">Menu</th><th scope="col">Công dụng</th><th scope="col">Điều kiện / Chi phí</th></tr></thead><tbody>
<tr><td>Chuyển Sinh</td><td>Nhận 500 điểm tiềm năng mỗi lần, giữ cấp kỹ năng</td><td>10 KNB Đại mỗi lần, tối đa 50 lần</td></tr>
<tr><td>Mua Kim Nguyên Bảo Đại</td><td>Mua gói 1, 10 hoặc 100 viên bằng một trong bốn loại tiền</td><td>Mỗi viên: 100.000 Đồng thường/Đồng khóa; 40.000.000 Bạc thường; 60.000.000 Bạc khóa</td></tr>
<tr><td>Nhận Túi Tân Thủ</td><td>Nhận 1 túi miễn phí</td><td>Nhận túi mới không đặt lại lượt thưởng</td></tr>
<tr><td>Nhận Lệnh Bài Admin</td><td>Nhận Thẻ Admin để mở công cụ quản trị</td><td>—</td></tr>
<tr><td>Tiêu Hủy Đạo Cụ</td><td>Xóa vật phẩm đặt vào khung tiêu hủy</td><td>Không hoàn lại; không nhận phần thưởng</td></tr>
<tr><td>Lần Tới Ta Quay Lại</td><td>Đóng hội thoại</td><td>—</td></tr>
</tbody></table></div>
    </div>,
  },
  {
    id: "tien-hanh-chuyen-sinh",
    title: "Chuyển Sinh",
    content: <div className="wiki-card-body">
<p>Mỗi lần tốn <strong>10 Kim Nguyên Bảo Đại</strong> và cộng <strong>500 điểm tiềm năng</strong>. Tối đa <strong>50 lần</strong>. Số lần đã chuyển sinh được tính vào giới hạn này.</p>
              <h3>{"Cấp độ cần có"}</h3>
              <div className="newplayer-table-wrap" role="region" aria-label="Cấp tối thiểu theo lần chuyển sinh" tabIndex={0}><table className="newplayer-table"><thead><tr><th scope="col">Lần chuyển sinh</th><th scope="col">Cấp tối thiểu</th></tr></thead><tbody>
<tr><td>1–10</td><td>160</td></tr>
<tr><td>11–20</td><td>170</td></tr>
<tr><td>21–30</td><td>180</td></tr>
<tr><td>31–40</td><td>190</td></tr>
<tr><td>41–50</td><td>200</td></tr></tbody></table></div>
              <h3>{"Khi chuyển sinh thành công"}</h3>
              <p>Nhân vật về cấp 130 rồi nhận kinh nghiệm cho một cấp tiếp theo. Tiềm năng đã phân bổ được đặt lại. Cấp kỹ năng đã học và điểm kỹ năng chưa dùng được giữ lại.</p>
              <h3>Trang bị</h3>
              <p>Yêu cầu trống <strong>10 ô trang bị chính</strong> khi bấm <strong>Bắt đầu</strong>: mũ, áo, đai lưng, vũ khí, giày, hộ uyển, hộ thân phù, nhẫn, hạng liên và ngọc bội.</p>
    </div>,
  },
  {
    id: "mua-kim-nguyen-bao-ai",
    title: "Mua Kim Nguyên Bảo Đại",
    content: <div className="wiki-card-body">
              <div className="newplayer-table-wrap" role="region" aria-label="Giá mua Kim Nguyên Bảo Đại" tabIndex={0}>
                <table className="newplayer-table"><thead><tr><th scope="col">Số lượng</th><th scope="col">Đồng thường</th><th scope="col">Đồng khóa</th><th scope="col">Bạc thường</th><th scope="col">Bạc khóa</th></tr></thead><tbody>
<tr><td>1 KNB Đại</td><td>100.000</td><td>100.000</td><td>40.000.000</td><td>60.000.000</td></tr>
<tr><td>10 KNB Đại</td><td>1.000.000</td><td>1.000.000</td><td>400.000.000</td><td>600.000.000</td></tr>
<tr><td>100 KNB Đại</td><td>10.000.000</td><td>10.000.000</td><td>4.000.000.000</td><td>6.000.000.000</td></tr>
</tbody></table>
              </div>
              <p>Mua bằng Đồng thường cần lần lượt <strong>1 / 5 / 10 ô trống</strong> cho gói 1 / 10 / 100 viên. Mua bằng Đồng khóa, Bạc thường hoặc Bạc khóa cần ít nhất <strong>1 ô trống</strong>.</p>
              <p>Chuột phải <strong>1 Kim Nguyên Bảo Đại</strong> nhận <strong>100.000 Đồng thường (10 vạn)</strong> và tiêu hao viên đó.</p>
    </div>,
  },
  {
    id: "nhan-lai-tui-tan-thu",
    title: "Nhận Túi Tân Thủ",
    content: <div className="wiki-card-body">
<p>Nhân vật mới bắt đầu ở <strong>cấp 1</strong> và nhận <strong>1 Túi Tân Thủ</strong>. Chuột phải túi để xem các mốc thưởng.</p>
              <p>Nhận túi mới không đặt lại lượt nhận quà.</p>
              <h3>{"Quà và vật phẩm hỗ trợ trong túi"}</h3>
              <div className="newplayer-table-wrap" role="region" aria-label="Mục, Điều kiện và kết quả" tabIndex={0}><table className="newplayer-table"><thead><tr><th scope="col">{"Mục"}</th><th scope="col">{"Điều kiện và kết quả"}</th></tr></thead><tbody><tr><td>{"Quà OPEN"}</td><td>{"Mỗi nhân vật nhận một lần sau khi chọn môn phái và nhánh kỹ năng. Phần thưởng gồm 100.000 Bạc thường, 100.000 Đồng khóa, 100.000 Bạc khóa và danh hiệu Tân Thủ."}</td></tr>
<tr><td>{"Nhận thưởng Cấp độ"}</td><td>{"10 mốc từ cấp 10 đến 99; nhận lần lượt, mỗi mốc một lần; không cần nạp. Chi tiết trong bảng bên dưới."}</td></tr>
<tr><td>{"Rương Mật Tịch (Cao)"}</td><td>{"Nhận 1 rương khóa, một lần theo nhân vật"}</td></tr>
<tr><td>{"Nhận GIFTCODE open"}</td><td>{"Nhận một lần, cần 15 ô trống. Nhận 1.000.000 Bạc thường, 100.000 Đồng khóa, 1 Hắc Huyết Thần Ngưu S và danh hiệu Tân Thủ"}</td></tr>
<tr><td>{"Tiêu Hủy Nhiều Đạo Cụ"}</td><td>{"Mở khung xóa những vật phẩm được đặt vào"}</td></tr>
</tbody></table></div>
              <p><strong>Quà OPEN và Code Open Sever là hai phần thưởng riêng.</strong> Code Open Sever nhận trực tiếp, không cần nhập mã.</p>
              <h3>Nhận thưởng Cấp độ</h3>
              <div className="newplayer-table-wrap" role="region" aria-label="Phần thưởng theo cấp độ" tabIndex={0}><table className="newplayer-table"><thead><tr><th scope="col">Cấp</th><th scope="col">Đồng thường</th><th scope="col">Bạc thường</th><th scope="col">Tinh lực / Hoạt lực (mỗi loại)</th><th scope="col">Vật phẩm kèm theo</th></tr></thead><tbody>
                <tr><td>10</td><td>10 vạn</td><td>100 vạn</td><td>5.000</td><td>1 Vô Hạn Truyền Tống Phù; 1 Lệnh bài mở rộng rương Lv2; 1 Lệnh bài mở rộng rương Lv1 (khóa)</td></tr>
                <tr><td>20</td><td>20 vạn</td><td>200 vạn</td><td>10.000</td><td>3 Túi Bàn Long (khóa)</td></tr>
                <tr><td>30</td><td>30 vạn</td><td>300 vạn</td><td>15.000</td><td>1 Đồng hành năm mới; 1 Lệnh bài mở rộng rương Lv2 (khóa)</td></tr>
                <tr><td>40</td><td>50 vạn</td><td>500 vạn</td><td>20.000</td><td>1 [Tuyết Cơ] LV1; 1 Đồng hành năm mới</td></tr>
                <tr><td>50</td><td>70 vạn</td><td>700 vạn</td><td>30.000</td><td>1 Lệnh bài mở rộng rương Lv3; 1 Rương Thú Cưng (Vĩnh viễn, khóa)</td></tr>
                <tr><td>60</td><td>100 vạn</td><td>1000 vạn</td><td>40.000</td><td>1 Lệnh bài mở rộng rương Lv4</td></tr>
                <tr><td>69</td><td>150 vạn</td><td>1500 vạn</td><td>50.000</td><td>1 Truyền Kỳ Ấn Cấp 1 (khóa)</td></tr>
                <tr><td>79</td><td>200 vạn</td><td>2000 vạn</td><td>70.000</td><td>1 bộ 5 món trang bị đồng hành Bạch Kim (khóa); 1 Mặt nạ Hàng Long Phục Hổ Quán (khóa)</td></tr>
                <tr><td>89</td><td>300 vạn</td><td>3000 vạn</td><td>100.000</td><td>1 bộ 5 món trang bị đồng hành Bạch Kim +1 (khóa); 1 Già Lam Kinh cấp 4 (khóa)</td></tr>
                <tr><td>99</td><td>500 vạn</td><td>5000 vạn</td><td>150.000</td><td>6 Lệnh Bài Triệu Hồi Boss Tứ Bất Tượng; 1 Mặt nạ Bôn Lôi Quán cấp 4 (khóa); 1 Ngọc Trúc Mai Hoa (Tháng, khóa)</td></tr>
              </tbody></table></div>
              <p>Khi túi đầy hoặc tài nguyên chạm giới hạn, tiến độ nhận thưởng được lưu lại.</p>
              <p>Kỹ năng <strong>Tăng Exp Đánh Quái</strong> tự nhận ở cấp nhân vật 50. Từ cấp 55 đến 140, cứ mỗi 5 cấp nhân vật kỹ năng tăng 1 cấp. Kỹ năng giữ cấp 19 đến cấp nhân vật 149 và đạt cấp 20 ở cấp nhân vật 150. Mỗi cấp kỹ năng cộng 10% EXP đánh quái.</p>
              <p>Nhân vật GameMaster có thêm mục Chức năng Administrator trong túi.</p>
    </div>,
  },
  {
    id: "nhan-lenh-bai-admin",
    title: "Nhận Lệnh Bài Admin",
    content: <div className="wiki-card-body">
<p>Nhận <strong>1 Thẻ Admin</strong>. Chuột phải để mở công cụ quản trị và xem bản đồ, tọa độ hiện tại.</p>
              <div className="newplayer-table-wrap" role="region" aria-label="Nhóm chức năng trên thẻ, Công dụng" tabIndex={0}><table className="newplayer-table"><thead><tr><th scope="col">{"Nhóm chức năng trên thẻ"}</th><th scope="col">{"Công dụng"}</th></tr></thead><tbody><tr><td>{"GOI BOSS"}</td><td>{"Mở các lựa chọn điều khiển boss hoặc đợt hoạt động liên quan"}</td></tr>
<tr><td>{"Game Master - Administrator"}</td><td>{"Quản lý nhân vật theo tên hoặc người chơi gần đó, kiểm tra online, ẩn thân và một số dữ liệu nhân vật"}</td></tr>
<tr><td>{"Một Số Hàm Quan Trọng"}</td><td>{"Thêm danh hiệu, NPC, vật phẩm, trang bị và kỹ năng; xóa NPC hoặc kỹ năng; thử kỹ năng và hình ảnh"}</td></tr>
<tr><td>{"Thông Báo Thế Giới"}</td><td>{"Mở chức năng gửi thông báo toàn máy chủ"}</td></tr>
<tr><td>{"Chức năng Nâng Cao"}</td><td>{"Mở nhóm Bạc và Đồng, bang hội và gia tộc, quan hàm và quan ấn, danh vọng, trang bị, vật phẩm, thú cưỡi và đồng hành, tiềm năng, kỹ năng và kinh nghiệm"}</td></tr>
<tr><td>{"++Đảo Hoa Nguyên++"}</td><td>{"Dịch chuyển tới Đào Hoa Nguyên"}</td></tr>
<tr><td>{"NẠP ĐỒNG CHO MEMBER"}</td><td>{"Nạp theo tên nhân vật đang online; số tiền tính theo đơn vị K"}</td></tr>
<tr><td>{"Bỏ tất cả đạo cụ trong túi"}</td><td>{"Xóa toàn bộ đạo cụ trong hành trang"}</td></tr>
<tr><td>{"Mở Hoạt Động"}</td><td>{"Điều khiển Tống Kim AI, thi đấu môn phái, Công Thành Chiến, Tranh Đoạt Lãnh Thổ, Bạch Hổ Đường, Đoạt Bảo Rương và Lâu Lan Cổ Thành"}</td></tr>
<tr><td>{"ALphatest"}</td><td>{"Mở các công cụ cấp kỹ năng, tiền, trang bị, vật phẩm thử nghiệm và cường hóa"}</td></tr>
</tbody></table></div>
              <p>Khoản nạp cho thành viên được nhận tại <strong>Sứ giả hoạt động</strong>.</p>
    </div>,
  },
  {
    id: "tieu-huy-ao-cu",
    title: "Tiêu Hủy Đạo Cụ",
    content: <div className="wiki-card-body">
<p>Đặt vật phẩm muốn xóa vào khung tiêu hủy rồi xác nhận.</p>
              <p><strong>Xóa vĩnh viễn, không hoàn lại và không nhận Bạc, Đồng hay nguyên liệu.</strong></p>
    </div>,
  },
  {
    id: "lan-toi-ta-quay-lai",
    title: "Lần Tới Ta Quay Lại",
    content: <div className="wiki-card-body">
<p>Đóng hội thoại.</p>
    </div>,
  },
];

export const newplayerSections = sectionContent.map((section) => ({
  ...section,
  searchText: contentText(section.content),
}));
