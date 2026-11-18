# Rà soát võ công môn phái

[Wiki Môn Phái](http://127.0.0.1:3000/wiki/mon-phai)

Wiki đọc cây phái, bảng kỹ năng và Bí Tịch từ GameServer. Có 12 phái, 24 nhánh, 288 mục trong cây phái và 120 mục học qua mật tịch. Tổng 408 mục tính theo nhánh, gồm cả các chiêu dùng chung giữa nhánh. Bản sửa Đoàn Thị đã bỏ Ám Hương (1662) khỏi cây phái. Bản xuất lại theo dữ liệu hiện tại có đủ 364 icon và chỉ số bậc 1, 20 cho 72 chiêu chính cấp 90, 110 và 130.

- Cây phái khớp giữa GameServer, GameCenter và PAK Client. Cả 120 mục mật tịch khớp tên, ID kỹ năng và yêu cầu cấp giữa GameServer và PAK. Mỗi nhánh có một kỹ năng cấp 120 trong cây.
- Bảng kỹ năng còn 17 mục để trống mô tả chữ. Wiki vẫn hiển thị cấp và thông số lấy được từ cấu hình. Các ID gồm 848, 1545, 1554, 1747, 1751, 1753, 1755, 1760, 1761, 1768, 1777, 1783, 1790, 1792, 1794, 1797 và 1936.

## Kết quả đợt cân bằng ban đầu

- Đã sửa 13 nhánh có đường sát thương tụt trong bộ 90/110/130 và chỉnh thêm Chưởng Nga. Kiểm lại 72 chiêu chính ở cả 20 bậc. Các thành phần sát thương cùng loại giữa hai cấp kế tiếp đều bằng hoặc tăng theo cấp. Mỗi đường sát thương cũng bằng hoặc tăng khi cộng bậc.
- Võ Đang giữ 95% lực công cơ bản của Vô Lượng Nguyên Công (110). Tiên Thiên Kiếm Khí (130) lên 105% ở bậc 1 và 130% ở bậc 20. Lôi cố định tăng đều từ 975–1191 lên 1329–1625.
- Chưởng Nga dùng trung bình 90/130 cho Lạc Tiên Hành Giả (110). Bậc 1 có 72% lực công cơ bản và 1653–2021 băng. Bậc 20 có 146% và 3047–3724 băng.
- Độc Hãm Tĩnh 110/130 cùng thời lượng 4 giây ở mọi bậc. Tinh Túc 130 vẫn dùng nội công và độc 2 giây. Tổng độc lý thuyết của 130 cao hơn 110 ở mọi bậc.
- Đã đồng bộ 56 bản ghi đạn trong PAK, kiểm lại 258 ID đạn sử dụng bởi kỹ năng môn phái và các chiêu phụ. Các tham số chiến đấu đã so khớp GameServer. Hình và âm thanh giữ theo PAK Client.
- Chỉ số bậc 1 và 20 hiện có trên các thẻ chiêu 90/110/130 trong Wiki và trong [bảng so sánh 24 nhánh](./wiki-mon-phai-sat-thuong-110-130.md).

## Rà soát trước cân bằng

- 374 ID kỹ năng riêng trong 409 mục Wiki đều có dữ liệu và lớp Lua, mỗi kỹ năng có icon trên Wiki. Kiểm thêm chuỗi chiêu phụ gọi trong bảng và qua sự kiện Lua, tổng cộng 545 ID đều có bảng và lớp tương ứng.
- Tên, icon, cấp yêu cầu, bậc tối đa, loại chiêu, vũ khí và tầm thi triển khớp giữa bảng kỹ năng trong PAK Client đang cấu hình và GameServer. Hai file Lua của bộ 110/130 khớp từng byte. Đủ 24 nhánh có Bí Tịch 110 và 130 với cùng yêu cầu vũ khí.
- Đã tính các đường sát thương Lua của 134 kỹ năng có thuộc tính sát thương trong nhóm 374 ID. Không có cặp cận dưới vượt cận trên. Ngoài bộ 90/110/130 bên dưới, Long Hổ Quyền cấp 50 (33) có cận trên vật công giảm ở bậc 2–10. Khoảng vật công từ 450–550 ở bậc 1 thành 531–531 ở bậc 10.
- 24 nhánh có chiêu cấp 120 trong cây. Kiểm tra cờ nhiệm vụ khi cộng điểm dựa vào mục thứ 11 của mỗi nhánh, tương ứng 23 chiêu cấp 110 và riêng Hóa Công Đại Pháp (833) của Tinh Túc ở cấp 100. Đường mở cờ trên nhân vật thường còn cần xác nhận. Bí Tịch Trấn Phái 110 và Tuyệt Kỹ 130 dùng luồng học riêng đã qua kiểm tra Lua.

### Sát thương chiêu chính trước khi chỉnh

13 nhánh có ít nhất một chỉ số tụt khi cộng bậc, trong đó 12 nhánh có tụt ở chiêu 130. Cột «Giữa hai cấp» so từng chỉ số cùng loại ở cùng bậc. Một thành phần thấp hơn có thể đi kèm thành phần khác cao hơn. Sát thương thực tế còn phụ thuộc vũ khí, kháng, số lần trúng và chiêu phụ.

| Nhánh | ID cấp 90 / 110 / 130 | Tụt khi cộng bậc | Giữa hai cấp |
|---|---|---|---|
| Đao Thiếu | 27 / 1981 / 1747 | 130 giảm lực công cơ bản ở bậc 2–3, 5, 7, 9. % vật công và vật công cố định giảm ở bậc 2–10. | — |
| Quyền Tông | 36 / 1932 / 1750 | — | — |
| Thương Thiên | 47 / 1982 / 1777 | 130 giảm % vật công và vật công cố định ở bậc 2–10. | — |
| Chùy Thiên | 56 / 1956 / 1783 | Vật công cố định của 110 và 130 đều giảm ở bậc 2–10. 130 còn giảm lực công cơ bản và % vật công ở các bậc đó. | — |
| Hãm Tĩnh | 74 / 1988 / 1753 | 110 rút thời lượng độc từ 6 xuống 2 giây. Tổng độc lý thuyết tụt tại bậc 2, 4, 6, 9, 11, 13, 16, 18. | 130 có tổng độc lý thuyết thấp hơn 110 ở bậc 1–12. Bốn hệ sát thương trực tiếp đều đã có ở 110 và 130. |
| Tụ Tiễn | 66 / 1957 / 1751 | — | — |
| Ngũ Độc | 83 / 1984 / 1755 | Độc 110 giảm ở bậc 2, 4–5, 7–8, 10. 130 giảm % vật công và độc ở bậc 2–10. | — |
| Tinh Túc | 93 / 1936 / 1758 | Độc 130 giảm ở bậc 2–10. | 130 dùng nội công, thời lượng độc 2 giây so với 6 giây của 110. Tổng độc lý thuyết 130 vẫn cao hơn ở cả 20 bậc. |
| Chưởng Nga | 103 / 1962 / 1554 | — | 110 thấp hơn 90 về lực công cơ bản ở cả 20 bậc và về băng cố định ở bậc 1–11. |
| Phụ Trợ | 108 / 1990 / 1761 | — | 90 là kỹ năng hỗ trợ kháng thời gian hiệu ứng. So được sát thương giữa 110 và 130, và các thành phần của 130 đều cao hơn. |
| Kiếm Thúy | 117 / 1964 / 1807 | — | — |
| Đao Thúy | 125 / 1966 / 1797 | 130 giảm % vật công và băng cố định ở bậc 2–10. | 110 thấp hơn 90 về băng cố định ở cả 20 bậc. |
| Chưởng Cái | 134 / 1970 / 1760 | 130 giảm hỏa cố định ở bậc 2–10. | — |
| Côn Cái | 141 / 1992 / 1545 | 130 giảm hỏa cố định ở bậc 2–10. | 110 thấp hơn 90 về % vật công ở cả 20 bậc. |
| Cổ Mộ | 149 / 1993 / 1774 | — | — |
| Thiên Nhẫn | 156 / 1972 / 1768 | — | — |
| Võ Đang | 165 / 1978 / 1792 | 130 giảm lôi cố định ở bậc 2–10. | 130 thấp hơn 110 về lực công cơ bản ở cả 20 bậc, về lôi cố định ở bậc 7–15. |
| Toàn Chân | 171 / 1935 / 1790 | 130 giảm lực công cơ bản ở bậc 2–3, 5, 7, 9 và lôi cố định ở bậc 2–10. | 130 thấp hơn 110 về % vật công ở bậc 1–14. |
| Đao Côn | 181 / 1974 / 1809 | — | — |
| Kiếm Côn | 192 / 1976 / 1745 | — | — |
| Chùy Minh | 202 / 1996 / 1794 | 130 giảm lực công cơ bản ở bậc 2, giảm % vật công và độc ở bậc 2–10. | Lực công cơ bản của 110 thấp hơn 90 ở bậc 10, 79% so với 80%. |
| Kiếm Minh | 211 / 1961 / 1796 | — | — |
| Tiêu Dao | 223 / 811 / 1788 | — | — |
| Đoàn Thị | 232 / 1968 / 1786 | 130 giảm băng cố định ở bậc 2–10. | 110 thấp hơn 90 về băng cố định ở cả 20 bậc. |

Dấu — nghĩa là chưa thấy tụt trong các thành phần sát thương đã so. Ví dụ rõ nhất là Võ Đang, Tiên Thiên Kiếm Khí có 20% / 40% / 61% lực công cơ bản ở bậc 1 / 10 / 20, còn Vô Lượng Nguyên Công giữ 95%. Ở Chùy Thiên, Phá Thiên Quyết lấy trung bình với Thiên Chuỳ Trùng Dã nên vật công phải đi qua đoạn giảm của chiêu 130. Ngũ Độc bị ảnh hưởng tương tự ở đường độc của Bách Âm Trảm. Tổng độc lý thuyết ở Hãm Tĩnh và Tinh Túc dùng lượng độc mỗi nửa giây nhân số nhịp đủ thời lượng.

### Cấu hình đạn trước đồng bộ

37 kỹ năng trong Wiki trỏ trực tiếp đến bản ghi đạn có ít nhất một trường khác nhau giữa hai bên. Trong đó, 23 chiêu thuộc bộ so sánh 90/110/130 ở trên. Có thêm 26 ID chiêu phụ dùng đạn có khác biệt. Riêng bộ 130, các trường đối chiếu khớp cả ở chiêu chính và chuỗi chiêu phụ. Các trường đã so gồm kiểu di chuyển, bám mục tiêu, tốc độ, thời gian tồn tại, tầm va chạm, tầm sát thương, nhịp và điều kiện gây sát thương lặp.

| Nhóm | ID chiêu chính có khác biệt về đạn |
|---|---|
| Cấp 90 trong bảng so sánh | 36, 93, 149, 171 |
| Bí Tịch cấp 110 | 811, 1932, 1936, 1957, 1961, 1964, 1966, 1968, 1970, 1972, 1974, 1976, 1978, 1981, 1984, 1988, 1990, 1992, 1993 |
| Các chiêu khác trong Wiki | 29, 33, 76, 86, 90, 143, 146, 167, 169, 847, 848, 854, 866, 1251 |

Ví dụ, đạn 456 của Vô Lượng Nguyên Công được cấu hình di chuyển với tốc độ 40 và tầm sát thương 5 trong PAK. GameServer đặt tốc độ 0 và tầm sát thương 10. Đây là các giá trị cấu hình. Cần quan sát khi giao chiến để xác định ảnh hưởng lên hiển thị và khớp mục tiêu.

## Tuyệt Kỹ Môn Phái đã đổi vũ khí

| Nhánh | Kỹ Năng Trấn Phái (110) | Tuyệt Kỹ Môn Phái (130) | Vũ khí chung | Động tác và hiệu ứng cần xem khi đánh thử |
|---|---|---|---|---|
| Quyền Tông | Đạt Ma Độ Giang (1932) | Phục Ma Quyền Pháp (1750) | Triền thủ hoặc tay không | Ra quyền cự ly gần với hiệu ứng Kim Cang Phật Thủ. Thử trạng thái choáng. |
| Tinh Túc | Ám Nguyệt (1936) | Bách Quỷ Phi Đao (1758) | Phi đao | Phi đao bay từ nhân vật theo Ám Nguyệt. Thử tầm đánh và độc ảnh theo sau (1759). |
| Cổ Mộ | Ngọc Nữ Kiếm (1993) | Ngọc Nữ Hỏa Kiếm (1774) | Kiếm | Lấy đà theo Thục Nữ Kiếm, tung kiếm khí hệ Hỏa. Thử hiệu ứng bỏng và đợt bồi (1775). |
| Tiêu Dao | Thủy Long Hàn Băng Kiếm (811) | Hàn Băng Kiếm Quyết (1788) | Kiếm | Lấy đà theo Băng Long Kiếm. Thử hai đợt kiếm khí lạnh (1789) và hiệu ứng làm chậm. |

Đối chiếu bảng hiện tại, cả 24 nhánh có cùng yêu cầu vũ khí giữa chiêu chính cấp 110 và 130. Tên Bí Tịch hai cấp khớp tên chiêu trong bảng kỹ năng và Kỳ Trân Các. Xem [bảng so sánh sát thương cấp 90, 110 và 130 ở bậc 1 và 20](./wiki-mon-phai-sat-thuong-110-130.md).

## Kiểm tra trong game khi thuận tiện

- [ ] Cấp 109 và 129 bị từ chối khi học hoặc tu luyện Bí Tịch tương ứng.
- [ ] Cấp 110 và 130 học bậc 1 khi đúng phái và nhánh. Thử cả đổi nhánh và đổi mật tịch.
- [ ] Đặt chiêu chủ động vào ô chuột, gán phím và đánh quái. Với bốn nhánh vừa chỉnh, lần lượt dùng chiêu 110 và 130 trên cùng bộ vũ khí.
- [ ] Kiểm tra hiển thị và hiệu ứng chiêu phụ của bộ cấp 130, đặc biệt Côn Lôn Kiếm và Chưởng Nga. Hai tham chiếu hiệu ứng của bộ cũ thiếu tài nguyên đã được xử lý.
- [ ] Kiểm tra luồng mở các chiêu cấp 120. Các chiêu có trong cây phái, nhưng còn cần xác nhận cách học trên nhân vật thực.

## Khác biệt dữ liệu đã ghi nhận

- Cây phái Client và GameCenter dùng bảng GameServer hiện tại. PAK trước đợt đồng bộ còn dùng các tên nhánh cũ, lấy Từ Hàng Phổ Độ (98) thay cho 1952 và Thái Cực Hộ Thân (783) thay cho 1846.
- Mật tịch sơ, trung và cao đã đồng bộ tên, chiêu và yêu cầu cấp. Mật tịch cao dùng giá trị cấp 1 trong cấu hình GameServer. Bản PAK cũ của Client hiển thị cấp 100.
- Bí Tịch 110 của Tụ Tiễn mang tên Thiên Hoa Loạn Kích (1957), khớp tên chiêu.
- Hóa Công Đại Pháp (833) là mục thứ 11 của Tinh Túc, bảng skill đặt yêu cầu cấp 100. Wiki giữ mốc dữ liệu này. Cần thử cờ nhiệm vụ khi cộng điểm vì Lua kiểm tra theo vị trí thứ 11.
- Dục Hỏa Chi Tâm (848) và phần lớn chiêu trong bộ cấp 130 thiếu mô tả chữ trong bảng gốc. Wiki hiển thị loại chiêu, cấp, vũ khí và tầm từ dữ liệu.
