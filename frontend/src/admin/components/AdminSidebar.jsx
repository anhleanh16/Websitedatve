import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

const NAV_ITEMS = [
  { to: "/admin/dashboard",     label: "Tổng quan",        icon: "⊞", roles: ["admin","manager"] },
  { to: "/admin/users",         label: "Tài khoản",        icon: "👥", roles: ["admin","manager","technician"] },
  { to: "/admin/staff",         label: "Nhân viên",        icon: "🧑‍💼", roles: ["admin","manager","technician"] },
  { to: "/admin/movies",        label: "Phim",             icon: "🎬", roles: ["admin","manager","technician"] },
  { to: "/admin/showtimes",     label: "Lịch chiếu",       icon: "🕐", roles: ["admin","manager","technician"] },
  { to: "/admin/cinemas",       label: "Rạp chiếu",        icon: "🎭", roles: ["admin","manager","technician"] },
  { to: "/admin/bookings",      label: "Đặt vé",            icon: "🎟", roles: ["admin","manager","staff","technician"] },
  { to: "/admin/statistics",     label: "Thống kê",          icon: "📊", roles: ["admin","manager","staff"] },
  { to: "/admin/combos",        label: "Combo",            icon: "🍿", roles: ["admin","manager","technician"] },
  { to: "/admin/promotions",    label: "Khuyến mãi",       icon: "🏷", roles: ["admin","manager","technician"] },
  { to: "/admin/points",        label: "Điểm thưởng",       icon: "⭐", roles: ["admin","manager","technician"] },
  { to: "/admin/news",          label: "Tin tức",          icon: "📰", roles: ["admin","manager","technician"] },
  { to: "/admin/blog",          label: "Blog",             icon: "📑", roles: ["admin","manager","technician"] },
  { to: "/admin/notifications", label: "Thông báo",        icon: "🔔", roles: ["admin","manager","technician"] },
  { to: "/admin/comments",      label: "Bình luận",        icon: "💬", roles: ["admin","manager","technician"] },
  { to: "/admin/settings",      label: "Cài đặt",          icon: "⚙", roles: ["admin","manager","technician"] },
];

export default function AdminSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const profile = useSelector((state) => state.user.profile);
  const role = String(profile?.role || "").toLowerCase();

  return (
    <aside className={`admin-sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        {!collapsed && <h2 className="sidebar-logo">Sweetstar</h2>}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? "Mở rộng" : "Thu gọn"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <ul>
          {NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role)).map(({ to, label, icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => isActive ? "active" : ""}
                title={collapsed ? label : undefined}
                onClick={onMobileClose}
              >
                <span className="nav-icon">{icon}</span>
                <span className="nav-label">{label}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <NavLink
              to="/"
              className={({ isActive }) => isActive ? "active" : ""}
              title={collapsed ? "Về trang chủ" : undefined}
              onClick={onMobileClose}
            >
              <span className="nav-icon">🏠</span>
              <span className="nav-label">Về trang chủ</span>
            </NavLink>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
