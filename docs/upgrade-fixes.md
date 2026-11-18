# Bản sửa các hệ thống nâng cấp

Ngày 08/11/2026: sửa lỗi đã ghi nhận trong 18 menu và bổ sung kiểm thử cho cả 20 menu của Wiki. Các công thức hợp lệ giữ nguyên giá và xác suất; lỗi kiểm tra, trừ phí, nhận sai kết quả, thiếu callback và trùng biến lưu cấp được sửa trong mã nguồn. Wiki có 273 công thức và nhánh với nguồn đối chiếu mới.

## Các thay đổi chính

- Đúc lại vũ khí giữ chính item gốc và dữ liệu riêng. Preview có hạn tuyệt đối 300 giây và token riêng; không được dùng làm nguyên liệu tạo đồ vĩnh viễn. Các công thức ghép vũ khí và đúc lại chỉ nhận vũ khí không có hạn dùng.
- Thú cưỡi dùng cấp và mẫu kế tiếp thật trong cấu hình; giữ ID cũ, loại bỏ definition trùng. Các cấp bị thiếu trong dữ liệu không được tự bịa chỉ số: màn hình hiển thị đúng bước nhảy. Đổi 26 mẫu cấp 60 chỉ thu 20 KNB sau khi chọn; hủy không mất đồ.
- Bôn Lôi nối tới ID 218 cấp 40; bước cuối dùng 80 KNB và 40000 mỗi nguyên liệu. Nâng thú cưỡi, mặt nạ và Pháp Bảo cập nhật chính item bằng Regenerate, giữ metadata và hạn dùng.
- Rương Tử Không 10 dòng nhận đúng 1453/4; ID rương 8 dòng không còn trùng. Già Lam ban đầu nhận ID 26 để nâng được. Truyền Kỳ giữ công thức xác định theo Bùa và sửa lời thoại cho đúng.
- Đồng Hành Bộ 2 kích hoạt trừ 500 KNB; nâng trừ 100 KNB và 10000 mảnh đúng loại 3120. Bảo Châu đổi nguyên liệu dùng class riêng; Kiếm Sĩ và Tử Điệp có task độc lập.
- Bạch Linh tăng đúng 1799; Huy Chương dùng passive 1808 và có callback nâng; giữ nguyên skill tấn công 1963. Tín Vật hiển thị đúng giá 500 KNB. Danh Vọng thú cưng cập nhật 1798; pet có 47 biến thể hợp lệ, 11 bậc, dữ liệu client/server đồng bộ.
- Bảo vệ callback cũ, kiểm tra lại cấp và nguyên liệu; kiểm tra đúng giá trị trả về của ConsumeItemInBags và AddStackItem. Xử lý lỗi tạo thưởng, trừ thiếu và hoàn nguyên liệu có ghi nhật ký.

## Kiểm chứng

Chạy từ thư mục `C:\Users\hoanc\Game\KiemTheAI`:

```powershell
python -X utf8 .diagnostics/upgrade-fixes/verify-all.py
python -X utf8 .diagnostics/upgrade-fixes/companions-settings-test.py
$runner = '.diagnostics/mount-tooltip/run-lua51.ps1'
foreach ($suite in @('root-test.lua','equipment-test.lua','skills-test.lua','companions-test.lua','syntax-all.lua')) {
  & 'C:\Windows\SysWOW64\WindowsPowerShell\v1.0\powershell.exe' -NoProfile -ExecutionPolicy Bypass -File $runner -ScriptPath ".diagnostics/upgrade-fixes/$suite"
  if ($LASTEXITCODE -ne 0) { throw "Kiểm thử lỗi: $suite" }
}
```

Kết quả: root 49 ca, equipment 27 nhóm, skills 61 nhóm và companions 1135 kiểm tra đều đạt. Kiểm tra cú pháp 61 tệp Lua production đạt. Các test chạy mã Lua thật; API vật phẩm, kỹ năng và người chơi của engine được mô phỏng, không thao tác nhân vật thật.

Danh sách tệp thay đổi: `.diagnostics/upgrade-fixes/combined-manifest.json`. Bản gốc các tệp game đã sửa: `.diagnostics/upgrade-fixes/backups`, giữ nguyên đường dẫn tương đối. Log kiểm thử cuối có tên `final-*.log` trong cùng thư mục. Bằng chứng bytecode của bản đúc lại cũ là tài liệu lịch sử, decoder đọc bản sao lưu sau khi file production đã chuyển sang Lua đọc được.

## Nạp bản sửa và dữ liệu cũ

Đã khởi động lại GS1–GS4 ngày 08/11/2026 và ghi nhận cả bốn log sẵn sàng. Lỗi đăng ký module `LocalTopup` phát hiện khi nạp thật đã được sửa trong `setting/scripttable.txt`; lần nạp cuối không còn lỗi tạo global hay không tải được helper này. Không thay đổi database hoặc dữ liệu nhân vật trực tiếp.

Client đã được cài `Client/pak/codex_patch_20261108.pak` ở thứ tự ưu tiên 0 trong `Client/package.ini`. Gói chứa 13 tệp client đã sửa, gồm script kỹ năng, cấu hình kỹ năng/vật phẩm/task và giao diện thú cưỡi/đồng hành/nhân vật. Toàn bộ 52 mục PAK cũ vẫn giữ thứ tự tương đối. Engine thật đã nạp `package.ini` và xác nhận SHA256 của từng tệp trong gói khớp với bản loose mới. Client phải được mở sau khi cài gói; không coi việc mount đúng PAK là kiểm thử giao dịch trong game.

Bản sao `package.ini` trước khi cài, manifest tệp, kết quả PID và kiểm tra engine được lưu trong `.diagnostics/reload-20261108`. Các PAK gốc không bị sửa. Log còn cảnh báo NPC thiếu đã tồn tại trước và cảnh báo trường API của `bot_balance.lua`; đây không phải lỗi tải các script nâng cấp và chưa được sửa trong lần nạp này.

Kiếm Sĩ và Tử Điệp dùng task mới 7880/1 và 7880/2. Task 7875 cũ được giữ; chỉ di chuyển khi đọc được cấp kỹ năng đã học, không lấy cấp cộng thêm do trang bị. Nếu bằng chứng không đủ, hệ thống dừng và yêu cầu quản trị đối soát. Huy Chương di chuyển cấp từ task 7868/1 sang passive 1808; nhân vật chỉ có skill 1963 mà không có task cần kiểm tra riêng.

API Lua cũ không cung cấp giao dịch database nguyên tử. Bản sửa kiểm tra và bù các lỗi quan sát được; nếu chính engine hoàn nguyên liệu hoặc xóa item tạm cũng lỗi thì cần đối soát nhật ký. Nguyên liệu được hoàn ở trạng thái khóa để ngăn chuyển đồ khóa thành không khóa. Giới hạn cụ thể của pet và dữ liệu cũ được giữ trong từng mục Wiki.

## Bổ sung năm Linh Hồn thú cưỡi

Theo lựa chọn của người dùng, năm ô dưới bảng thú cưỡi mở và lên cấp cùng năm kỹ năng hàng trên, không thêm phí. Công thức và ánh xạ nằm trong [đặc tả](superpowers/specs/2026-11-08-mount-souls.md) và Wiki Nâng Cấp. Thuộc tính được thêm vào chính passive cũ, không tạo passive cộng lặp; giữ chỉ số đã có trong từng nguồn đăng ký. Bốn lệnh cấp/xóa Diệu Mã dùng sai ID 1775 đã sửa sang 1776; không tự chuyển dữ liệu nhân vật cũ.

Đã cài PAK riêng `codex_mountsouls_20261108.pak` trước 53 mục PAK đang có và xác nhận bằng engine cả 15 tệp có hiệu lực từ hai gói cập nhật. Kiểm tra đạt 45 nhóm dữ liệu/giao diện mới, 23 ca tooltip, 4 callback cấp/xóa và 61 nhóm hồi quy nâng cấp. Bản bổ sung này chưa nạp vào GS đang chạy; người dùng tự nạp lại GS và mở client. Chỉ số nhân vật và hiển thị thật còn chờ nghiệm thu tại NV16.
