export default function AdminHeader() {
  return (
    <header className="admin-header">
      <div className="header-left">
        <h1>Bảng điều khiển quản trị</h1>
      </div>
      <div className="header-right">
        <button className="btn-logout">Đăng xuất</button>
      </div>
    </header>
  );
}
