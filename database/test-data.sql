-- Thêm dữ liệu test cho thống kê

-- Bước 1: Thêm 5 người dùng mới (nếu chưa có)
INSERT IGNORE INTO User (full_name, email, password, phone, role_id, created_at) VALUES
('Nguyễn Văn A', 'nguyenvana@test.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0901234567', 2, '2024-01-15 10:00:00'),
('Trần Thị B', 'tranthib@test.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0912345678', 2, '2024-02-20 14:30:00'),
('Lê Văn C', 'levanc@test.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0923456789', 2, '2024-03-25 09:15:00'),
('Phạm Thị D', 'phamthid@test.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0934567890', 2, '2024-04-10 16:45:00'),
('Đỗ Văn E', 'dovane@test.com', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', '0945678901', 2, '2024-05-05 11:20:00');

-- Bước 2: Lấy các movie_id, cinema_id, room_id, showtime_id, seat_id hiện có để tạo đơn hàng
-- Lưu ý: Thay thế các giá trị dưới đây bằng ID thực tế từ CSDL của bạn

-- Ví dụ: Thêm 20 đơn hàng
INSERT INTO Orders (user_id, total_amount, status, payment_method, payment_status, created_at) VALUES
(2, 150000, 'completed', 'vnpay', 'success', '2024-06-01 10:30:00'),
(3, 200000, 'completed', 'vnpay', 'success', '2024-06-02 14:00:00'),
(4, 180000, 'completed', 'vnpay', 'success', '2024-06-03 19:45:00'),
(5, 220000, 'completed', 'vnpay', 'success', '2024-06-04 16:20:00'),
(6, 170000, 'completed', 'vnpay', 'success', '2024-06-05 21:10:00'),
(2, 250000, 'completed', 'vnpay', 'success', '2024-06-06 13:30:00'),
(3, 190000, 'completed', 'vnpay', 'success', '2024-06-07 18:00:00'),
(4, 300000, 'completed', 'vnpay', 'success', '2024-06-08 20:45:00'),
(5, 160000, 'completed', 'vnpay', 'success', '2024-06-09 15:20:00'),
(6, 210000, 'completed', 'vnpay', 'success', '2024-06-10 12:00:00'),
(2, 280000, 'completed', 'vnpay', 'success', '2024-06-11 22:15:00'),
(3, 175000, 'completed', 'vnpay', 'success', '2024-06-12 17:30:00'),
(4, 230000, 'completed', 'vnpay', 'success', '2024-06-13 09:45:00'),
(5, 195000, 'completed', 'vnpay', 'success', '2024-06-14 14:00:00'),
(6, 240000, 'completed', 'vnpay', 'success', '2024-06-15 19:20:00'),
(2, 225000, 'completed', 'vnpay', 'success', '2024-06-16 11:10:00'),
(3, 260000, 'completed', 'vnpay', 'success', '2024-06-17 16:45:00'),
(4, 185000, 'completed', 'vnpay', 'success', '2024-06-18 20:30:00'),
(5, 275000, 'completed', 'vnpay', 'success', '2024-06-19 13:00:00'),
(6, 215000, 'completed', 'vnpay', 'success', '2024-06-20 18:15:00');
