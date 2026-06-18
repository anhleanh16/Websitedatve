-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Máy chủ: 127.0.0.1
-- Thời gian đã tạo: Th6 18, 2026 lúc 06:08 AM
-- Phiên bản máy phục vụ: 10.4.32-MariaDB
-- Phiên bản PHP: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Cơ sở dữ liệu: `lunexa`
--

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `ai_chat_history`
--

CREATE TABLE `ai_chat_history` (
  `chat_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `question` text DEFAULT NULL,
  `answer` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `cinemas`
--

CREATE TABLE `cinemas` (
  `cinemas_id` int(11) NOT NULL,
  `cinema_name` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `city` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `combos`
--

CREATE TABLE `combos` (
  `combo_id` int(11) NOT NULL,
  `combo_name` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(12,2) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `employees`
--

CREATE TABLE `employees` (
  `employee_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `employee_code` varchar(50) DEFAULT NULL,
  `position` varchar(100) DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `salary` decimal(12,2) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `membership_levels`
--

CREATE TABLE `membership_levels` (
  `level_id` int(11) NOT NULL,
  `level_name` varchar(50) DEFAULT NULL,
  `min_points` int(11) DEFAULT NULL,
  `max_points` int(11) DEFAULT NULL,
  `benefits` text DEFAULT NULL,
  `discount_percent` int(11) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `movies`
--

CREATE TABLE `movies` (
  `movie_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `duration` int(11) DEFAULT NULL,
  `age_limit` int(11) DEFAULT NULL,
  `director` varchar(255) DEFAULT NULL,
  `actors` text DEFAULT NULL,
  `trailer` varchar(255) DEFAULT NULL,
  `poster` varchar(255) DEFAULT NULL,
  `posters` text DEFAULT NULL,
  `release_date` date DEFAULT NULL,
  `status` enum('coming_soon','now_showing','ended') DEFAULT NULL,
  `language` varchar(50) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT 0,
  `is_hidden` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `movies`
--

INSERT INTO `movies` (`movie_id`, `title`, `description`, `duration`, `age_limit`, `director`, `actors`, `trailer`, `poster`, `posters`, `release_date`, `status`, `language`, `country`, `is_deleted`, `is_hidden`) VALUES
(41, 'Bố Gì', 'Bộ phim hài hước Việt Nam về cuộc sống của một người cha đơn thân và con gái. Nhiều tình huống dở khóc dở cười xảy ra khi hai thế hệ gặp nhau.', 100, 0, 'Trấn Thành', 'Trấn Thành, Tuấn Trần, Thuỷ Tiên', NULL, '/uploads/movies/demo-poster-1.jpg', '[\"/uploads/movies/demo-poster-1-2.jpg\",\"/uploads/movies/demo-poster-1-3.jpg\"]', '2024-11-15', 'ended', 'Tiếng Việt', 'Việt Nam', 0, 0),
(42, 'Hạnh Phúc Của Em', 'Câu chuyện tình cảm về cuộc sống và tình yêu của hai con người trẻ tuổi. Họ phải đối mặt với nhiều thử thách để tìm thấy hạnh phúc thực sự.', 115, 13, 'Nguyễn Quang Dũng', 'Chi Pu, Isaac, Gil Lê', NULL, '/uploads/movies/demo-poster-2.jpg', '[\"/uploads/movies/demo-poster-2-2.jpg\"]', '2025-02-14', 'now_showing', 'Tiếng Việt', 'Việt Nam', 0, 0),
(43, 'Doraemon: Nobita Và Hành Trình Tìm Mặt Trời', 'Nobita và bạn bè bắt đầu một cuộc phiêu lưu đầy khó khăn để giải cứu hành tinh khỏi kịch bản bị đóng băng do mặt trăng bị mất.', 108, 0, 'Shin-Ei Animation', 'Wasabi Mizuta, Megumi Ōhara', NULL, '/uploads/movies/demo-poster-3.jpg', '[\"/uploads/movies/demo-poster-3-2.jpg\",\"/uploads/movies/demo-poster-3-3.jpg\"]', '2025-01-26', 'ended', 'Tiếng Nhật', 'Nhật Bản', 0, 0),
(44, 'Spider-Man: No Way Home', 'Peter Parker gặp rắc rối với danh tính của mình bị tiết lộ. Anh ấy nhờ Doctor Strange giúp mình, nhưng một sai sót mở ra multiverse, đưa những kẻ thù từ các thực tế khác về hiện tại.', 148, 13, 'Jon Watts', 'Tom Holland, Zendaya, Benedict Cumberbatch', NULL, '/uploads/movies/demo-poster-4.jpg', '[\"/uploads/movies/demo-poster-4-2.jpg\",\"/uploads/movies/demo-poster-4-3.jpg\"]', '2024-12-17', 'ended', 'Tiếng Anh', 'Mỹ', 0, 0),
(45, 'Parasite', 'Một gia đình nghèo nghỉ ngơi tại một gia đình giàu có, nhưng cuộc sống của họ nhanh chóng bị thay đổi khi bí mật được tiết lộ.', 132, 18, 'Bong Joon-ho', 'Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong', NULL, '/uploads/movies/demo-poster-5.jpg', '[\"/uploads/movies/demo-poster-5-2.jpg\"]', '2024-10-25', 'ended', 'Tiếng Hàn', 'Hàn Quốc', 0, 0),
(46, 'Your Name', 'Taki, một cậu học sinh ở Tokyo, và Mitsuha, một nữ sinh ở vùng nông thôn Nhật Bản, bắt đầu thay đổi cơ thể. Họ xây dựng mối quan hệ đặc biệt qua các tin nhắn.', 106, 0, 'Makoto Shinkai', 'Ryunosuke Kamiki, Mone Kamishiraishi', NULL, '/uploads/movies/demo-poster-6.jpg', '[\"/uploads/movies/demo-poster-6-2.jpg\"]', '2024-12-01', 'ended', 'Tiếng Nhật', 'Nhật Bản', 0, 0),
(47, 'Avengers: Endgame', 'Nhóm Avengers thực hiện nhiệm vụ cuối cùng để cứu thế giới khỏi tay Thanos sau cuộc thảm sát làm tan vỡ nửa vũ trụ.', 181, 13, 'Anthony Russo, Joe Russo', 'Robert Downey Jr., Chris Evans, Mark Ruffalo', NULL, '/uploads/movies/demo-poster-7.jpg', '[\"/uploads/movies/demo-poster-7-2.jpg\",\"/uploads/movies/demo-poster-7-3.jpg\"]', '2024-11-08', 'ended', 'Tiếng Anh', 'Mỹ', 0, 0),
(48, 'Quá Khứ Hoàn Vĩ', 'Phim Việt Nam về các người trẻ tuổi ở Sài Gòn trong những năm 60. Họ phải đối mặt với những thử thách về tình yêu, cuộc sống, và tương lai.', 126, 13, 'Nguyễn Hoàng Điệp', 'Ngọc Thanh Thanh, Phương Anh Đào, Quang Thắng', NULL, '/uploads/movies/demo-poster-8.jpg', '[\"/uploads/movies/demo-poster-8-2.jpg\"]', '2025-03-08', 'now_showing', 'Tiếng Việt', 'Việt Nam', 0, 0),
(49, 'Titanic', 'Câu chuyện tình yêu tuyệt đẹp giữa một thiếu niên thuộc tầng lớp lao động và một nữ sinh viên thuộc gia đình giàu có trên tàu Titanic.', 194, 13, 'James Cameron', 'Leonardo DiCaprio, Kate Winslet', NULL, '/uploads/movies/demo-poster-9.jpg', '[\"/uploads/movies/demo-poster-9-2.jpg\",\"/uploads/movies/demo-poster-9-3.jpg\"]', '2024-09-12', 'ended', 'Tiếng Anh', 'Mỹ', 0, 0),
(50, 'Squid Game: The Challenge', 'Dựa trên series phim truyền hình nổi tiếng, cuộc thi thực tế này cho 456 người tham gia chiến đấu để giành được 4,56 triệu USD.', 100, 16, 'N/A', 'N/A', NULL, '/uploads/movies/demo-poster-10.jpg', '[]', '2025-04-05', 'coming_soon', 'Tiếng Anh', 'Hàn Quốc', 0, 0),
(51, 'The Conjuring: The Devil Made Me Do It', 'Ed và Lorraine Warren giúp một người đàn ông có bị cho là đã bị quỷ ám trong một vụ án giết người. Họ phải chứng minh rằng anh ta không phải là kẻ gây ra hành động đó.', 112, 18, 'Michael Chaves', 'Vera Farmiga, Patrick Wilson', NULL, '/uploads/movies/demo-poster-11.jpg', '[\"/uploads/movies/demo-poster-11-2.jpg\"]', '2025-05-23', 'coming_soon', 'Tiếng Anh', 'Mỹ', 0, 0),
(52, 'Joker', 'Arthur Fleck, một nhà hài hước thất bại, bước vào một cuộc hành trình tự tin sau khi bị xã hội khinh miệt, dẫn đến biến mình thành kẻ thù của Batman.', 122, 18, 'Todd Phillips', 'Joaquin Phoenix, Robert De Niro', NULL, '/uploads/movies/demo-poster-12.jpg', '[\"/uploads/movies/demo-poster-12-2.jpg\",\"/uploads/movies/demo-poster-12-3.jpg\"]', '2024-10-11', 'ended', 'Tiếng Anh', 'Mỹ', 0, 0),
(53, 'Train to Busan', 'Một người cha và con gái của mình bắt đầu chuyến tàu đến Busan, nhưng một dịch bệnh zombie bùng phát, khiến họ phải chiến đấu để sống sót.', 118, 18, 'Yeon Sang-ho', 'Gong Yoo, Ma Dong-seok, Jung Yu-mi', NULL, '/uploads/movies/demo-poster-13.jpg', '[\"/uploads/movies/demo-poster-13-2.jpg\"]', '2024-11-20', 'ended', 'Tiếng Hàn', 'Hàn Quốc', 0, 0),
(54, 'The Lion King', 'Simba, một chú sư tử con, bị rơi vào cuộc đảo chính của chú Scar. Phải đi xa quê hương, Simba học cách trưởng thành và trả thù.', 118, 0, 'Jon Favreau', 'Donald Glover, Beyoncé, James Earl Jones', NULL, '/uploads/movies/demo-poster-14.jpg', '[\"/uploads/movies/demo-poster-14-2.jpg\"]', '2024-09-27', 'ended', 'Tiếng Anh', 'Mỹ', 0, 0),
(55, 'Người Đàn Ông Này Là Ai', 'Bộ phim hài hước Việt Nam về một người đàn ông có thể thay đổi vẻ ngoài mỗi khi buồn ngủ. Cuộc sống của anh ấy trở nên thật đặc biệt.', 95, 0, 'Đỗ Đức Thịnh', 'Sơn Tùng M-TP, Thúy Nga, Trường Giang', NULL, '/uploads/movies/demo-poster-15.jpg', '[\"/uploads/movies/demo-poster-15-2.jpg\",\"/uploads/movies/demo-poster-15-3.jpg\"]', '2025-04-20', 'coming_soon', 'Tiếng Việt', 'Việt Nam', 0, 0),
(56, 'Interstellar', 'Một nhóm các nhà thám hiểm sử dụng một lỗ đen để tìm một hành tinh mới có thể sống được cho con người khi trái đất sắp chết.', 169, 13, 'Christopher Nolan', 'Matthew McConaughey, Anne Hathaway, Jessica Chastain', NULL, '/uploads/movies/demo-poster-16.jpg', '[\"/uploads/movies/demo-poster-16-2.jpg\"]', '2024-12-24', 'ended', 'Tiếng Anh', 'Mỹ', 0, 0),
(57, 'Jurassic World Dominion', 'Cuộc chiến giữa khủng long và con người tiếp tục. Owen và Claire phải cứu Maisie khỏi miệng khủng long và tìm ra cách giải quyết cuộc xung đột.', 147, 13, 'Colin Trevorrow', 'Chris Pratt, Bryce Dallas Howard', '/uploads/trailers/trailer-1781722445632-367797090.mp4', '/uploads/movies/poster-1781717906243-700341995.jpg', '[\"/uploads/movies/poster-1781717906244-54029511.jpg\",\"/uploads/movies/poster-1781717906245-377619489.jpg\",\"/uploads/movies/poster-1781717906245-783464986.jpg\",\"/uploads/movies/poster-1781717906245-411714167.jpg\",\"/uploads/movies/poster-1781717906246-854735551.jpg\",\"/uploads/movies/poster-1781717906246-755912119.jpg\"]', '2026-06-23', 'coming_soon', 'Tiếng Anh', 'Mỹ', 0, 0),
(58, 'Nữ Vương Của Đêm', 'Bộ phim Việt Nam về cuộc đời của một người phụ nữ trở thành tay sai của một gia đình giàu có. Cô ấy phải tìm cách thoát khỏi cuộc sống này.', 106, 16, 'Nguyễn Phan Quang Bình', 'Trương Ngọc Ánh, Quốc Trường, Kiều Anh', NULL, '/uploads/movies/demo-poster-18.jpg', '[\"/uploads/movies/demo-poster-18-2.jpg\"]', '2025-03-20', 'now_showing', 'Tiếng Việt', 'Việt Nam', 0, 0),
(59, 'The Matrix Resurrections', 'Neo gặp lại Trinity và họ phải tìm cách thoát khỏi Matrix lần nữa để giải cứu con người khỏi sự kiểm soát của máy móc.', 148, 13, 'Lana Wachowski', 'Keanu Reeves, Carrie-Anne Moss', NULL, '/uploads/movies/demo-poster-19.jpg', '[\"/uploads/movies/demo-poster-19-2.jpg\"]', '2024-12-31', 'ended', 'Tiếng Anh', 'Mỹ', 0, 0),
(60, 'Suzume', 'Một cô gái Nhật Bản tìm thấy một cánh cửa bí ẩn và bước vào một cuộc phiêu lưu xuyên khắp Nhật Bản để ngăn chặn một thảm họa.', 121, 0, 'Makoto Shinkai', 'Nanoka Hara, Hokuto Matsumura', NULL, '/uploads/movies/demo-poster-20.jpg', '[\"/uploads/movies/demo-poster-20-2.jpg\",\"/uploads/movies/demo-poster-20-3.jpg\"]', '2025-05-30', 'coming_soon', 'Tiếng Nhật', 'Nhật Bản', 0, 0);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `movie_categories`
--

CREATE TABLE `movie_categories` (
  `category_id` int(11) NOT NULL,
  `category_name` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `movie_categories`
--

INSERT INTO `movie_categories` (`category_id`, `category_name`) VALUES
(1, 'Hành động'),
(2, 'Tình cảm'),
(3, 'Kinh dị'),
(4, 'Hài hước'),
(5, 'Khoa học viễn tưởng'),
(6, 'Hoạt hình'),
(7, 'Tâm lý'),
(8, 'Phiêu lưu'),
(10, 'Bí ẩn');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `movie_category_detail`
--

CREATE TABLE `movie_category_detail` (
  `movie_id` int(11) NOT NULL,
  `category_id` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `movie_category_detail`
--

INSERT INTO `movie_category_detail` (`movie_id`, `category_id`) VALUES
(57, 1),
(57, 5),
(57, 7);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `orders`
--

CREATE TABLE `orders` (
  `order_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `total_amount` decimal(12,2) DEFAULT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_status` enum('pending','paid','failed') DEFAULT NULL,
  `order_date` datetime DEFAULT NULL,
  `booking_code` varchar(50) DEFAULT NULL,
  `status` enum('pending','confirmed','completed','cancelled') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `order_combos`
--

CREATE TABLE `order_combos` (
  `id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `combo_id` int(11) DEFAULT NULL,
  `quantity` int(11) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `point_history`
--

CREATE TABLE `point_history` (
  `history_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `points_change` int(11) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `point_rules`
--

CREATE TABLE `point_rules` (
  `rule_id` int(11) NOT NULL,
  `rule_name` varchar(100) DEFAULT NULL,
  `spending_amount` decimal(12,2) DEFAULT NULL,
  `earned_points` int(11) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `reviews`
--

CREATE TABLE `reviews` (
  `review_id` int(11) NOT NULL,
  `movie_id` int(11) DEFAULT NULL,
  `user_id` int(11) DEFAULT NULL,
  `rating` decimal(2,1) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `reward_rules`
--

CREATE TABLE `reward_rules` (
  `reward_id` int(11) NOT NULL,
  `reward_name` varchar(100) DEFAULT NULL,
  `required_points` int(11) DEFAULT NULL,
  `reward_type` varchar(50) DEFAULT NULL,
  `reward_value` varchar(100) DEFAULT NULL,
  `status` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `roles`
--

CREATE TABLE `roles` (
  `role_id` int(11) NOT NULL,
  `role_name` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `roles`
--

INSERT INTO `roles` (`role_id`, `role_name`, `description`, `created_at`) VALUES
(1, 'admin', 'Quản trị viên hệ thống', '2026-06-17 15:05:58'),
(2, 'user', 'Khách hàng thông thường', '2026-06-17 15:05:58');

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `rooms`
--

CREATE TABLE `rooms` (
  `room_id` int(11) NOT NULL,
  `cinema_id` int(11) DEFAULT NULL,
  `room_name` varchar(100) DEFAULT NULL,
  `room_type` enum('2D','3D','IMAX','VIP') DEFAULT NULL,
  `total_seat` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `seats`
--

CREATE TABLE `seats` (
  `seat_id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `seat_code` varchar(20) DEFAULT NULL,
  `seat_type` enum('Standard','VIP','Couple') DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `showtimes`
--

CREATE TABLE `showtimes` (
  `showtime_id` int(11) NOT NULL,
  `movie_id` int(11) DEFAULT NULL,
  `room_id` int(11) DEFAULT NULL,
  `start_time` datetime DEFAULT NULL,
  `end_time` datetime DEFAULT NULL,
  `price` decimal(12,2) DEFAULT NULL,
  `available_seats` int(11) DEFAULT NULL,
  `status` enum('active','cancelled') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `social_accounts`
--

CREATE TABLE `social_accounts` (
  `social_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `provider` varchar(50) DEFAULT NULL,
  `provider_user_id` varchar(255) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `avatar_url` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `tickets`
--

CREATE TABLE `tickets` (
  `ticket_id` int(11) NOT NULL,
  `order_id` int(11) DEFAULT NULL,
  `showtime_id` int(11) DEFAULT NULL,
  `seat_id` int(11) DEFAULT NULL,
  `qr_code` varchar(255) DEFAULT NULL,
  `ticket_status` enum('unused','used','cancelled') DEFAULT NULL,
  `check_in_time` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `role_id` int(11) DEFAULT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `sex` enum('Nam','Nu','Khac') DEFAULT NULL,
  `avatar` varchar(255) DEFAULT NULL,
  `point` int(11) DEFAULT 0,
  `status` enum('active','inactive','blocked') DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NULL DEFAULT NULL,
  `last_login` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Đang đổ dữ liệu cho bảng `user`
--

INSERT INTO `user` (`id`, `role_id`, `full_name`, `email`, `password`, `phone`, `birthday`, `sex`, `avatar`, `point`, `status`, `created_at`, `updated_at`, `last_login`) VALUES
(1, 1, 'Quản trị viên', 'admin@lunexa.vn', '<hashed_password_placeholder>', NULL, NULL, NULL, NULL, 0, 'active', '2026-06-17 15:05:58', NULL, NULL),
(2, 2, 'Nguyễn Văn Test', 'user@lunexa.vn', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi', '0901234567', NULL, NULL, NULL, 0, 'active', '2026-06-17 15:05:58', NULL, NULL);

-- --------------------------------------------------------

--
-- Cấu trúc bảng cho bảng `user_notifications`
--

CREATE TABLE `user_notifications` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `notification_id` int(11) DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Chỉ mục cho các bảng đã đổ
--

--
-- Chỉ mục cho bảng `ai_chat_history`
--
ALTER TABLE `ai_chat_history`
  ADD PRIMARY KEY (`chat_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `cinemas`
--
ALTER TABLE `cinemas`
  ADD PRIMARY KEY (`cinemas_id`);

--
-- Chỉ mục cho bảng `combos`
--
ALTER TABLE `combos`
  ADD PRIMARY KEY (`combo_id`);

--
-- Chỉ mục cho bảng `employees`
--
ALTER TABLE `employees`
  ADD PRIMARY KEY (`employee_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `membership_levels`
--
ALTER TABLE `membership_levels`
  ADD PRIMARY KEY (`level_id`);

--
-- Chỉ mục cho bảng `movies`
--
ALTER TABLE `movies`
  ADD PRIMARY KEY (`movie_id`);

--
-- Chỉ mục cho bảng `movie_categories`
--
ALTER TABLE `movie_categories`
  ADD PRIMARY KEY (`category_id`);

--
-- Chỉ mục cho bảng `movie_category_detail`
--
ALTER TABLE `movie_category_detail`
  ADD PRIMARY KEY (`movie_id`,`category_id`),
  ADD KEY `category_id` (`category_id`);

--
-- Chỉ mục cho bảng `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`);

--
-- Chỉ mục cho bảng `orders`
--
ALTER TABLE `orders`
  ADD PRIMARY KEY (`order_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `order_combos`
--
ALTER TABLE `order_combos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `combo_id` (`combo_id`);

--
-- Chỉ mục cho bảng `point_history`
--
ALTER TABLE `point_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `point_rules`
--
ALTER TABLE `point_rules`
  ADD PRIMARY KEY (`rule_id`);

--
-- Chỉ mục cho bảng `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`review_id`),
  ADD KEY `movie_id` (`movie_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `reward_rules`
--
ALTER TABLE `reward_rules`
  ADD PRIMARY KEY (`reward_id`);

--
-- Chỉ mục cho bảng `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`role_id`);

--
-- Chỉ mục cho bảng `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`room_id`),
  ADD KEY `cinema_id` (`cinema_id`);

--
-- Chỉ mục cho bảng `seats`
--
ALTER TABLE `seats`
  ADD PRIMARY KEY (`seat_id`),
  ADD KEY `room_id` (`room_id`);

--
-- Chỉ mục cho bảng `showtimes`
--
ALTER TABLE `showtimes`
  ADD PRIMARY KEY (`showtime_id`),
  ADD KEY `movie_id` (`movie_id`),
  ADD KEY `room_id` (`room_id`);

--
-- Chỉ mục cho bảng `social_accounts`
--
ALTER TABLE `social_accounts`
  ADD PRIMARY KEY (`social_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Chỉ mục cho bảng `tickets`
--
ALTER TABLE `tickets`
  ADD PRIMARY KEY (`ticket_id`),
  ADD KEY `order_id` (`order_id`),
  ADD KEY `showtime_id` (`showtime_id`),
  ADD KEY `seat_id` (`seat_id`);

--
-- Chỉ mục cho bảng `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `role_id` (`role_id`);

--
-- Chỉ mục cho bảng `user_notifications`
--
ALTER TABLE `user_notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `notification_id` (`notification_id`);

--
-- AUTO_INCREMENT cho các bảng đã đổ
--

--
-- AUTO_INCREMENT cho bảng `ai_chat_history`
--
ALTER TABLE `ai_chat_history`
  MODIFY `chat_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `cinemas`
--
ALTER TABLE `cinemas`
  MODIFY `cinemas_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `combos`
--
ALTER TABLE `combos`
  MODIFY `combo_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `employees`
--
ALTER TABLE `employees`
  MODIFY `employee_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `membership_levels`
--
ALTER TABLE `membership_levels`
  MODIFY `level_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `movies`
--
ALTER TABLE `movies`
  MODIFY `movie_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;

--
-- AUTO_INCREMENT cho bảng `movie_categories`
--
ALTER TABLE `movie_categories`
  MODIFY `category_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT cho bảng `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `orders`
--
ALTER TABLE `orders`
  MODIFY `order_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `order_combos`
--
ALTER TABLE `order_combos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `point_history`
--
ALTER TABLE `point_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `point_rules`
--
ALTER TABLE `point_rules`
  MODIFY `rule_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `reviews`
--
ALTER TABLE `reviews`
  MODIFY `review_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `reward_rules`
--
ALTER TABLE `reward_rules`
  MODIFY `reward_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `roles`
--
ALTER TABLE `roles`
  MODIFY `role_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `rooms`
--
ALTER TABLE `rooms`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `seats`
--
ALTER TABLE `seats`
  MODIFY `seat_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `showtimes`
--
ALTER TABLE `showtimes`
  MODIFY `showtime_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `social_accounts`
--
ALTER TABLE `social_accounts`
  MODIFY `social_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `tickets`
--
ALTER TABLE `tickets`
  MODIFY `ticket_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT cho bảng `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT cho bảng `user_notifications`
--
ALTER TABLE `user_notifications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Các ràng buộc cho các bảng đã đổ
--

--
-- Các ràng buộc cho bảng `ai_chat_history`
--
ALTER TABLE `ai_chat_history`
  ADD CONSTRAINT `ai_chat_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Các ràng buộc cho bảng `employees`
--
ALTER TABLE `employees`
  ADD CONSTRAINT `employees_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Các ràng buộc cho bảng `movie_category_detail`
--
ALTER TABLE `movie_category_detail`
  ADD CONSTRAINT `movie_category_detail_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`),
  ADD CONSTRAINT `movie_category_detail_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `movie_categories` (`category_id`);

--
-- Các ràng buộc cho bảng `orders`
--
ALTER TABLE `orders`
  ADD CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Các ràng buộc cho bảng `order_combos`
--
ALTER TABLE `order_combos`
  ADD CONSTRAINT `order_combos_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  ADD CONSTRAINT `order_combos_ibfk_2` FOREIGN KEY (`combo_id`) REFERENCES `combos` (`combo_id`);

--
-- Các ràng buộc cho bảng `point_history`
--
ALTER TABLE `point_history`
  ADD CONSTRAINT `point_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Các ràng buộc cho bảng `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`),
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Các ràng buộc cho bảng `rooms`
--
ALTER TABLE `rooms`
  ADD CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`cinema_id`) REFERENCES `cinemas` (`cinemas_id`);

--
-- Các ràng buộc cho bảng `seats`
--
ALTER TABLE `seats`
  ADD CONSTRAINT `seats_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`);

--
-- Các ràng buộc cho bảng `showtimes`
--
ALTER TABLE `showtimes`
  ADD CONSTRAINT `showtimes_ibfk_1` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`movie_id`),
  ADD CONSTRAINT `showtimes_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`);

--
-- Các ràng buộc cho bảng `social_accounts`
--
ALTER TABLE `social_accounts`
  ADD CONSTRAINT `social_accounts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);

--
-- Các ràng buộc cho bảng `tickets`
--
ALTER TABLE `tickets`
  ADD CONSTRAINT `tickets_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  ADD CONSTRAINT `tickets_ibfk_2` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`showtime_id`),
  ADD CONSTRAINT `tickets_ibfk_3` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`seat_id`);

--
-- Các ràng buộc cho bảng `user`
--
ALTER TABLE `user`
  ADD CONSTRAINT `user_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`);

--
-- Các ràng buộc cho bảng `user_notifications`
--
ALTER TABLE `user_notifications`
  ADD CONSTRAINT `user_notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `user_notifications_ibfk_2` FOREIGN KEY (`notification_id`) REFERENCES `notifications` (`notification_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
