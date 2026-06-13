import { useState, useEffect } from "react";
import AdminSidebar from "../components/AdminSidebar";
import AdminHeader from "../components/AdminHeader";
import "../admin.css";

export default function AdminLayout({ children }) {
  // Tự động thu sidebar nếu màn hình nhỏ hơn 1100px
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1100);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1100) {
        setCollapsed(true);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar   = () => setCollapsed(c => !c);
  const toggleMobile    = () => setMobileOpen(o => !o);
  const closeMobileMenu = () => setMobileOpen(false);

  return (
    <div className={`admin-layout${collapsed ? " sidebar-collapsed" : ""}`}>
      {/* Mobile backdrop */}
      {mobileOpen && <div className="sidebar-backdrop" onClick={closeMobileMenu} />}

      <AdminSidebar collapsed={collapsed} onToggle={toggleSidebar} mobileOpen={mobileOpen} onMobileClose={closeMobileMenu} />

      <div className="admin-content">
        <AdminHeader onMenuToggle={toggleMobile} />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
