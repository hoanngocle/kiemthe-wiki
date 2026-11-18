# Thưởng nhiệm vụ đã ghi vào cấu hình

Áp dụng cho 659 nhiệm vụ XML / 466 tuyến. Thưởng gốc giữ nguyên; phần bổ sung nằm trong nhóm thưởng cố định của từng nhiệm vụ. Nhân vật chỉ nhận sau khi hoàn thành và nhận thưởng bình thường; không trả bù cho nhiệm vụ đã hoàn thành.

- Đồng thường: (⌊cấp/10⌋ + 1) ×500. Cấp 1–9: 500; 10–19: 1.000; 20–29: 1.500. Bạc khóa giữ công thức cũ.
- Tinh lực và Hoạt lực tổng mới = gốc ×15, phần thêm = gốc ×14; gốc gồm cả các chặng. Gốc 0 thì không thêm.
- Mọi nhiệm vụ: thêm (⌊cấp/10⌋ + 1) ×5 điểm cho 1 trong 7 loại danh vọng, xác suất bằng nhau: Nghĩa Quân, Quân doanh, Tống Kim Dương Châu/Phượng Tường/Tương Dương, Bạch Hổ Đường, Tiêu Dao Cốc. Giới hạn danh vọng của engine vẫn có hiệu lực.
- Cuối tuyến không lặp: 2 Huyền Tinh khóa. Cấp Huyền Tinh theo mốc nhân vật: 1–19 → 5; 20–39 → 6; 40–59 → 6; 60–89 → 7; 90–119 → 8; 120+ → 9. Giữ Linh Khí khóa bổ sung như phương án Wiki. Đồng thời nâng mọi viên Huyền Tinh thưởng gốc thêm 2 cấp, tối thiểu cấp 5; giữ nguyên số lượng gốc.
- Nhiệm vụ lặp: Đồng/danh vọng theo cùng công thức cấp, tinh hoạt lực ×15; không thêm quà cuối tuyến. Bạc khóa giữ hệ số 15% của công thức cũ.

Định nghĩa đầy đủ: `docs/quest-bonus-20261109.json`. Gói ưu tiên đầu tiên trên cả Client và Server: `codex_quest_rewards_20261109_v2.pak`, chứa 1.125 tài nguyên task/sub đồng bộ. Các XML task rời phía Server cũng đã cập nhật.

Chưa khởi động lại Client/GameServer hoặc xác nhận một lượt chơi thật. Cần đóng/mở lại Client và nạp lại GameServer trong thời điểm bảo trì để các tiến trình đọc cấu hình mới.

Bản sao và SHA-256: `.diagnostics/quest-rewards-20261109-v2/manifest.json` tính từ thư mục KiemThe. Hoàn tác bằng `python scripts/rollback_quest_bonus.py` từ Server/admin; script từ chối ghi đè nếu phát hiện thay đổi mới sau bản vá. Khởi động lại các tiến trình sau khi hoàn tác.

Kiểm tra: `python scripts/verify_quest_bonus.py --applied` đối chiếu byte XML gốc, nội dung/ưu tiên hai gói PACK, và 4.613 lượt phát thưởng mô phỏng qua hàm Task:GiveAward với cả 7 kết quả danh vọng. Mô phỏng kiểm tra Đồng thường, Bạc khóa, tinh hoạt lực, khóa vật phẩm và số lượng/cấp Huyền Tinh.

Bản v2 thay thế phần bổ sung v1 khi nạp XML; không cộng chồng hai gói. Danh mục thưởng gốc được giữ trong bản sao v1 để tính đúng hệ số và hiển thị đối chiếu trên Wiki.
