import { NavLink } from "react-router-dom";

export default function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h2>Lunexa Quản trị</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink
              to="/admin/dashboard"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Tổng quan
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/users"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Người dùng
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/movies"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Phim
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/showtimes"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Lịch chiếu
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/cinemas"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Rạp chiếu
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/bookings" className={({ isActive }) => (isActive ? "active" : "")}>
              Đặt vé
            </NavLink>
          </li>
          <li>
            <NavLink to="/admin/promotions" className={({ isActive }) => (isActive ? "active" : "")}>
              Khuyến mãi
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/notifications"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Thông báo
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/comments"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Bình luận
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/reports"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Báo cáo
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/admin/settings"
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              Cài đặt
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
