# Mount Souls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Mở năm ô linh hồn thú cưỡi cùng cấp kỹ năng hàng trên, không thêm phí.

**Architecture:** Thêm năm công thức có sẵn vào năm passive gốc ở hai nguồn đăng ký; không thay chỉ số cũ. Vá ba prototype client, giữ trailer, dùng PAK ưu tiên riêng và kiểm tra engine thật.

**Tech Stack:** Lua 5.1, Python PACK/bytecode tooling, Windows engine.dll.

**Spec:** `../specs/2026-11-08-mount-souls.md`.

## Global Constraints

- Không thêm skill/task/phí/giao dịch; không tự cấp kỹ năng hoặc sửa nhân vật.
- Giữ nguyên chỉ số cũ và các PAK hiện tại; client/GS do người dùng mở lại.
- Cấp ô dưới theo skill 1771,1778,1779,1780,1776; không dùng skill 1775 không tồn tại.

## Review Focus

- Cấp 0/nil không hiện hiệu ứng kích hoạt; tooltip có hướng dẫn.
- Học riêng từng kỹ năng chỉ mở đúng cặp ô, không mở cả năm.
- Đảo thứ tự đăng ký không làm mất thuộc tính mới hoặc thay chỉ số cũ.
- Đóng/mở lại khi cấp thay đổi không giữ hiệu ứng cũ.
- PAK mới không bỏ mất bản sửa từ PAK trước và phải có SHA256 khớp.

## Task 1 Thuộc tính và giao diện

Files: Client và Sever/gameserver `script/fightskill/thucuoi/thucuoi.lua`, `script/fightskill/faction/skilladdthem.lua`; Client `ui/script/window/hourse.lua`, `ui/001a/window/hourse.ini`; kiểm tra và bản sao ở `.diagnostics/mount-souls`.

- [x] Viết và chạy kiểm tra thất bại cho năm thuộc tính, hai thứ tự nạp, giữ chỉ số cũ, hover mười ô và cấp 0/1/10/nil.
- [x] Bổ sung thuộc tính; biên dịch và vá prototype với đúng thứ tự upvalue; sửa Tip trong INI.
- [x] Chạy lại kiểm tra với Lua thật. Cập nhật kiểm tra tooltip cũ theo hợp đồng mới cho năm ô đã mở.

## Task 2 Đóng gói và tài liệu

- [x] Tạo PAK riêng bốn file client, sao lưu cấu hình; giữ thứ tự toàn bộ PAK hiện tại.
- [x] Dùng engine.dll xác nhận SHA256 bốn file qua package.ini thực.
- [x] Cập nhật Wiki Nâng Cấp và NV15/NV16 với công thức, trạng thái và giới hạn kiểm tra live.
- [x] Kiểm tra toàn bộ diff, chạy kiểm tra liên quan và đọc lại tài liệu; không commit các thay đổi khác của người dùng.

## Execution ledger

- Thiết kế mở chung được người dùng chọn ngày 08/11/2026.
- Ruling: gắn thuộc tính vào passive cũ thay vì tạo passive mới, nhằm kế thừa cấp và không cần migration; tooltip phân biệt phần chỉ số bổ sung.

- Completed: 45 new data/UI groups, 23 tooltip cases, 4 real grant/remove callbacks, 61 upgrade regression groups, syntax of all seven changed Lua sources, native effective-package verification of 15 files. Independent review found no actionable defects.
- Ruling: corrected four legacy Diệu Mã grant/remove calls from invalid 1775 to1776 because the fifth parent must be grantable through the existing route; no live character migration or grant was performed.
- Installed a separate four-file PAK preserving all53 prior entries. Live acceptance is still pending user GS/client reload (NV16); no processes were changed.
