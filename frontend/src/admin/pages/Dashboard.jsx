export default function AdminDashboard() {
  return (
    <div className="admin-dashboard">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Người dùng</h3>
          <p>Tài khoản hoạt động</p>
          <div className="stat-value">1.482</div>
        </div>
        <div className="stat-card">
          <h3>Phim</h3>
          <p>Đang được liệt kê</p>
          <div className="stat-value">86</div>
        </div>
        <div className="stat-card">
          <h3>Đặt vé</h3>
          <p>Xác nhận hôm nay</p>
          <div className="stat-value">219</div>
        </div>
        <div className="stat-card">
          <h3>Doanh thu</h3>
          <p>Dự đoán tháng</p>
          <div className="stat-value">24.8k</div>
        </div>
      </div>

      <div className="dashboard-overview">
        <section className="overview-panel">
          <h2>Tổng quan hiệu suất</h2>
          <div className="overview-chart">Biểu đồ tổng quan</div>
        </section>

        <section className="activity-panel">
          <h2>Hoạt động gần đây</h2>
          <div className="activity-list">
            Đơn đặt vé mới, đăng ký người dùng và cập nhật hệ thống
          </div>
        </section>
      </div>
    </div>
  );
}
