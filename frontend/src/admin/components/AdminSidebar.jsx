import { NavLink } from 'react-router-dom';

export default function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <div className="sidebar-header">
        <h2>Lunexa Admin</h2>
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li><NavLink to="/admin/dashboard">Dashboard</NavLink></li>
          <li><NavLink to="/admin/users">Users</NavLink></li>
          <li><NavLink to="/admin/movies">Movies</NavLink></li>
          <li><NavLink to="/admin/bookings">Bookings</NavLink></li>
          <li><NavLink to="/admin/reports">Reports</NavLink></li>
          <li><NavLink to="/admin/settings">Settings</NavLink></li>
        </ul>
      </nav>
    </aside>
  );
}
