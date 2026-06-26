[OPEN] Debug session: user-home-movies-500

## Symptom
- Trang Home gọi:
  - GET /api/user/movies?status=now_showing
  - GET /api/user/movies?status=coming_soon
- Kết quả: 500 Internal Server Error, frontend báo "Không thể tải dữ liệu trang chủ."

## Expected
- API trả 200 với JSON `{ movies: [...] }` để Home render dữ liệu phim.

## Hypotheses (falsifiable)
- A: Query trong `userGetMovies` lỗi do schema DB không khớp, đặc biệt quanh các cột mới như rating/review_count hoặc cột trạng thái phim.
- B: Hàm đồng bộ trạng thái phim trước khi query (`syncStatuses`) bị throw do schema/enum/date không khớp.
- C: Query join thể loại hoặc tổng hợp review lỗi vì bảng/cột liên quan chưa đồng bộ dữ liệu.
- D: Có bản ghi phim chứa dữ liệu JSON/posters không hợp lệ khiến quá trình map/parse response bị lỗi.
- E: Lỗi DB connection chung ít khả năng hơn vì các endpoint khác vẫn đang trả dữ liệu.

## Plan
1) Start Debug Server cho session `user-home-movies-500`.
2) Instrument `userGetMovies` để log query params và chi tiết error SQL/runtime.
3) Reproduce 2 request `now_showing` và `coming_soon`.
4) Phân tích evidence, xác định hypothesis đúng.
5) Sửa tối thiểu theo evidence.
6) Verify lại Home/API.
