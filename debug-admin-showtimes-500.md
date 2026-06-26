[OPEN] Debug session: admin-showtimes-500

## Symptom
- Admin UI gọi:
  - GET /api/admin/showtimes
  - GET /api/admin/showtimes/rooms
- Kết quả: 500 Internal Server Error, frontend báo "Error getting showtimes" / "Error getting rooms".

## Expected
- API trả về JSON hợp lệ (showtimes/rooms), trang quản lý lịch chiếu load được dữ liệu.

## Hypotheses (falsifiable)
- A: Query SQL trong ShowtimeModel.findAll() lỗi do schema DB không khớp (thiếu cột như price_standard/price_vip/price_couple hoặc join sai cột).
- B: Query SQL trong ShowtimeModel.getRoomsByCinema() lỗi do schema Rooms không có cột status hoặc giá trị status khác 'active'.
- C: Tham số cinemaId từ frontend truyền lên làm query fail (ví dụ cinemaId = "undefined"/rỗng, hoặc kiểu dữ liệu không hợp lệ).
- D: Kết nối DB / cấu hình db.js lỗi hoặc bị mất quyền truy cập dẫn đến lỗi ở mọi query.
- E: Lỗi runtime môi trường Node (fetch/JSON) không liên quan DB (ít khả năng, sẽ bị loại trừ nếu có sqlMessage).

## Plan
1) Start Debug Server và thu log theo runId=pre-fix.
2) Instrument backend showtimeController / showtimeModel để report: route, query params, và chi tiết lỗi DB (code/sqlMessage/sql).
3) Reproduce bằng cách reload trang Admin Lịch chiếu.
4) Phân tích log → xác định hypothesis đúng.
5) Fix tối thiểu theo evidence.
6) Verify (post-fix logs + reload UI).
