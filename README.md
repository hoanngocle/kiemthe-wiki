# Kiếm Thế — Quản trị server Windows

Trang Next.js thay cho OpenGame.exe, chạy trực tiếp trên máy Windows chứa thư mục `Sever`.

## Mở trang quản trị

Yêu cầu Node.js 22.18 trở lên. Thư mục hiện tại đã có `node_modules`.

1. Trên máy chạy game, thêm dòng `127.0.0.2 kiemthe.bee` vào `%SystemRoot%\System32\drivers\etc\hosts` bằng quyền quản trị Windows.
2. Mở http://kiemthe.bee sau khi đăng nhập Windows. Tác vụ **KiemTheAI Admin** chạy trang quản trị dưới nền nếu đã được cài. Bạn có thể dùng `start-admin.cmd` khi cần chạy thủ công. Lần đầu script tự build trang quản trị.
3. Bấm **Bật tất cả server** để bật đủ 8 tiến trình game. Mỗi dòng có ba nút **Bật**, **Restart** và **Tắt**. Restart tắt tiến trình hiện tại rồi mở lại đúng server đó.

Trang quản trị dùng HTTP trên `127.0.0.2:80` và chỉ truy cập được trên máy chạy game.

Menu **Log** mở màn xem log với hai tab:

- **Log server**: chọn nguồn, chọn file và xem phần cuối của log; hỗ trợ tự cập nhật mỗi 3 giây. Đọc các thư mục `goddess/logs`, `logserver/Logs`, `bishop/logs`, `gamecenter/log`, `gameserver/log`, `ErrLog`. GS1–GS4 dùng chung thư mục log.
- **Nhật ký admin**: xem 60 sự kiện bật server gần nhất trong phiên admin hiện tại.

Màn Log chỉ đọc file, tối đa 500 dòng / 128 KB cuối file và 200 file mới nhất. Hỗ trợ UTF-8, UTF-16 và log tiếng Trung cũ (GB18030). Có nút làm mới và tùy chọn tạm ngừng tự cập nhật.

Nếu chạy thủ công, giữ cửa sổ lệnh mở khi dùng trang quản trị. Đóng tab trình duyệt không hủy việc bật server; mở lại tab sẽ thấy trạng thái hiện tại. Đóng backend Next.js giữa lúc bật sẽ dừng chuỗi khởi động còn lại. Các server đã mở chạy độc lập và không bị tắt khi đóng trang quản trị.

Để chạy khi phát triển:

```powershell
cd C:\Users\hoanc\Game\KiemTheAI\Sever\admin
npm run dev
```

Để chạy production hoặc cập nhật code:

```powershell
npm run build
npm start
```

Nếu chưa có thư viện, chạy `npm install` trước. Nếu `127.0.0.2:80` đang bận, kiểm tra xem trang quản trị đã chạy nền chưa.

## Tài khoản game

Menu **Tài khoản** mở `/accounts`: danh sách tài khoản bên trái và biểu mẫu đăng ký bên phải; màn hình điện thoại chuyển thành một cột. Chỉ cần tên tài khoản, mật khẩu và nhập lại mật khẩu; không cần email hay thông tin cá nhân. Tên gồm 3–32 ký tự chữ không dấu, số hoặc `_`; mật khẩu gồm 6–32 ký tự không dấu.

- Đọc và tạo tài khoản thật trong bảng `jxaccount.account`, dùng cấu hình MySQL trong `.env` của admin. MySQL cần đang chạy.
- Giữ định dạng mật khẩu MD5 tương thích Paysys hiện tại; không trả mật khẩu hoặc hash về trình duyệt.
- Chặn tên trùng, kể cả khác chữ hoa/thường; tuần tự hóa việc đăng ký từ admin để tránh tạo trùng khi bấm cùng lúc.
- Hiển thị tối đa 200 tài khoản mới nhất, tổng số, trạng thái khóa và ngày đăng ký. Tài khoản cũ chưa có ngày đăng ký hiển thị `—`.
- Cột **Nhân vật** liệt kê nhân vật theo từng tài khoản, đọc database nhân vật bằng cùng kết nối `.env`. Các tên có nhân vật nhưng thiếu bản ghi trong bảng tài khoản nằm ở mục **Tài khoản từ dữ liệu nhân vật**, có nhãn **Chưa có bản ghi đăng nhập** và không có nút đổi mật khẩu/xóa. Không tự tạo tài khoản cho các tên này. Nếu đọc nhân vật thất bại, danh sách tài khoản vẫn hiển thị kèm thông báo lỗi.
- Cấu hình admin trên máy hiện tại dùng `DB_PORT="3307"`, cùng cổng MySQL đang phục vụ game.
- Nút **Xóa** ở mỗi dòng yêu cầu xác nhận trước khi xóa tài khoản đăng nhập; không xóa dữ liệu nhân vật. API chỉ cho phép yêu cầu từ trang quản trị localhost.
- Nút **Đổi mật khẩu** ở mỗi dòng mở form nhập mật khẩu mới và xác nhận cho đúng tài khoản. Quản trị viên không cần nhập mật khẩu cũ. Chỉ cập nhật mật khẩu đăng nhập, không thay đổi dữ liệu khác.

### Cấu hình MySQL

File `admin/.env` chứa `DB_HOST`, `DB_PORT` (mặc định `3306`), `DB_USER`, `DB_PASSWORD` và `DB_NAME` (database tài khoản, hiện là `jxaccount`). Nếu cài mới, sao chép `.env.example` thành `.env` rồi điền cấu hình. Mật khẩu rỗng được hỗ trợ nhưng vẫn phải khai báo `DB_PASSWORD=""`. Đặt mật khẩu trong dấu nháy và viết ký tự `$` thành `\$` để Next.js giữ nguyên giá trị.

Next.js tự nạp `.env`; sau khi sửa file hãy khởi động lại admin. File chứa mật khẩu đã được Git bỏ qua, các biến chỉ dùng phía server. Admin không còn phụ thuộc thư mục `Sever/Paysys`. Database nhân vật vẫn lấy tên từ mục `DatabaseServer` trong `../goddess/kg_goddess.ini`, dùng thông tin đăng nhập MySQL của `.env`.

Kiểm tra MySQL thật bằng `$env:KIEMTHE_TEST_MYSQL='1'; npm test`. Các bài kiểm tra ghi dữ liệu chỉ dùng bảng tạm theo kết nối, không sửa tài khoản thật.

## Database

Menu **Database** (`/database`) có hai chức năng:

- **Export 5 database**: xuất `91jx_gamecenter`, `91jx_goddess`, `91jx_statlog`, `global_logserver`, `jxaccount` thành một gói `.ktdb.gz`; giữ cấu trúc, dữ liệu nhị phân, trigger, routine và event. MySQL tạm khóa ghi khi đọc cả 5 để giữ cùng một thời điểm dữ liệu. File tự tải khi export xong và được lưu tại `admin/.database-backups/`.
- **Import 5 database**: chọn gói đã export, xác nhận thay thế. Backend yêu cầu cả 8 server đã dừng, khóa các thao tác điều khiển server trong admin, kiểm tra đủ 5 database và checksum, lưu gói **safety** của dữ liệu hiện tại ra ổ đĩa trước khi thay thế từng database. Có tiến độ và kết quả từng database. Không tự bật lại server.

Import thay thế toàn bộ dữ liệu MySQL, không gộp bản ghi. Nếu có lỗi, dừng ngay, hiển thị phần đã khôi phục và đường dẫn bản sao trước import; có nút tải bản sao đó. MySQL không hỗ trợ transaction chung cho thao tác thay thế cả 5 schema, vì vậy khi thất bại dữ liệu có thể đã thay đổi một phần. Giữ server dừng để xử lý và khôi phục bản sao trước import.

Trước khi thay thế, admin kiểm tra đăng nhập bằng công cụ import và `max_allowed_packet` cho từng câu SQL, kể cả BLOB dạng hex và procedure nhiều dòng; kiểm tra cả gói được chọn lẫn bản sao trước import. Nếu một schema đang thiếu do import bị gián đoạn, bản sao trước lần import tiếp theo ghi nhận trạng thái thiếu đó để vẫn cho phép khôi phục gói tốt. Export thông thường yêu cầu đủ 5 schema. Chờ khóa MySQL tối đa 15 giây; công cụ dump/import tối đa 10 phút mỗi lượt chạy.

Gói là JSON gzip phiên bản 1 chứa năm tài liệu SQL chuẩn của mysqldump và SHA-256, không phải ZIP hay file `.sql.gz` thông thường. Giới hạn 128 MB nén / 512 MB giải nén. Dùng gói do menu này export và lưu trữ an toàn vì có dữ liệu tài khoản. Lịch sử `.local-topups/`, `gameserver/local-topup/` và các file game không nằm trong gói MySQL; sao lưu riêng khi chuyển máy.

Admin dùng kết nối `.env`. Tự tìm `mysqldump.exe` cùng phiên bản major/minor với server trong `Program Files/MySQL`, và `mysql.exe` phiên bản 5.6 trở lên để hỗ trợ `--binary-mode`. Có thể chỉ định cả `MYSQL_CLIENT_PATH` và `MYSQL_DUMP_PATH` bằng đường dẫn tuyệt đối trong `.env`. Tài khoản MySQL cần quyền đọc, RELOAD (global read lock), SHOW VIEW, TRIGGER, EVENT, đọc routine và quyền tạo/xóa database, bảng, routine khi import.

Đóng tab không hủy tác vụ; mở lại menu để xem trạng thái. Giữ backend admin chạy, chỉ chạy một bản admin và không bật server bằng OpenGame/công cụ khác khi import. Khởi động lại admin làm mất trạng thái tác vụ trong bộ nhớ; các gói hoàn chỉnh vẫn còn trên ổ đĩa.

## Wiki

Menu **Wiki** có bốn mục con và có thể thu gọn bằng cách bấm tên Wiki:

- **Tân Thủ** (`/wiki/tan-thu`): hướng dẫn tám mục trong menu hỗ trợ, menu con của Túi Tân Thủ và Cửa Hàng VIP, bảng giá nguyên bảo, điều kiện chuyển sinh, lộ trình bắt đầu và câu hỏi thường gặp. Nội dung đã cập nhật kiểm tra tháo 10 món trang bị và giá trị nguyên bảo 10 vạn Đồng; chức năng nhận max kỹ năng ngựa đã bỏ.
- **Nâng Cấp** (`/wiki/nang-cap`): cẩm nang 22 hệ thống, gồm tu luyện Chân Nguyên và Thánh Linh bằng vật phẩm.
- **Vật Phẩm** (`/wiki/vat-pham`): toàn bộ bản ghi Item, ID bốn số, icon gốc, tên và công dụng. Tìm tên không dấu, mô tả hoặc ID như `18,1,1,1` / `18 1 1 1`; lọc nhóm, chọn 25–200 dòng/trang và đi tới trang bất kỳ. Tìm kiếm áp dụng trên toàn bộ dữ liệu.
- **Hoạt Động** (`/wiki/hoat-dong`): cơ chế 14 event trong menu Hoạt Động, gồm lịch mở, điều kiện, cách chơi, tính điểm, phần thưởng và các chỗ lệch giữa lời thoại với mã xử lý.

NPC Tân Thủ gom các cách mua vào **Mua Kim Nguyên Bảo Đại**: Đồng thường 100.000/viên, Bạc thường 1.000.000/viên, Bạc khóa 2.000.000/viên. Mỗi nhánh có gói 1/10/100 và chỉ trừ đúng loại tiền đã chọn. Mã ở `gameserver/script/tranphai/tanthu1.lua` (tính từ thư mục Sever).

Trang Tân Thủ nằm ở `app/wiki/tan-thu/page.tsx`, dùng chung giao diện và menu trong `app/components/admin-shell.tsx`. Trang chỉ để tra cứu, không thực hiện thao tác lên game.

### Wiki Hoạt Động

Trang ở `app/wiki/hoat-dong`, kiểu dữ liệu và tìm kiếm ở `lib/activity-wiki.ts`. Nội dung nằm trong ba tệp `docs/wiki-events-instances.json`, `docs/wiki-events-competition.json` và `docs/wiki-events-daily.json`. Có bảng lịch tổng hợp, tìm kiếm tiếng Việt không dấu và lọc loại hoạt động. Các thời gian là giờ máy chủ, không phải lịch tự động được tạo trong ứng dụng quản trị.

Khi cập nhật game, kiểm tra lại cả hàm thực thi, file lịch ở `setting/scheduletask/tasklist.ini` và bảng thưởng. Không lấy lời thoại hoặc bản `.bak` làm bằng chứng duy nhất. Kiểm tra nội dung, đủ 14 mục và vị trí nguồn từ thư mục KiemTheAI bằng `python -X utf8 .diagnostics/events-wiki/verify-events.py`. Việc tạo Wiki không thay đổi mã event hay xác nhận event đã chạy thành công trong phiên game hiện tại.

### Wiki Vật Phẩm

Danh sách gộp mọi vật phẩm cùng tên thành một mục, kể cả khác ID, Genre, DetailType hoặc nhóm. Trang bị bỏ phân biệt giới tính. Các khác biệt hiển thị trong cột **Cấp**, **Phẩm chất**, **Phiên bản** và **Chức năng & công dụng**. Cột **Hệ** đếm số hệ khác nhau (không cộng lặp nam/nữ); `Series=-1` tương ứng năm khả năng ngũ hành, `Series=0` không có hệ. ID hiển thị là ID đại diện; tìm kiếm bằng ID biến thể vẫn ra cả nhóm. Bộ lọc nhóm nhận mọi nhóm của vật phẩm, mỗi nhóm chỉ đếm vật phẩm một lần. Không hiện nhãn nhóm/cấp dưới tên hay mục thông tin cấu hình.

Trang đọc đệ quy các bảng `.txt` định nghĩa vật phẩm có đủ cột `Name`, `Icon`, `Genre`, `DetailType`, `ParticularType`, `Level` trong `gameserver/setting/item`. Không giới hạn số Item, không đọc file `.bak`/archive, không chỉnh cấu hình hoặc thực thi script. Các bảng công thức trao quà/chuyển đổi chỉ tham chiếu ID không được tính thành Item mới. Giữ mọi ID và nguồn trong dữ liệu API. Tổng bản ghi khác tổng ID duy nhất. Công dụng lấy từ `Intro`/`Help`, bỏ thẻ màu của game; ô thiếu mô tả hiển thị dấu gạch ngang.

API chỉ đọc `/api/wiki/items`, giới hạn mỗi phản hồi tối đa 200 dòng, bảo vệ localhost giống API admin hiện có; cache danh sách 10 giây. **Làm mới** đọc lại ngay từ ổ đĩa. Icon lấy từ các đường dẫn `Icon` của cấu hình, đọc file SPR rời hoặc PAK theo thứ tự `Client/package.ini`, giải nén NRV2B và chuyển frame đầu thành PNG trong `public/item-icons`. Những icon không có trong bộ Client hiển thị ô **THIẾU ICON**, không thay bằng hình vật phẩm khác.

Khi cập nhật tài nguyên hoặc thêm Item, chạy `npm run wiki:icons` để tạo lại ảnh và báo cáo `public/item-icons/manifest.json`. Script chỉ cần Python standard library, đường dẫn tự tính theo vị trí script; không cần server game đang chạy. Kiểm tra bộ giải mã bằng `python tests/item-icons.test.py`; kiểm tra parser/tìm kiếm nằm trong `npm test`.

### Wiki Nâng Cấp

Mở **Wiki → Nâng Cấp** ở menu trái hoặc truy cập `/wiki/nang-cap`. Trang có đủ 20 menu của NPC Quan Ưng Phi và hai mục Chân Nguyên, Thánh Linh (Bí Bảo) tu luyện bằng vật phẩm, với hướng dẫn thao tác, nguyên liệu, tỷ lệ, kết quả khi thất bại và các lỗi tìm thấy khi đối chiếu mã Lua với cấu hình vật phẩm. Mục Chân Nguyên có cách mua/mở rương, tu luyện từng dòng bằng đơn và nâng cả bốn dòng bằng sách. Mục Thánh Linh hướng dẫn tích Linh Hồn từ hạp, tụ linh năm dòng bằng Tu Luyện Châu, dùng sách, nguồn hạp và tổng nguyên liệu riêng từng dòng; cả hai hệ thống có giới hạn cấp 400 mỗi dòng. Hỗ trợ tìm kiếm tiếng Việt không dấu, mã vật phẩm, lọc trạng thái và mục lục đến từng hệ thống.

Dữ liệu nằm trong `docs/wiki-equipment-audit.json`, `docs/wiki-skills-audit.json`, `docs/wiki-companions-audit.json`, `docs/wiki-zhenyuan-audit.json` và `docs/wiki-thanh-linh-audit.json`; giao diện và kiểu dữ liệu ở `app/wiki/nang-cap` và `lib/upgrade-wiki.ts`. Khi cập nhật game, cần đối chiếu lại công thức và số dòng nguồn rồi cập nhật dữ liệu Wiki. Bằng chứng giải mã tĩnh file Lua biên dịch được lưu cùng script đọc chỉ xem trong `docs/decode-tayhaothien-bytecode.py` và `docs/wiki-tayhaothien-bytecode.json`.

Các lỗi nâng cấp đã được sửa trong Lua và cấu hình server/client; Wiki đã cập nhật công thức và trạng thái **Đã sửa · đã kiểm thử Lua**. Bốn bộ kiểm thử chạy trong Lua 5.1 của bộ game với API engine mô phỏng. Chưa xác nhận giao dịch trên nhân vật trong game; phiên GameServer/client đang chạy chưa được tự nạp lại. Xem `docs/upgrade-fixes.md` để biết bản sao lưu, cách kiểm tra và các giới hạn dữ liệu cũ.

Trang Wiki là giao diện tra cứu, không tự thực hiện nâng cấp.

## Các server

| Thứ tự | Server | File tương đối từ thư mục Sever |
| --- | --- | --- |
| 1 | Goddess | goddess/GD.exe |
| 2 | LogServer | logserver/LS.exe |
| 3 | Bishop | bishop/Bishop.exe |
| 4 | GameCenter | gamecenter/gamecenter.exe |
| 5 | GameServer 1 | gameserver/GS1.exe |
| 6 | GameServer 2 | gameserver/GS2.exe |
| 7 | GameServer 3 | gameserver/GS3.exe |
| 8 | GameServer 4 | gameserver/GS4.exe |

- Đường dẫn tự tính từ thư mục cha của `admin`; mỗi tiến trình dùng thư mục chứa EXE làm thư mục làm việc.
- Khi bấm Bật, launcher gỡ dấu tải từ Internet trên đúng EXE server được chọn để tránh hộp thoại Windows bị ẩn làm lệnh hết thời gian chờ. Không đổi cấu hình bảo mật Windows.
- Chờ 10 giây giữa các server mới bật, đồng thời kiểm tra tiến trình sau 2 giây. Bật toàn bộ mất khoảng 90 giây.
- Đọc tiến trình Windows theo đường dẫn đầy đủ; bỏ qua server đã chạy, kể cả tên thay thế `kg_goddessd.exe`, `kg_cslogserverd.exe`, `KG_BishopD.exe`, `GC.exe`.
- Chỉ nhận một yêu cầu khởi động tại một thời điểm; các lần bấm lặp không mở thêm tiến trình.
- Nếu thiếu file hoặc không đọc được tiến trình Windows, không khởi động. Nếu server thoát trong chuỗi khởi động, dừng chuỗi và hiển thị lỗi; các tiến trình đã bật được giữ nguyên.
- Trạng thái **Đang chạy** nghĩa là có tiến trình Windows; không khẳng định game đã đăng nhập được. Database và Paysys phải hoạt động theo cấu hình game hiện có. Trang không chỉnh cấu hình và không tự bật database/Paysys.
- Giao diện và API chỉ dùng trên loopback, không đưa lên hosting tĩnh hoặc serverless. Backend cần Node.js chạy lâu dài trên Windows. Không chạy nhiều bản admin trên nhiều cổng cùng lúc.
- Nhật ký và khóa khởi động lưu trong backend hiện tại. Sau khi khởi động lại admin, trạng thái server được đọc lại từ Windows; nhật ký được làm mới.

## Kiểm tra

Kiểm tra Lua cầu nối nạp local bằng `python tests/local-topup-lua.test.py` (môi trường phát triển cần Python + `lupa`). Test dùng nhân vật giả, không trao thưởng cho nhân vật thật.

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

Các test dùng runtime giả cho thao tác tạo tiến trình, không bật/tắt server game thật. Kiểm tra tích hợp GET `/api/servers` sẽ đọc danh sách tiến trình Windows thật.

Nếu không đọc được đường dẫn tiến trình, mở admin bằng cùng tài khoản và mức quyền với các server đã chạy. Nếu một EXE thoát ngay, kiểm tra cấu hình, nhật ký và các dịch vụ phụ thuộc của game.

## Tắt và restart từng server

- Chỉ tác động PID có đường dẫn trùng file của server được chọn, kể cả các tên thay thế. Server của bản cài đặt khác không bị tác động.
- Restart kiểm tra file EXE còn tồn tại trước khi dừng, và chỉ mở lại khi tiến trình cũ đã thoát. Các thao tác Bật/Restart/Tắt dùng chung một khóa, tránh chạy chồng lên nhau.
- Ưu tiên đóng cửa sổ của server. Nếu server không hỗ trợ đóng cửa sổ hoặc không thoát sau 5 giây, kết thúc tiến trình Windows. Nên lưu dữ liệu game trước khi dùng Tắt/Restart.
- Trạng thái và nhật ký ghi rõ thao tác đang chạy và lỗi nếu có. Nút Bật dành cho server đã dừng; Restart/Tắt dành cho server đang chạy.

## Nạp cho một nhân vật

Mở **Nạp** trong menu admin (`/topup`), chọn đúng nhân vật từ dropdown và chọn gói 500K / 1M / 2M. Bấm **Nạp**. Đây là tiền giả lập; 1K tương ứng 100.000 Đồng không khóa.

**Tổng tích lũy trên web** tính toàn bộ lượt trong lịch sử nạp của nhân vật đang chọn, kể cả lượt đang chờ nhận; không giới hạn 20 lượt gần nhất và không bao gồm khoản GM/manual trước đây. Trang hiển thị số mốc đã đạt, mốc tiếp theo và số K còn thiếu. Đây là tiến độ trên web, không xác nhận nhân vật đã nhận quà trong game.

**Các mốc thưởng** đọc 29 mốc đang mở từ script `tuiguangyuan.lua`; mở từng dòng để xem số lượng và tất cả phần thưởng. Mốc 25 triệu đã sửa điều kiện thành 25.000K. Các mốc 32–50 triệu vẫn chưa mở. Tên quà lấy từ chú thích của script, số lượng lấy từ lệnh trao thưởng thực tế.

**Bảng quà ngày 10/11/2026:** đến 30 triệu có tổng 93 phiếu chọn 930.000 nguyên liệu khóa, 49 tỷ EXP, 39.500 Uy Danh, 180 triệu Đồng thưởng và 50 bí kíp đồng hành đặc biệt. Bỏ rương thuê bị ghi nhầm vĩnh viễn, bộ Vô Thần cấp lặp và lệnh mở rương Lv2 lặp. Danh hiệu Tu Hành dùng nhóm 19 với 17 bậc từ Nghệ Sĩ Biểu Diễn Lão Luyện (50K) đến Kẻ Diệt Thần (30 triệu); Chung Mạt Giả ở 29 triệu; tên, màu chữ và vòng sáng đồng bộ server/client. Danh hiệu đang đeo tăng thưởng cuối EXP/Đồng/Bạc, không thêm chỉ số chiến đấu; xem `../../docs/title-reward-buffs.md` để biết bảng tỷ lệ và giới hạn native. Chọn lại danh hiệu chuyên môn và nhận tiền thưởng chờ ở Sứ giả. Nhận mốc thấp sau không hạ danh hiệu cao đã nhận.

Tại Sứ giả, chọn **Đổi phiếu nguyên liệu tự chọn**; mỗi lần nhận tối đa 10.000 nguyên liệu khóa, chọn một trong bảy loại. Phiếu và số nguyên liệu chưa nhận được lưu theo nhân vật. Chọn **Nhận/đổi bộ trang bị đồng hành** để nhận Bạch Kim ở 4 triệu, đổi Bạch Kim +1 ở 5 triệu, Vô Minh ở 7 triệu, Vô Thần ở 10 triệu. Khi đổi phải tháo đủ 5 món bộ cũ vào túi và chừa 5 ô trống. Thuộc tính riêng của bộ cũ không chuyển sang bộ mới; quyền chưa dùng được giữ lại.

Task `7053/1..8` lưu phiếu, nguyên liệu đã đổi, quyền/bậc đổi bộ, khởi tạo dữ liệu cũ, ưu tiên danh hiệu và tiến độ từng món đang đổi. Task `7054/1..5` lưu số bí kíp đã trao ở từng mốc 26–30 triệu. Không reset các task này. Đổi bộ thay đổi trực tiếp từng món cũ, không xóa rồi tạo lại đồ; nếu gián đoạn, chọn lại để tiếp tục các món còn thiếu. Mốc có 10 bí kíp cần 10 ô túi trống; nếu engine chỉ trao một phần, lần sau nhận nốt, không cấp trùng phần đã nhận.

Các mốc đã nhận trước khi cập nhật không phát lại quà hoặc bộ mới. Danh hiệu cũ được chuyển một lần sang bậc Tu Hành phù hợp với các mốc đã nhận khi gặp Sứ giả; quan hàm Hoàng Đế đã nhận trước đây được giữ. Các mốc có danh hiệu chờ server nạp cấu hình XML mới trước khi phát quà hoặc ghi cờ nhận. Xem bảng đầy đủ và hướng dẫn nạp cấu hình tại `../../docs/cultivation-titles.md`. Lua nạp lại khi mở Sứ giả; thay đổi tên mô tả task không yêu cầu reset dữ liệu nhân vật. Chạy `python ../../tests/topup-rebalance.test.py` từ thư mục admin để kiểm tra bảng quà và đổi thưởng bằng Lua 5.1 giả lập engine.


Trong game, dùng chính nhân vật đó gặp **Cổ Phong Hà — Sứ giả hoạt động**. Chọn **Nhận Đồng Nạp**, sau đó **Nhận Phúc Lợi Nạp** để nhận từng mốc đã đủ; chừa ít nhất 5 ô túi trống. Có thể nạp khi nhân vật offline rồi vào nhận sau. Mỗi lượt chỉ nạp cho một nhân vật. Mốc thưởng chính dùng tổng tích lũy suốt đời, không cộng vào chương trình nạp tuần riêng.

Web hiển thị **Đã ghi nạp** khi đã lưu lượt, không khẳng định nhân vật đã nhận. Nếu mất kết nối, bấm **Thử lại lượt này**; giữ cùng mã lượt nạp cả khi tải lại tab để tránh cộng trùng.

Backend dùng kết nối MySQL trong `admin/.env`, với tên database nhân vật từ `../goddess/kg_goddess.ini` (mục `DatabaseServer`). Lịch sử nằm trong `admin/.local-topups/receipts.json`; file giao tiếp ASCII theo từng tài khoản + nhân vật nằm ở `gameserver/local-topup/*.txt`. Không xóa/reset các file này hoặc task `7049/1` giữa chừng. Chạy một bản admin duy nhất. Sao lưu chúng cùng dữ liệu nhân vật khi chuyển máy/khôi phục. Nhân vật bị xóa rồi tạo lại với cùng tài khoản/tên phải được xử lý lịch sử cũ trước khi tiếp tục nạp.

Script `gameserver/script/npc/local_topup.lua` được NPC nạp khi mở đối thoại, không cần dịch vụ nền hoặc khởi động lại game server. Mỗi lần mở Sứ giả, game cộng phần chênh lệch với `7049/1` (tổng nạp local đã ghi nhận) vào `3060/1` (tích lũy xét mốc) và `3090/1` (Đồng nạp chờ rút, tính theo K). Khi chọn **Nhận Đồng Nạp**, game rút trong phạm vi ví còn trống tới trần 2 tỷ Đồng. Phần Đồng còn lại được lưu bằng `3090/1` và `3090/2` (số Đồng lẻ dưới 100.000) để rút tiếp.
