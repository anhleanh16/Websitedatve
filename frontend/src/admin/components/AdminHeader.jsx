import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { clearUser } from "../../redux/slices/userSlice";

export default function AdminHeader({ onMenuToggle }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    dispatch(clearUser());
    navigate('/');
  };

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
        <button className="btn-logout" onClick={handleLogout}>Đăng xuất</button>
      </div>
    </header>
  );
}
