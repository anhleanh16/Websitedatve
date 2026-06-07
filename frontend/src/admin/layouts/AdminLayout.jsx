import AdminSidebar from "../components/AdminSidebar";
import AdminHeader from "../components/AdminHeader";
import "../admin.css";

export default function AdminLayout({ children }) {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <div className="admin-content">
        <AdminHeader />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}
