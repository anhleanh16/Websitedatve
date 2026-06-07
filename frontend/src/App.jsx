import { Routes, Route } from 'react-router-dom';
import './App.css';
import { UserRoutes } from './user/routes/userRoutes';
import { AdminRoutes } from './admin/routes/adminRoutes';

function App() {
  return (
    <Routes>
      {/* Admin: full-width, layout riêng, không bọc trong .app-content */}
      <Route path="/admin/*" element={<AdminRoutes />} />

      {/* User: bọc trong .app để dùng layout user */}
      <Route
        path="/*"
        element={
          <div className="app">
            <main className="app-content">
              <UserRoutes />
            </main>
          </div>
        }
      />
    </Routes>
  );
}

export default App;
