# Lunexa-Movix

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
DB_NAME=lunexa
PORT=4000
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
