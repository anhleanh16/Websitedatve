CREATE DATABASE IF NOT EXISTS sweetstarcinema;
USE sweetstarcinema;

CREATE TABLE Roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Roles (role_id, role_name, description) VALUES
    (1, 'admin', 'quản lý'),
    (2, 'user', 'Khách hàng thông thường'),
    (3, 'employee', 'nhân viên');

CREATE TABLE User (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT,
    full_name VARCHAR(100) NOT NULL,
    user_name VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    must_change_password TINYINT(1) NOT NULL DEFAULT 0,
    phone VARCHAR(20),
    birthday DATE,
    sex ENUM('Nam','Nu','Khac'),
    avatar VARCHAR(255),
    point INT DEFAULT 0,
    status ENUM('active','inactive','blocked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,
    last_login DATETIME NULL,

    FOREIGN KEY (role_id) REFERENCES Roles(role_id)
);

CREATE TABLE Social_Accounts (
    social_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider VARCHAR(50),
    provider_user_id VARCHAR(255),
    email VARCHAR(100),
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES User(id)
);

CREATE TABLE Notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE User_Notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    notification_id INT,
    is_read BOOLEAN DEFAULT FALSE,

    FOREIGN KEY (user_id) REFERENCES User(id),
    FOREIGN KEY (notification_id) REFERENCES Notifications(notification_id)
);

CREATE TABLE AI_Chat_History (
    chat_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    question TEXT,
    answer TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES User(id)
);

CREATE TABLE Point_History (
    history_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    points_change INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES User(id)
);

CREATE TABLE Movies (
    movie_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255),
    description TEXT,
    duration INT,
    age_limit INT,
    director VARCHAR(255),
    actors TEXT,
    trailer VARCHAR(255),
    poster VARCHAR(255),
    release_date DATE,
    status ENUM('coming_soon','now_showing','ended'),
    language VARCHAR(50),
    country VARCHAR(100)
);

CREATE TABLE Movie_Categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100)
);

CREATE TABLE Movie_Category_Detail (
    movie_id INT,
    category_id INT,

    PRIMARY KEY(movie_id, category_id),

    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    FOREIGN KEY (category_id) REFERENCES Movie_Categories(category_id)
);

CREATE TABLE Reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT,
    user_id INT,
    rating DECIMAL(2,1),
    comment TEXT,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    FOREIGN KEY (user_id) REFERENCES User(id)
);

CREATE TABLE Cinemas (
    cinemas_id INT AUTO_INCREMENT PRIMARY KEY,
    cinema_name VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(100),
    phone VARCHAR(20),
    image VARCHAR(255),
    status ENUM('active','inactive') DEFAULT 'inactive'
);

CREATE TABLE Rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    cinema_id INT,
    room_name VARCHAR(100),
    room_type ENUM('2D','3D','IMAX','VIP'),
    total_seat INT,
    status ENUM('active','inactive','maintenance') DEFAULT 'maintenance',

    FOREIGN KEY (cinema_id) REFERENCES Cinemas(cinemas_id)
);

CREATE TABLE Seats (
    seat_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT,
    seat_code VARCHAR(20),
    seat_type ENUM('Standard','VIP','Couple'),
    status ENUM('active','inactive'),

    FOREIGN KEY (room_id) REFERENCES Rooms(room_id)
);

CREATE TABLE RoomSeatGaps (
    seat_gap_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    gap_from INT NOT NULL,
    gap_to INT NOT NULL,
    sort_order INT DEFAULT 0,

    FOREIGN KEY (room_id) REFERENCES Rooms(room_id) ON DELETE CASCADE
);

CREATE TABLE Showtimes (
    showtime_id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT,
    room_id INT,
    start_time DATETIME,
    end_time DATETIME,
    price DECIMAL(12,2),
    price_standard DECIMAL(12,2),
    price_vip DECIMAL(12,2),
    price_couple DECIMAL(12,2),
    available_seats INT,
    status ENUM('active','cancelled','ended') DEFAULT 'active',
    campaign_id INT NULL,
    is_early_show TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,

    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    FOREIGN KEY (room_id) REFERENCES Rooms(room_id)
);

CREATE TABLE Screening_Campaigns (
    campaign_id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT NOT NULL,
    campaign_type ENUM('new_release','rerun','special_event') NOT NULL,
    reason TEXT,
    release_date DATE NOT NULL,
    official_end_date DATE NULL,
    early_show_enabled TINYINT(1) DEFAULT 0,
    early_show_days INT DEFAULT 0,
    early_show_duration_days INT DEFAULT 0,
    status ENUM('draft','active','completed','cancelled') DEFAULT 'draft',
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL,

    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    FOREIGN KEY (created_by) REFERENCES User(id)
);

CREATE TABLE Screening_Campaign_Slots (
    slot_id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    slot_type ENUM('official','early') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NULL,
    weekday_template VARCHAR(50) DEFAULT 'balanced',
    weekend_template VARCHAR(50) DEFAULT 'weekend',
    default_priority INT DEFAULT 3,
    default_slots_per_day INT DEFAULT 2,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (campaign_id) REFERENCES Screening_Campaigns(campaign_id) ON DELETE CASCADE
);

CREATE TABLE Screening_Campaign_Notes (
    note_id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    note_type ENUM('summary','reason','internal') DEFAULT 'summary',
    note_text TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (campaign_id) REFERENCES Screening_Campaigns(campaign_id) ON DELETE CASCADE
);

CREATE TABLE Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    booking_source VARCHAR(20) NOT NULL DEFAULT 'user',
    guest_name VARCHAR(100) NULL,
    guest_phone VARCHAR(20) NULL,
    guest_email VARCHAR(100) NULL,
    total_amount DECIMAL(12,2),
    payment_method VARCHAR(50),
    payment_status ENUM('pending','paid','failed'),
    order_date DATETIME,
    booking_code VARCHAR(50),
    ticket_qr_token CHAR(15) NULL UNIQUE,
    status ENUM('pending','confirmed','completed','cancelled'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES User(id)
);

CREATE TABLE Tickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    showtime_id INT,
    seat_id INT,
    qr_code VARCHAR(255),
    ticket_status ENUM('unused','used','cancelled'),
    check_in_time DATETIME NULL,

    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    FOREIGN KEY (showtime_id) REFERENCES Showtimes(showtime_id),
    FOREIGN KEY (seat_id) REFERENCES Seats(seat_id)
);

CREATE TABLE Combos (
    combo_id INT AUTO_INCREMENT PRIMARY KEY,
    combo_name VARCHAR(255),
    description TEXT,
    price DECIMAL(12,2),
    image VARCHAR(255)
);

CREATE TABLE Order_Combos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    combo_id INT,
    quantity INT DEFAULT 1,

    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    FOREIGN KEY (combo_id) REFERENCES Combos(combo_id)
);

CREATE TABLE Membership_Levels (
    level_id INT AUTO_INCREMENT PRIMARY KEY,
    level_name VARCHAR(50),
    min_points INT,
    max_points INT,
    benefits TEXT,
    discount_percent INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Point_Rules (
    rule_id INT AUTO_INCREMENT PRIMARY KEY,
    rule_name VARCHAR(100),
    spending_amount DECIMAL(12,2),
    earned_points INT,
    status BOOLEAN DEFAULT TRUE
);

CREATE TABLE Reward_Rules (
    reward_id INT AUTO_INCREMENT PRIMARY KEY,
    reward_name VARCHAR(100),
    required_points INT,
    reward_type VARCHAR(50),
    reward_value VARCHAR(100),
    status BOOLEAN DEFAULT TRUE
);

CREATE TABLE Employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    employee_code VARCHAR(50),
    position VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(12,2),
    status ENUM('active','inactive','leave') NOT NULL DEFAULT 'active',
    department VARCHAR(100),
    type ENUM('full_time','part_time') NOT NULL DEFAULT 'full_time',
    shifts VARCHAR(100),
    address TEXT,
    sex VARCHAR(10),
    dob DATE,
    avatar_url VARCHAR(255),
    citizen_id VARCHAR(20),
    id_card_front_url VARCHAR(255),
    id_card_back_url VARCHAR(255),
    cinema_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES User(id),
    FOREIGN KEY (cinema_id) REFERENCES Cinemas(cinemas_id)
);


USE sweetstarcinema;
UPDATE User
SET password='$2a$10$1G256nBgUCxFdjKLXlVLg.zDbl5oBm1pPvN6oNcMj2M1EWmLrLfqG'
WHERE email='anhanhle1997@gmail.com';

USE sweetstarcinema;
ALTER TABLE `Movies`
ADD COLUMN `posters` JSON NULL AFTER `poster`,
ADD COLUMN `is_deleted` BOOLEAN NOT NULL DEFAULT FALSE AFTER `country`,
ADD COLUMN `is_hidden` BOOLEAN NOT NULL DEFAULT FALSE AFTER `is_deleted`;

USE sweetstarcinema;
CREATE TABLE news (
    news_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    thumbnail VARCHAR(255),
    short_description TEXT,
    content LONGTEXT NOT NULL,

    category ENUM(
        'movie_news',
        'promotion',
        'event',
        'coming_soon',
        'review',
        'announcement'
    ) NOT NULL,

    author_id INT NOT NULL,

    view_count INT DEFAULT 0,

    status ENUM(
        'draft',
        'published',
        'hidden'
    ) DEFAULT 'draft',

    published_at DATETIME NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (author_id)
        REFERENCES employees(employee_id)
        ON DELETE CASCADE
);

USE sweetstarcinema;
CREATE TABLE Blogs (
    blog_id INT AUTO_INCREMENT PRIMARY KEY,
    author_id INT,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    thumbnail VARCHAR(255),
    summary TEXT,
    content LONGTEXT,
    category VARCHAR(100),
    tags VARCHAR(255),
    views INT DEFAULT 0,
    status ENUM('draft','published','hidden') DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (author_id) REFERENCES Employees(employee_id)
);

CREATE TABLE Blog_Categories(
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    category_name VARCHAR(100),
    description TEXT
);

CREATE TABLE Blog_Category_Detail(
    blog_id INT,
    category_id INT,
    PRIMARY KEY(blog_id, category_id),

    FOREIGN KEY(blog_id) REFERENCES Blogs(blog_id),
    FOREIGN KEY(category_id) REFERENCES Blog_Categories(category_id)
);

CREATE TABLE Blog_Comments(
    comment_id INT AUTO_INCREMENT PRIMARY KEY,
    blog_id INT,
    user_id INT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY(blog_id) REFERENCES Blogs(blog_id),
    FOREIGN KEY(user_id) REFERENCES User(id)
);

CREATE TABLE Blog_Likes(
    blog_id INT,
    user_id INT,
    PRIMARY KEY(blog_id,user_id),

    FOREIGN KEY(blog_id) REFERENCES Blogs(blog_id),
    FOREIGN KEY(user_id) REFERENCES User(id)
);

ALTER TABLE User
ADD level_id INT,
ADD FOREIGN KEY(level_id)
REFERENCES Membership_Levels(level_id);
