[OPEN] Debug session: admin-cinemas-500

## Symptom
- Admin UI gọi GET /api/admin/cinemas bị 500 Internal Server Error.

## Expected
- API trả 200 JSON { cinemas: [...] }.

## Hypotheses (falsifiable)
- A: SQL query trong CinemaModel.findAll() lỗi do schema DB không khớp (thiếu cột, sai tên bảng/cột).
- B: Hàm normalize đường dẫn ảnh hoặc mapping field bị throw (data null/undefined).
- C: Kết nối DB / config db.js có vấn đề (ít khả năng nếu endpoint khác vẫn chạy).
- D: Lỗi do upload/config (multer) không liên quan GET (ít khả năng).

## Plan
1) Start Debug Server cho session admin-cinemas-500 (runId=pre-fix).
2) Instrument cinemaController.getAllCinemas() để report chi tiết err (code/sqlMessage/sql).
3) Reproduce bằng request GET /api/admin/cinemas.
4) Fix theo evidence.
5) Verify (post-fix).
