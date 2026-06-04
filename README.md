# Lunexa-Movix

Monorepo dự án Lunexa-Movix gồm frontend React/Vite và backend Node.js/Express.

## Cấu trúc thư mục

- `frontend/` - React app hiện tại với Vite
- `backend/` - Node.js + Express API
- `database/` - chứa file `db.sql`

## Chạy dự án

1. Cài dependency cho cả workspace:
   ```bash
   npm install
   ```
2. Chạy frontend:
   ```bash
   npm run dev
   ```
3. Chạy backend:
   ```bash
   npm run start:backend
   ```

## Backend mẫu

- `backend/app.js` - cấu hình Express cơ bản
- `backend/server.js` - khởi động server
- `backend/config/db.js` - kết nối MySQL mẫu

## Ghi chú

Nếu muốn mở rộng backend, thêm controller vào `backend/controllers`, route vào `backend/routes`, model vào `backend/models`, middleware vào `backend/middleware`, và dịch vụ vào `backend/services`.
