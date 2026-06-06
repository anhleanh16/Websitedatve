create database Lunexa;
Use Lunexa;

CREATE TABLE Roles (
    role_id INT AUTO_INCREMENT PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE User (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
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
    trailer_url VARCHAR(255),
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
    image VARCHAR(255)
);

CREATE TABLE Rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    cinema_id INT,
    room_name VARCHAR(100),
    room_type ENUM('2D','3D','IMAX','VIP'),
    total_seat INT,

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

CREATE TABLE Showtimes (
    showtime_id INT AUTO_INCREMENT PRIMARY KEY,
    movie_id INT,
    room_id INT,
    start_time DATETIME,
    end_time DATETIME,
    price DECIMAL(12,2),
    available_seats INT,
    status ENUM('active','cancelled'),

    FOREIGN KEY (movie_id) REFERENCES Movies(movie_id),
    FOREIGN KEY (room_id) REFERENCES Rooms(room_id)
);

CREATE TABLE Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    total_amount DECIMAL(12,2),
    payment_method VARCHAR(50),
    payment_status ENUM('pending','paid','failed'),
    order_date DATETIME,
    booking_code VARCHAR(50),
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
    status ENUM('active','inactive'),

    FOREIGN KEY (user_id) REFERENCES User(id)
);