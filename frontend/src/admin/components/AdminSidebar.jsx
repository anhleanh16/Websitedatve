import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { to: "/admin/dashboard",     label: "Tổng quan",        icon: "⊞" },
  { to: "/admin/users",         label: "Khách hàng",       icon: "👥" },
  { to: "/admin/staff",         label: "Nhân viên",        icon: "🧑‍💼" },
  { to: "/admin/movies",        label: "Phim",             icon: "🎬" },
  { to: "/admin/showtimes",     label: "Lịch chiếu",       icon: "🕐" },
  { to: "/admin/cinemas",       label: "Rạp chiếu",        icon: "🎭" },
  { to: "/admin/bookings",      label: "Đặt vé",           icon: "🎟" },
  { to: "/admin/promotions",    label: "Khuyến mãi",       icon: "🏷" },
  { to: "/admin/notifications", label: "Thông báo",        icon: "🔔" },
  { to: "/admin/comments",      label: "Bình luận",        icon: "💬" },
  { to: "/admin/reports",       label: "Báo cáo",          icon: "📊" },
  { to: "/admin/settings",      label: "Cài đặt",          icon: "⚙" },
];

export default function AdminSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  return (
    <aside className={`admin-sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
      {/* Header */}
      <div className="sidebar-header">
        {!collapsed && <h2 className="sidebar-logo">Lunexa</h2>}
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
          {NAV_ITEMS.map(({ to, label, icon }) => (
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
        </ul>
      </nav>
    </aside>
  );
}
