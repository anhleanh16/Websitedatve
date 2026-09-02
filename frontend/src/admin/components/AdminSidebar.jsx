import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

const NAV_ITEMS = [
  { to: "/admin/dashboard",     label: "Tổng quan",        icon: "⊞", roles: ["admin"] },
  { to: "/admin/users",         label: "Tài khoản",         icon: "👥", roles: ["admin"] },
  { to: "/admin/staff",         label: "Nhân viên",        icon: "🧑‍💼", roles: ["admin", "employee"] },
  { to: "/admin/attendance",    label: "Chấm công",        icon: "🕘", roles: ["admin", "employee"] },
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
  let storedProfile = {};
  try { storedProfile = JSON.parse(localStorage.getItem("user") || "{}"); } catch { storedProfile = {}; }
  const currentProfile = { ...storedProfile, ...(profile || {}) };
  const role = String(currentProfile.role || "").toLowerCase();
  const isManager = role === "manager" || (role === "employee" && /quản lý|quan ly|manager/i.test(String(currentProfile.employee_position || currentProfile.position || "")));
  const effectiveRole = isManager ? "employee" : role;
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if (role === "employee" && !isManager) return item.to === "/admin/bookings";
    return !item.roles || item.roles.includes(effectiveRole);
  });

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
          {visibleNavItems.map(({ to, label, icon }) => (
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
