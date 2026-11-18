# Mở năm ô linh hồn thú cưỡi

Người dùng đã chọn mở cùng năm ô hàng trên, không thêm phí. Mỗi ô dưới là phần mở rộng của kỹ năng tương ứng phía trên; dùng chung cấp 1–10 và không tạo skill, task, phí hoặc giao dịch mới.

| Ô dưới | Kỹ năng cấp gốc | Thuộc tính bổ sung ở cấp L |
| --- | --- | --- |
| Kim Hồn | Trường Sinh 1771 | Hồi sinh lực 4L%, hồi nội lực 2L% |
| Mộc Hồn | Phục Hổ Thức 1778 | Né tránh 64L điểm |
| Thủy Hồn | Hỏa Bạo Viêm 1779 | Kháng tất cả 10L điểm |
| Hỏa Hồn | Kim Lợi Nhẫn 1780 | Giảm sát thương chí mạng 5L% |
| Thổ Hồn | Diệu Mã 1776 | Kinh nghiệm 5L% |

Các giá trị lấy từ năm công thức có sẵn nhưng chưa được nối với kỹ năng trong `script/fightskill/thucuoi/thucuoi.lua`. Ánh xạ các công thức vào năm ô là lựa chọn triển khai. Giữ nguyên mọi chỉ số cũ trong cả file này và `faction/skilladdthem.lua`; thêm các thuộc tính mới giống nhau ở hai nguồn để không phụ thuộc thứ tự nạp. Không cấp miễn phí năm kỹ năng gốc cho nhân vật chưa học.

Giao diện giữ hình ảnh có sẵn, chỉ chạy hiệu ứng trên ô đã kích hoạt; tooltip ô dưới giải thích thuộc tính thêm, cấp dùng chung và không thêm phí. Tooltip ô trên vẫn dùng GetDesc thật. Diệu Mã đọc thống nhất 1776. Chỉ thay ba prototype OnOpen, Update_Item5, OnMouseEnter trong bytecode, giữ phần còn lại và trailer JXEP.

Cách triển khai khác đã cân nhắc: năm passive mới cần chuyển dữ liệu và đồng bộ login; hệ thống nâng cấp riêng cần thêm công thức/chi phí, trái lựa chọn của người dùng. Mở chung trong passive cũ phù hợp yêu cầu và không cần migration.

Phát hành bằng một PAK mới ưu tiên trước các PAK đang có, sao lưu package.ini và mọi nguồn bị sửa. Không khởi động hoặc đóng game/GS thay người dùng. Nghiệm thu mã và engine mount trước; gameplay thật cần mở lại GS/client và kiểm tra nhân vật đã có kỹ năng.
