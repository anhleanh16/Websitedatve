import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

const NAV_ITEMS = [
  { to: "/admin/dashboard",     label: "Tổng quan",        icon: "⊞", roles: ["admin"] },
  { to: "/admin/users",         label: "Tài khoản",         icon: "👥", roles: ["admin"] },
  { to: "/admin/staff",         label: "Nhân viên",        icon: "🧑‍💼", roles: ["admin"] },
  { to: "/admin/attendance",    label: "Chấm công",        icon: "🕘", roles: ["admin"] },
  { to: "/admin/movies",        label: "Phim",             icon: "🎬", roles: ["admin","employee"] },
  { to: "/admin/showtimes",     label: "Lịch chiếu",       icon: "🕐", roles: ["admin","employee"] },
  { to: "/admin/cinemas",       label: "Rạp chiếu",        icon: "🎭", roles: ["admin","employee"] },
  { to: "/admin/bookings",      label: "Đặt vé",            icon: "🎟", roles: ["admin","employee"] },
  { to: "/admin/statistics",     label: "Thống kê",          icon: "📊", roles: ["admin","employee"] },
  { to: "/admin/combos",        label: "Combo",            icon: "🍿", roles: ["admin","employee"] },
  { to: "/admin/promotions",    label: "Khuyến mãi",       icon: "🏷", roles: ["admin","employee"] },
  { to: "/admin/points",        label: "Điểm thưởng",       icon: "⭐", roles: ["admin","employee"] },
  { to: "/admin/news",          label: "Tin tức",          icon: "📰", roles: ["admin","employee"] },
  { to: "/admin/blog",          label: "Blog",             icon: "📑", roles: ["admin","employee"] },
  { to: "/admin/notifications", label: "Thông báo",        icon: "🔔", roles: ["admin","employee"] },
  { to: "/admin/comments",      label: "Bình luận",        icon: "💬", roles: ["admin","employee"] },
  { to: "/admin/settings",      label: "Cài đặt",          icon: "⚙", roles: ["admin","employee"] },
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
