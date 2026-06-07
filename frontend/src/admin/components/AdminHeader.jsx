export default function AdminHeader({ onMenuToggle }) {
  return (
    <header className="admin-header">
      <div className="header-left">
        {/* Nút hamburger cho mobile */}
        <button className="header-menu-btn" onClick={onMenuToggle} title="Menu">
          ☰
        </button>
        <h1>Bảng điều khiển quản trị</h1>
      </div>
      <div className="header-right">
        <button className="btn-logout">Đăng xuất</button>
      </div>
    </header>
  );
}
