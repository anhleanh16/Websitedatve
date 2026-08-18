# Sweetstar Movie

Dự án monorepo gồm frontend (React + Vite) và backend (Node.js + Express). Tài nguyên chính:

- `frontend/` — ứng dụng React (Vite)
- `backend/` — API Node.js/Express
- `database/` — file SQL mẫu `db.sql`

**Yêu cầu**

- Node.js và npm đã cài sẵn
- MySQL (để import `database/db.sql` nếu cần)

**Cài đặt phụ thuộc**

- Từ thư mục gốc của repo, cài tất cả package (workspaces):

```bash
npm run install:all
# hoặc
npm install
```

**Biến môi trường (backend)**

Tạo file `.env` trong thư mục `backend/` với các biến tối thiểu:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sweetstar
PORT=4000
```

**Cấu hình Sweetstar AI**

AI Assistant sử dụng Gemini từ backend. Mở `backend/.env` và nhập API key lấy tại [Google AI Studio](https://aistudio.google.com/apikey):

```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.6-flash
GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
```

Không đặt API key trong `frontend/.env` hoặc mã React. Sau khi thêm hoặc thay đổi key, hãy tắt và chạy lại backend:

```bash
cd backend
npm run dev
```

Nếu chưa có key, chat sẽ trả về thông báo `AI Assistant chưa được cấu hình trên máy chủ.`. Khóa được đọc mỗi lần backend khởi động, nên không cần build lại frontend.

Để bật tính năng xác minh email khi đăng ký, bổ sung thêm:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=Sweetstar Movie <your_email@gmail.com>

# URL dùng trong email xác minh
BACKEND_BASE_URL=http://localhost:4000
FRONTEND_LOGIN_URL=http://localhost:5173/Logins/Login
FRONTEND_RESET_PASSWORD_URL=http://localhost:5173/reset-password

# TTL token xác minh (phút): 5
EMAIL_VERIFY_TOKEN_TTL_MINUTES=5

# TTL token đặt lại mật khẩu (phút): 5
PASSWORD_RESET_TOKEN_TTL_MINUTES=5
```

**Thiết lập cơ sở dữ liệu**

- Import `database/db.sql` vào MySQL (ví dụ dùng `mysql` CLI hoặc MySQL Workbench):

```bash
mysql -u root -p < database/db.sql
```

**Chạy dự án (phát triển)**

- Chạy frontend (từ root hoặc vào `frontend`):

```bash
npm run dev           # từ root, gọi workspace frontend
# hoặc
cd frontend && npm run dev
```

- Chạy backend (từ root hoặc vào `backend`):

```bash
npm run start:backend # từ root, gọi workspace backend (chạy nodemon)
# hoặc
cd backend && npm run dev
```

**Build & Preview frontend**

```bash
npm run build      # build frontend (từ root)
npm run preview    # preview bản build
```

**Các script chính (tại root `package.json`)**

- `dev` : chạy frontend trong chế độ phát triển
- `start:backend` : chạy backend (script `dev` của `backend` sử dụng `nodemon`)
- `install:all` : cài dependencies cho tất cả workspaces

**Cấu trúc nhanh**

- Backend: `backend/app.js`, `backend/server.js`, `backend/config/db.js`, `backend/src/*`
- Frontend: `frontend/src/` chứa các component, routes và services

Nếu bạn muốn mình cập nhật README tiếng Anh hoặc thêm hướng dẫn triển khai (Docker, PM2, CI), nói mình biết.
