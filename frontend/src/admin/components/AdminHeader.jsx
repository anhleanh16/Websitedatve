export default function AdminHeader() {
  return (
    <header className="admin-header">
      <div className="header-left">
        <h1>Admin Control Panel</h1>
      </div>
      <div className="header-right">
        <button className="btn-logout">Logout</button>
      </div>
    </header>
  );
}
