# So sánh sát thương kỹ năng cấp 90, 110 và 130

[Wiki Môn Phái](http://127.0.0.1:3000/wiki/mon-phai)

Số lấy từ Lua GameServer theo hàm `Lib.Calc:Link`. Hai hệ số lực công cơ bản và vật công có ý nghĩa riêng. Độc tính theo mỗi nửa giây và thời lượng. Bảng so chỉ số chiêu chính ở cùng bậc. Lượng máu mất khi đánh còn phụ thuộc vũ khí, kháng, số đợt trúng và chiêu phụ.

Năm bản được chọn đã gom vào `skilltranphai/skill110.lua`. Độc Thủ Tàn Đao lấy từ `faction/phucskill.lua`, Thiên Hoa Loạn Kích từ `skill150/skill150.lua`, Kinh Lôi Hỏa Diệm từ `class/lens.lua`, Vô Lượng Nguyên Công từ `class/goes.lua` và Hắc Sát Cửu Thiên từ `class/furture.lua`.

Kim Đỉnh Phật Đăng, Đạt Ma Độ Giang, Dương Chủ Hành Vân và Phá Thiên Quyết lấy trung bình cộng của chiêu 90 và 130 cùng nhánh ở từng bậc. Tính riêng lực công cơ bản, hệ số vật công, cận dưới và cận trên của vật công cố định. Kết quả 0,5 làm tròn lên. Các mốc 130 bị lõm giữa bậc 1 và 20 đã được bỏ trước khi tính lại chiêu 110.

Bách Âm Trảm áp cùng cách tính cho lực công cơ bản, hệ số vật công, sát thương độc mỗi nửa giây và thời lượng độc.

Hãm Tĩnh cấp 110 dùng đường tăng vật công, băng, hỏa và lôi của Loạn Hoàn Kích. Cấp 130 tăng thêm 20% trên bốn đường đó trước khi làm tròn. Độc của hai chiêu có cùng thời lượng 4 giây, mỗi chiêu có lượng độc riêng.

Chưởng Nga cấp 110 lấy trung bình của 90/130 cho lực công cơ bản và sát thương băng. Đao Thúy và Đoàn Thị lấy trung bình cho băng. Côn Cái lấy trung bình cho % vật công. Võ Đang giữ mốc 95% ở cấp 110 và nâng lực công cơ bản cấp 130 lên 105–130%.

## Chiêu chính ở bậc 1

| Nhánh | Chiêu cấp 90 | Chỉ số 90 | Kỹ Năng Trấn Phái (110) | Chỉ số 110 | Tuyệt Kỹ Môn Phái (130) | Chỉ số 130 |
|---|---|---|---|---|---|---|
| Đao Thiếu | Thiên Trúc Tuyệt Đao (27) | 35% lực công cơ bản · 80% vật công · 488–596 vật công | Kim Đỉnh Phật Đăng (1981) | 45% lực công cơ bản · 113% vật công · 763–995 vật công | La Hán Bá Liệt Trảm (1747) | 55% lực công cơ bản · 145% vật công · 1037–1393 vật công |
| Quyền Tông | Kim Cang Phật Thủ (36) | 49% lực công cơ bản · 87% vật công · 315–423 vật công | Đạt Ma Độ Giang (1932) | 66% lực công cơ bản · 112% vật công · 653–817 vật công | Phục Ma Quyền Pháp (1750) | 82% lực công cơ bản · 137% vật công · 990–1210 vật công |
| Thương Thiên | Truy Tinh Trục Nguyệt (47) | 42% lực công cơ bản · 84% vật công · 415–508 vật công | Dương Chủ Hành Vân (1982) | 65% lực công cơ bản · 112% vật công · 694–848 vật công | Thiên Thương Xuyết Giáp (1777) | 88% lực công cơ bản · 140% vật công · 972–1188 vật công |
| Chùy Thiên | Thừa Long Quyết (56) | 45% lực công cơ bản · 70% vật công · 157–192 vật công | Phá Thiên Quyết (1956) | 72% lực công cơ bản · 148% vật công · 648–792 vật công | Thiên Chuỳ Trùng Dã (1783) | 99% lực công cơ bản · 225% vật công · 1138–1391 vật công |
| Hãm Tĩnh | Loạn Hoàn Kích (74) | 33% lực công cơ bản · 102–124 mỗi hệ (vật công, băng, hỏa, lôi) · 37 độc/0,5 giây × 1 giây | Độc Thủ Tàn Đao (1988) | 52% lực công cơ bản · 102–124 mỗi hệ (vật công, băng, hỏa, lôi) · 43 độc/0,5 giây × 4 giây | Mộc Giáng Thiên Tinh (1753) | 132% lực công cơ bản · 122–149 mỗi hệ (vật công, băng, hỏa, lôi) · 50 độc/0,5 giây × 4 giây |
| Tụ Tiễn | Bạo Vũ Lê Hoa (66) | 28% lực công cơ bản · 28 độc/0,5 giây × 4,5 giây | Thiên Hoa Loạn Kích (1957) | 53% lực công cơ bản · 62 độc/0,5 giây × 6 giây | Bách Thiên Hoa Vũ (1751) | 66% lực công cơ bản · 148 độc/0,5 giây × 6 giây |
| Ngũ Độc | Huyền Âm Trảm (83) | 28% lực công cơ bản · 100% vật công · 42 độc/0,5 giây × 4,5 giây | Bách Âm Trảm (1984) | 44% lực công cơ bản · 166% vật công · 186 độc/0,5 giây × 4,5 giây | Độc Cổ Tuyệt Đao (1755) | 60% lực công cơ bản · 231% vật công · 330 độc/0,5 giây × 4,5 giây |
| Tinh Túc | Hàm Tiếu Cửu Tuyền (93) | 28% lực công cơ bản · 28 độc/0,5 giây × 4,5 giây | Ám Nguyệt (1936) | 31% lực công cơ bản · 92% vật công · 62 độc/0,5 giây × 6 giây | Bách Quỷ Phi Đao (1758) | 44% lực công cơ bản · 495 độc/0,5 giây × 2 giây |
| Chưởng Nga | Phong Sương Toái Ảnh (103) | 67% lực công cơ bản · 1386–1694 băng | Lạc Tiên Hành Giả (1962) | 72% lực công cơ bản · 1653–2021 băng | Thiên Tiên Hàn Chưởng (1554) | 77% lực công cơ bản · 1920–2347 băng |
| Phụ Trợ | Thanh Âm Phạn Xướng (108) | Hỗ trợ kháng thời gian hiệu ứng ngũ hành (60 điểm) | Tam Phân Thần Kiếm (1990) | 61% lực công cơ bản · 740–800 băng | Bách Hàn Tam Kiếm (1761) | 165% lực công cơ bản · 1930–2359 băng |
| Kiếm Thúy | Băng Tâm Tiên Tử (117) | 62% lực công cơ bản · 251–308 băng | Tiên Nữ Băng Phong (1964) | 70% lực công cơ bản · 430–473 băng | Sương Hàn Đống Liệt (1807) | 88% lực công cơ bản · 1320–1430 băng |
| Đao Thúy | Băng Tung Vô Ảnh (125) | 23% lực công cơ bản · 56% vật công · 220–269 băng | Lưu Ly Giới Đao (1966) | 31% lực công cơ bản · 92% vật công · 506–619 băng | Vô Ảnh Hàn Đao (1797) | 44% lực công cơ bản · 126% vật công · 792–968 băng |
| Chưởng Cái | Phi Long Tại Thiên (134) | 10% lực công cơ bản · 220–269 hỏa | Thiên Long Giáng Thế (1970) | 41% lực công cơ bản · 441–539 hỏa | Cuồng Long Phệ Nhật (1760) | 55% lực công cơ bản · 693–847 hỏa |
| Côn Cái | Thiên Hạ Vô Cẩu (141) | 27% lực công cơ bản · 46% vật công · 173–211 hỏa | Tiên Nhân Đả Cẩu (1992) | 31% lực công cơ bản · 62% vật công · 219–268 hỏa | Hoả Long Tiên Pháp (1545) | 60% lực công cơ bản · 77% vật công · 594–726 hỏa |
| Kiếm Nhẫn | Ngọc Kiếm Hóa Kinh (149) | 10% lực công cơ bản · 220–269 hỏa | Ngọc Nữ Kiếm (1993) | 61% lực công cơ bản · 600–733 hỏa | Ngọc Nữ Hỏa Kiếm (1774) | 99% lực công cơ bản · 104% vật công · 980–1197 hỏa |
| Thiên Nhẫn | Thiên Ngoại Lưu Tinh (156) | 56% lực công cơ bản · 472–577 hỏa | Kinh Lôi Hỏa Diệm (1972) | 99% lực công cơ bản · 980–1197 hỏa | Chúc Dung Phần Dã (1768) | 61% lực công cơ bản · 600–733 hỏa |
| Võ Đang | Thiên Địa Vô Cực (165) | 31% lực công cơ bản · 519–635 lôi | Vô Lượng Nguyên Công (1978) | 95% lực công cơ bản · 739–903 lôi | Tiên Thiên Kiếm Khí (1792) | 105% lực công cơ bản · 975–1191 lôi |
| Toàn Chân | Thuần Dương Kiếm (171) | 24% lực công cơ bản · 56% vật công · 220–269 lôi | Toàn Phong Trảm (1935) | 31% lực công cơ bản · 92% vật công · 269–334 lôi | Nhất Sát Di Tinh (1790) | 55% lực công cơ bản · 100% vật công · 544–665 lôi |
| Đao Côn | Ngạo Tuyết Tiếu Phong (181) | 45% lực công cơ bản · 70% vật công | Cuồng Chấn Thiên Hạ (1974) | 67% lực công cơ bản · 92% vật công · 269–334 lôi | Long Quyến Cụ Phong (1809) | 88% lực công cơ bản · 104% vật công · 577–745 lôi |
| Kiếm Côn | Lôi Động Cửu Thiên (192) | 122% lực công cơ bản · 1417–1732 lôi | Phong Lôi Bích Lịch (1976) | 135% lực công cơ bản · 1580–1931 lôi | Thiên Lôi Oanh Đỉnh (1745) | 147% lực công cơ bản · 1742–2129 lôi |
| Chùy Minh | Long Thôn Thức (202) | 56% lực công cơ bản · 70% vật công · 70 độc/0,5 giây × 1 giây | Thiên Địa Độc Điểu (1996) | 61% lực công cơ bản · 92% vật công · 84 độc/0,5 giây × 2,5 giây | Bách Biến Mộc Điểu (1794) | 176% lực công cơ bản · 313% vật công · 214 độc/0,5 giây × 2,5 giây |
| Kiếm Minh | Thánh Hỏa Liêu Nguyên (211) | 91% lực công cơ bản · 868 độc/0,5 giây × 2 giây | Hắc Sát Cửu Thiên (1961) | 101% lực công cơ bản · 1317 độc/0,5 giây × 2 giây | Thiên Diễm Giáng Thế (1796) | 110% lực công cơ bản · 1765 độc/0,5 giây × 4 giây |
| Tiêu Dao | Tiêu Dao Thần Kiếm (223) | 62% lực công cơ bản · 251–308 băng | Thủy Long Hàn Băng Kiếm (811) | 70% lực công cơ bản · 430–473 băng | Hàn Băng Kiếm Quyết (1788) | 143% lực công cơ bản · 181% vật công · 1980–2420 băng |
| Đoàn Thị | Lục Mạch Thần Kiếm (232) | 21% lực công cơ bản · 299–365 băng | Huyền Băng Cửu Kiếm (1968) | 31% lực công cơ bản · 546–777 băng | Độc Cô Cửu Kiếm (1786) | 55% lực công cơ bản · 792–1188 băng |

## Chiêu chính ở bậc 20

| Nhánh | Chiêu cấp 90 | Chỉ số 90 | Kỹ Năng Trấn Phái (110) | Chỉ số 110 | Tuyệt Kỹ Môn Phái (130) | Chỉ số 130 |
|---|---|---|---|---|---|---|
| Đao Thiếu | Thiên Trúc Tuyệt Đao (27) | 55% lực công cơ bản · 126% vật công · 767–937 vật công | Kim Đỉnh Phật Đăng (1981) | 65% lực công cơ bản · 162% vật công · 1091–1419 vật công | La Hán Bá Liệt Trảm (1747) | 75% lực công cơ bản · 198% vật công · 1414–1900 vật công |
| Quyền Tông | Kim Cang Phật Thủ (36) | 77% lực công cơ bản · 137% vật công · 495–665 vật công | Đạt Ma Độ Giang (1932) | 114% lực công cơ bản · 170% vật công · 923–1158 vật công | Phục Ma Quyền Pháp (1750) | 150% lực công cơ bản · 202% vật công · 1350–1650 vật công |
| Thương Thiên | Truy Tinh Trục Nguyệt (47) | 66% lực công cơ bản · 132% vật công · 653–798 vật công | Dương Chủ Hành Vân (1982) | 93% lực công cơ bản · 162% vật công · 989–1574 vật công | Thiên Thương Xuyết Giáp (1777) | 120% lực công cơ bản · 192% vật công · 1325–2349 vật công |
| Chùy Thiên | Thừa Long Quyết (56) | 71% lực công cơ bản · 110% vật công · 247–302 vật công | Phá Thiên Quyết (1956) | 103% lực công cơ bản · 209% vật công · 900–1100 vật công | Thiên Chuỳ Trùng Dã (1783) | 135% lực công cơ bản · 307% vật công · 1552–1897 vật công |
| Hãm Tĩnh | Loạn Hoàn Kích (74) | 52% lực công cơ bản · 160–196 mỗi hệ (vật công, băng, hỏa, lôi) · 59 độc/0,5 giây × 1 giây | Độc Thủ Tàn Đao (1988) | 90% lực công cơ bản · 160–196 mỗi hệ (vật công, băng, hỏa, lôi) · 100 độc/0,5 giây × 4 giây | Mộc Giáng Thiên Tinh (1753) | 180% lực công cơ bản · 192–235 mỗi hệ (vật công, băng, hỏa, lôi) · 170 độc/0,5 giây × 4 giây |
| Tụ Tiễn | Bạo Vũ Lê Hoa (66) | 44% lực công cơ bản · 44 độc/0,5 giây × 4,5 giây | Thiên Hoa Loạn Kích (1957) | 83% lực công cơ bản · 99 độc/0,5 giây × 6 giây | Bách Thiên Hoa Vũ (1751) | 90% lực công cơ bản · 202 độc/0,5 giây × 6 giây |
| Ngũ Độc | Huyền Âm Trảm (83) | 44% lực công cơ bản · 158% vật công · 66 độc/0,5 giây × 4,5 giây | Bách Âm Trảm (1984) | 138% lực công cơ bản · 237% vật công · 258 độc/0,5 giây × 4,5 giây | Độc Cổ Tuyệt Đao (1755) | 232% lực công cơ bản · 315% vật công · 450 độc/0,5 giây × 4,5 giây |
| Tinh Túc | Hàm Tiếu Cửu Tuyền (93) | 44% lực công cơ bản · 44 độc/0,5 giây × 4,5 giây | Ám Nguyệt (1936) | 69% lực công cơ bản · 130% vật công · 99 độc/0,5 giây × 6 giây | Bách Quỷ Phi Đao (1758) | 111% lực công cơ bản · 675 độc/0,5 giây × 2 giây |
| Chưởng Nga | Phong Sương Toái Ảnh (103) | 105% lực công cơ bản · 2178–2662 băng | Lạc Tiên Hành Giả (1962) | 146% lực công cơ bản · 3047–3724 băng | Thiên Tiên Hàn Chưởng (1554) | 186% lực công cơ bản · 3915–4785 băng |
| Phụ Trợ | Thanh Âm Phạn Xướng (108) | Hỗ trợ kháng thời gian hiệu ứng ngũ hành (175 điểm) | Tam Phân Thần Kiếm (1990) | 99% lực công cơ bản · 1500–1716 băng | Bách Hàn Tam Kiếm (1761) | 225% lực công cơ bản · 3510–4290 băng |
| Kiếm Thúy | Băng Tâm Tiên Tử (117) | 99% lực công cơ bản · 396–484 băng | Tiên Nữ Băng Phong (1964) | 110% lực công cơ bản · 1000–1100 băng | Sương Hàn Đống Liệt (1807) | 204% lực công cơ bản · 1800–1950 băng |
| Đao Thúy | Băng Tung Vô Ảnh (125) | 36% lực công cơ bản · 88% vật công · 346–423 băng | Lưu Ly Giới Đao (1966) | 69% lực công cơ bản · 130% vật công · 747–913 băng | Vô Ảnh Hàn Đao (1797) | 181% lực công cơ bản · 180% vật công · 1147–1402 băng |
| Chưởng Cái | Phi Long Tại Thiên (134) | 16% lực công cơ bản · 346–423 hỏa | Thiên Long Giáng Thế (1970) | 69% lực công cơ bản · 693–847 hỏa | Cuồng Long Phệ Nhật (1760) | 80% lực công cơ bản · 945–1155 hỏa |
| Côn Cái | Thiên Hạ Vô Cẩu (141) | 42% lực công cơ bản · 72% vật công · 272–332 hỏa | Tiên Nhân Đả Cẩu (1992) | 69% lực công cơ bản · 89% vật công · 356–435 hỏa | Hoả Long Tiên Pháp (1545) | 82% lực công cơ bản · 105% vật công · 810–990 hỏa |
| Kiếm Nhẫn | Ngọc Kiếm Hóa Kinh (149) | 16% lực công cơ bản · 346–423 hỏa | Ngọc Nữ Kiếm (1993) | 99% lực công cơ bản · 1118–1367 hỏa | Ngọc Nữ Hỏa Kiếm (1774) | 195% lực công cơ bản · 262% vật công · 1890–2310 hỏa |
| Thiên Nhẫn | Thiên Ngoại Lưu Tinh (156) | 88% lực công cơ bản · 742–907 hỏa | Kinh Lôi Hỏa Diệm (1972) | 195% lực công cơ bản · 1890–2310 hỏa | Chúc Dung Phần Dã (1768) | 120% lực công cơ bản · 1118–1367 hỏa |
| Võ Đang | Thiên Địa Vô Cực (165) | 49% lực công cơ bản · 816–998 lôi | Vô Lượng Nguyên Công (1978) | 95% lực công cơ bản · 1188–1452 lôi | Tiên Thiên Kiếm Khí (1792) | 130% lực công cơ bản · 1329–1625 lôi |
| Toàn Chân | Thuần Dương Kiếm (171) | 38% lực công cơ bản · 88% vật công · 346–423 lôi | Toàn Phong Trảm (1935) | 69% lực công cơ bản · 130% vật công · 423–526 lôi | Nhất Sát Di Tinh (1790) | 75% lực công cơ bản · 157% vật công · 742–907 lôi |
| Đao Côn | Ngạo Tuyết Tiếu Phong (181) | 71% lực công cơ bản · 110% vật công | Cuồng Chấn Thiên Hạ (1974) | 103% lực công cơ bản · 130% vật công · 423–526 lôi | Long Quyến Cụ Phong (1809) | 135% lực công cơ bản · 180% vật công · 787–1016 lôi |
| Kiếm Côn | Lôi Động Cửu Thiên (192) | 192% lực công cơ bản · 2227–2722 lôi | Phong Lôi Bích Lịch (1976) | 212% lực công cơ bản · 2734–3341 lôi | Thiên Lôi Oanh Đỉnh (1745) | 231% lực công cơ bản · 3240–3960 lôi |
| Chùy Minh | Long Thôn Thức (202) | 88% lực công cơ bản · 110% vật công · 110 độc/0,5 giây × 1 giây | Thiên Địa Độc Điểu (1996) | 99% lực công cơ bản · 130% vật công · 132 độc/0,5 giây × 2,5 giây | Bách Biến Mộc Điểu (1794) | 270% lực công cơ bản · 427% vật công · 292 độc/0,5 giây × 2,5 giây |
| Kiếm Minh | Thánh Hỏa Liêu Nguyên (211) | 143% lực công cơ bản · 1364 độc/0,5 giây × 2 giây | Hắc Sát Cửu Thiên (1961) | 220% lực công cơ bản · 2032 độc/0,5 giây × 2 giây | Thiên Diễm Giáng Thế (1796) | 296% lực công cơ bản · 2700 độc/0,5 giây × 4 giây |
| Tiêu Dao | Tiêu Dao Thần Kiếm (223) | 99% lực công cơ bản · 396–484 băng | Thủy Long Hàn Băng Kiếm (811) | 110% lực công cơ bản · 1000–1100 băng | Hàn Băng Kiếm Quyết (1788) | 195% lực công cơ bản · 247% vật công · 2700–3300 băng |
| Đoàn Thị | Lục Mạch Thần Kiếm (232) | 33% lực công cơ bản · 470–574 băng | Huyền Băng Cửu Kiếm (1968) | 69% lực công cơ bản · 775–1030 băng | Độc Cô Cửu Kiếm (1786) | 78% lực công cơ bản · 1080–1485 băng |

## Chỉ số một số chiêu phụ

| Chiêu phụ | Bậc 1 | Bậc 20 |
|---|---|---|
| Đạt Ma Độ Giang_Tử (1934) | 3% lực công cơ bản · 23% vật công · 107–124 vật công | 6% lực công cơ bản · 32% vật công · 257–330 vật công |
| Ám Nguyệt Tử (1939) | 7% lực công cơ bản · 23% vật công · 15 độc/0,5 giây × 6 giây | 17% lực công cơ bản · 32% vật công · 24 độc/0,5 giây × 6 giây |
| Bách Quỷ Phi Đao Tầng 2 (1759) | 19% lực công cơ bản · 396 độc/0,5 giây × 2 giây | 27% lực công cơ bản · 540 độc/0,5 giây × 2 giây |
| Ngọc Nữ Kiếm Tử (1994) | 6% lực công cơ bản · 315–385 hỏa | 9% lực công cơ bản · 495–605 hỏa |
| Ngọc Nữ Hỏa Kiếm Tầng 2 (1775) | 121% lực công cơ bản · 99% vật công · 950–1161 hỏa | 165% lực công cơ bản · 247% vật công · 1296–1584 hỏa |
| Thủy Long Hàn Băng Kiếm_Tử (813) | 15% lực công cơ bản · 107–118 băng | 24% lực công cơ bản · 250–275 băng |
| Hàn Băng Kiếm Quyết Tầng 2 (1789) | 22% lực công cơ bản · 170% vật công · 2178–2662 băng | 142% lực công cơ bản · 232% vật công · 3105–3795 băng |
| Độc Thủ Tàn Đao Tầng 2 (1989) | Hiệu ứng đẩy lùi và thay đổi tốc chạy | Hiệu ứng đẩy lùi và thay đổi tốc chạy |
| Thiên Hoa Loạn Kích Tầng 2 (1960) | 53% lực công cơ bản · 62 độc/0,5 giây × 6 giây | 83% lực công cơ bản · 99 độc/0,5 giây × 6 giây |
| Kinh Lôi Hỏa Diệm Tầng 2 (1973) | 55% lực công cơ bản · 316–387 hỏa | 75% lực công cơ bản · 432–528 hỏa |
| Hắc Sát Cửu Thiên 2 (1829) | 20% lực công cơ bản | 44% lực công cơ bản |
