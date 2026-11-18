# To Do hoàn thiện phần Nhân vật

Cập nhật ngày 08/11/2026. Phần Nhân vật có cả chức năng cần kích hoạt, ô dự phòng chưa mở và lỗi giao diện thật. Không thể kết luận mọi ô trống đều do chưa mở tính năng. NV15 đã hoàn tất phần code và PAK theo lựa chọn của người dùng; các ô chưa đánh dấu vẫn còn việc phải làm.

## Phân biệt nguyên nhân hiện tại

| Nhóm chức năng | Kết luận từ code hiện tại | Ý nghĩa khi thấy trống |
| --- | --- | --- |
| Pháp Sư, Kiếm Sĩ, Phù Thủy | Có script client và hệ thống nâng cấp server. Tooltip client vẫn lỗi. | Có thể chưa kích hoạt kỹ năng; phần giải thích cũng có lỗi, nên mở tính năng chưa chắc chữa được giao diện. |
| Thủy Linh, Tử Điệp, Bạch Linh, Nguyệt Ảnh | Có code đọc kỹ năng và nâng cấp server. Tooltip vẫn lỗi; riêng Bạch Linh tham chiếu biến chưa được gán. | Cần phân biệt cấp kỹ năng bằng 0 với tooltip hỏng. |
| Thú Cưng | Có code kích hoạt và nâng cấp. Giao diện gọi 20 đường dẫn ảnh không tìm thấy trong loose files hoặc chỉ mục các PAK hiện có; cấp 0 truyền ảnh nil; tooltip lỗi. | Có lỗi code và tài nguyên, không chỉ là chưa kích hoạt. |
| Bảo Châu | Có code giao diện và hệ thống nâng cấp. Các đường dẫn ảnh được kiểm tra đều tồn tại; tooltip lỗi. | Không nên kết luận thiếu toàn bộ chức năng chỉ vì rê chuột không có nội dung. |
| Kinh Mạch | Có kỹ năng 1959 và nâng cấp server. Cấp 0 không vẽ nút; hover chưa triển khai; không có sự kiện cập nhật trực tiếp và có thể giữ hình cũ. | Có cả trạng thái chưa kích hoạt và phần giao diện chưa hoàn thiện. |
| Danh vọng | Có code lấy cấu hình và dựng danh sách. Một control tên nhân vật bị thiếu. | Cần kiểm tra dữ liệu, đồng bộ và hiển thị thực tế; control tên bị thiếu không giải thích được toàn bộ danh sách trống. |
| Danh hiệu | Có code liệt kê, chọn, dùng và gỡ danh hiệu. Danh sách rỗng nếu nhân vật không có danh hiệu. | Không phải thiếu toàn bộ code. Chưa xác định nguyên nhân hiển thị trống trên nhân vật đang chơi. |
| Vinh dự | Có yêu cầu dữ liệu server và cập nhật danh sách sau đồng bộ. | Cần kiểm tra dữ liệu trả về và hiển thị trong game. |
| Thông tin cá nhân | Có yêu cầu hồ sơ, nhưng script Lưu đòi nhiều trường không có trong layout; nút chia sẻ hiện tại không có nhánh xử lý. | Có phần nối giao diện chưa hoàn thiện; không phải chỉ cần mở điều kiện nhân vật. |
| Thuộc tính trang bị thú cưỡi | Đã mở năm ô Linh Hồn cùng cấp năm kỹ năng phía trên, không thêm phí; 45 nhóm kiểm tra dữ liệu/giao diện, 23 ca tooltip và 4 callback cấp/xóa đạt. | Cần nạp lại GS/client để nhận bản mới. Ô dưới chỉ kích hoạt khi có kỹ năng phía trên; chưa nghiệm thu chỉ số trong game. |
| Nút “Chưa mở” trên bảng Nhân vật | Nút BtnSlut có nhãn cố định, không có callback hoặc kiểm tra điều kiện nhân vật. | Đây là nút dự phòng riêng, không liên quan năm ô thú cưỡi; tăng cấp không mở được. |
| Đồng Hành | Các lỗi tooltip, ảnh chưa kích hoạt, chỉ số ảnh và khôi phục đồng hành khi đăng nhập đã sửa; bộ kiểm tra hiện tại đạt. | Cần nghiệm thu bằng đồng hành thật. Năm biểu tượng bộ 2 đọc kỹ năng 1536–1540, không phải năm ô để kéo trang bị vào. |

Các kiểm tra Lua dùng mã thật với API engine được mô phỏng. Chúng xác nhận lỗi xử lý và luồng dữ liệu, chưa xác định trạng thái kích hoạt của nhân vật đang chơi hoặc kết quả hiển thị trong client thật.

## Ưu tiên 1 sửa lỗi và xác minh luồng đang dùng

- [ ] **NV01 — Lập bảng nghiệm thu cho nhân vật thử nghiệm.** Ghi cấp kỹ năng, task lưu cấp, điều kiện kích hoạt và kết quả hiển thị cho từng hệ thống. Kiểm tra trạng thái chưa kích hoạt, đã kích hoạt, cấp tối đa và sau đăng nhập lại. **Xong khi:** mỗi ô trống có nguyên nhân cụ thể, không đánh đồng “không có dữ liệu” với “thiếu code”.
- [ ] **NV02 — Kiểm tra 7 nút nâng cấp gửi lệnh lên server.** Client gửi `ncphapsu`, `ncthientuong`, `nchauvuong`, `nccovan`, `ncthankhi`, `ncphunghoang`, `ncknbang`; chưa tìm thấy các tên này trong mã server hiện có, kể cả tìm trong tệp nhị phân. Truy vết dispatcher và nối tới menu NPC tương ứng nếu thực sự thiếu handler. **Xong khi:** từng nút mở đúng menu, kiểm tra điều kiện ở server và không thu phí chỉ vì bấm mở.
- [ ] **NV03 — Đối soát kỹ năng và dữ liệu cũ.** Đã sửa bốn lệnh cấp/xóa Diệu Mã từ 1775 sang 1776 trong `newplayergift.lua` và `admincard.lua`; vẫn cần đối soát nhân vật đã dùng bộ cũ, không tự cấp bù khi thiếu bằng chứng. Kiểm tra di chuyển Kiếm Sĩ/Tử Điệp sang task 7880 và Huy Chương sang passive 1808. **Xong khi:** không mất cấp, không cộng nhầm chỉ số và dữ liệu không đủ bằng chứng được đưa ra đối soát riêng.
- [ ] **NV04 — Bổ sung hoặc sửa đường dẫn ảnh Thú Cưng.** Xử lý 20 đường dẫn thiếu của Áo, Bội, Giày, Nhẫn và Vũ khí ở các biến thể 1–4. **Xong khi:** tất cả đường dẫn resolve qua cấu hình PAK đang dùng và các cấp hợp lệ có biểu tượng trong game.
- [ ] **NV05 — Sửa tooltip và trạng thái chưa kích hoạt Thú Cưng.** Không truyền ảnh nil ở cấp 0; dùng control đang hover; lấy đầy đủ tiêu đề/nội dung từ `FightSkill:GetDesc`; kiểm tra giới hạn cấp trước khi chọn ảnh. **Xong khi:** cả sáu món hiển thị rõ lúc chưa kích hoạt và không lỗi khi rê chuột.
- [ ] **NV06 — Sửa tooltip Pháp Sư, Kiếm Sĩ, Phù Thủy.** Thay control nil, bỏ phép nối với giá trị trả về của hàm hiển thị và sửa biến `nShow_HV` chưa được gán. **Xong khi:** ba biểu tượng hiển thị mô tả kỹ năng đúng cấp, kể cả cấp 0.
- [ ] **NV07 — Sửa tooltip Thủy Linh, Tử Điệp, Bạch Linh, Nguyệt Ảnh.** Xử lý lỗi control và chuỗi tương tự NV06; Bạch Linh phải dùng cấp của chính kỹ năng 1799. **Xong khi:** bốn biểu tượng có mô tả đúng và không phát sinh lỗi Lua.
- [ ] **NV08 — Sửa tooltip Bảo Châu.** Dùng đúng control và hai giá trị trả về của `GetDesc`; bảo vệ việc chọn ảnh khi cấp ngoài dải hỗ trợ. **Xong khi:** cấp 0, cấp hợp lệ và dữ liệu bất thường đều có cách hiển thị rõ ràng, không báo lỗi.
- [ ] **NV09 — Hoàn thiện hiển thị Kinh Mạch.** Thêm tooltip cho các nút; xóa toàn bộ trạng thái hình trước khi vẽ lại; cập nhật sau đồng bộ cấp. Giải thích đây là 10 bước của một kỹ năng, không phải 19 kỹ năng độc lập. **Xong khi:** nâng cấp cập nhật đúng, đóng/mở lại không lưu hình sai và không dùng cấp cộng thêm từ trang bị làm cấp đã nâng.
- [ ] **NV10 — Chẩn đoán ba danh sách Danh vọng, Danh hiệu, Vinh dự.** Dùng nhân vật chắc chắn có dữ liệu để kiểm tra lần lượt dữ liệu server, cache client, tên truyền vào danh sách và font/layout/renderer. **Xong khi:** hiện đúng tên, tiến độ, điểm hoặc hạng; danh hiệu dùng/gỡ được. Chỉ thêm control tên bị thiếu không đủ nghiệm thu mục này.

## Ưu tiên 2 hoàn thiện các phần giao diện còn dang dở

- [ ] **NV11 — Đồng bộ biểu mẫu Thông tin với chức năng Lưu.** Chọn bộ trường được hỗ trợ, sửa các tên control và kiểu ngày sinh đang lệch giữa script và INI. **Xong khi:** người chơi điền bằng giao diện thật, lưu thành công, đăng nhập lại vẫn giữ đúng dữ liệu.
- [ ] **NV12 — Hoàn thiện nút chia sẻ hồ sơ.** Nối `BtnPublishBlog` với hành vi được chọn hoặc ẩn nút nếu không cung cấp tính năng. Không giữ đường xử lý chỉ đọc các control URL cũ không tồn tại. **Xong khi:** nút có tác dụng rõ ràng và đường dẫn được xác nhận trước khi mở.
- [ ] **NV13 — Xử lý các nút chi tiết Danh vọng chưa có handler.** Gồm đóng cửa sổ, phần thưởng trái/phải và cửa hàng phần thưởng. Xác minh cửa sổ có thể mở trong game rồi nối đúng luồng hoặc ẩn control không dùng. **Xong khi:** không còn nút nhìn thấy nhưng bấm không có phản hồi.
- [ ] **NV14 — Hiển thị nguyên nhân chưa dùng được.** Thêm thông báo “Chưa kích hoạt”, điều kiện còn thiếu, nơi nâng cấp và cấp hiện tại vào các hệ thống liên quan; công thức lấy theo Wiki Nâng Cấp. **Xong khi:** người chơi biết bước tiếp theo mà không phải đoán từ ô trống.

## Ưu tiên 3 mở rộng và phát hành

- [x] **NV15 — Mở năm ô Linh Hồn thú cưỡi theo cơ chế đã chọn.** Người dùng chọn mở và lên cấp cùng hàng trên, không thêm phí. Đã bổ sung chỉ số vào năm passive cũ, tooltip/cấp và hiệu ứng giao diện, sửa lệnh Diệu Mã, cài PAK riêng và xác minh engine. Xem [đặc tả](superpowers/specs/2026-11-08-mount-souls.md). Nghiệm thu nhân vật thật còn ở NV16.
- [ ] **NV16 — Đóng gói và nghiệm thu toàn bộ bản sửa Nhân vật.** Sau mỗi nhóm sửa, cập nhật PAK ưu tiên, đối chiếu nội dung engine đọc, mở client mới và kiểm tra bằng nhân vật thật. Với nâng cấp, kiểm tra thành công/thất bại, đủ/thiếu nguyên liệu, hủy, giới hạn cấp và đăng nhập lại. Cập nhật trạng thái Wiki theo bằng chứng. **Xong khi:** từng mục ghi rõ đã kiểm tra trong game hay mới kiểm tra bằng mã.

Thứ tự đề xuất: NV01–NV03 để xác định đúng dữ liệu và đường xử lý; NV04–NV10 để sửa phần dùng thường xuyên; NV11–NV14 để hoàn thiện giao diện; NV15 đã hoàn tất phần code/PAK. NV16 thực hiện sau từng nhóm sửa và vẫn chờ nghiệm thu trong game.

## Cách kích hoạt Thú Cưng trong bảng Nhân vật

Gặp **Quan Ưng Phi → Hệ Thống Thú Cưng → Nâng Cấp Kỹ Năng Thú Cưng → Kích Hoạt Skill Thú Cưng**. Cần 500 KNB Đại dạng vật phẩm `(18,1,1338,1)` trong hành trang. Nhánh kích hoạt không kiểm tra cấp nhân vật; kích hoạt thành công thêm kỹ năng chính 1798 và sáu kỹ năng trang bị 1528–1533 ở cấp 1, lưu task 7879/1–7. Đóng/mở lại cửa sổ sau khi kích hoạt. Đây là nhánh cho cửa sổ trong ảnh, khác nhánh Tiến Cấp Thú Cưng.

Dòng “Chưa có thú cưng” trong cửa sổ đọc cấp kỹ năng 1798 bằng 0. Một số ảnh và tooltip vẫn có lỗi ở NV04/NV05; không trả phí kích hoạt lại chỉ vì ảnh chưa hiện. Nếu đã trả phí mà vẫn báo chưa có, cần đối soát skill 1798 và task 7879/1.

## Bằng chứng và cách cập nhật trạng thái

- [Báo cáo các tab phụ và Kinh Mạch](../../../.diagnostics/character-audit-tabs/audit-report.md): luồng danh sách, control thiếu, tooltip trống và biểu mẫu không khớp. Báo cáo gốc mô tả trạng thái lúc kiểm tra; các harness đã được chạy lại khi lập checklist này.
- [Kết quả chạy lại giao diện tùy chỉnh](../../../.diagnostics/character-audit-custom/runtime-results.txt): lỗi tooltip, ảnh nil và tên lệnh client gửi.
- [Đối chiếu đường dẫn ảnh](../../../.diagnostics/character-audit-custom/assets.json): 20 đường dẫn không tìm thấy; Bảo Châu và hai bảng Nhân vật không thiếu đường dẫn ảnh trong phép kiểm tra này.
- [Bản sửa tooltip thú cưỡi](../../../.diagnostics/mount-tooltip/README.txt) và [bản sửa Đồng Hành](../../../.diagnostics/partner-fixes/README.txt): giữ các việc đã sửa tách khỏi To Do; vẫn cần nghiệm thu live.
- [Bản sửa nâng cấp và lưu ý dữ liệu cũ](upgrade-fixes.md): task, kỹ năng, công thức và phạm vi đã nạp.
- Đã đối chiếu thứ tự trong `Client/package.ini`: sáu script `playerpanel`, `thucung`, `baochau`, `nhanvat1`, `nhanvat2`, `kinhmach` được tìm thấy đầu tiên ở `update02.pak` và khớp byte với mã dùng kiểm tra. Vì vậy các lỗi trên vẫn hiện diện trong nguồn PAK, không chỉ trong bản sao loose cũ.

Chỉ đánh dấu hoàn thành khi đạt tiêu chí của từng việc. “Có code”, “đã sửa”, “đã đóng PAK” và “đã kiểm tra trong game” là các mốc khác nhau.
