export default function Reports() {
  return (
    <div className="admin-reports">
      <div className="report-grid">
        <div className="report-card">
          <h3>Phim bán chạy nhất</h3>
          <p>Đêm Thiên Cầu với 1.204 vé đã bán.</p>
        </div>
        <div className="report-card">
          <h3>Tăng trưởng hàng tháng</h3>
          <p>Doanh thu tăng 18% so với tháng trước.</p>
        </div>
        <div className="report-card">
          <h3>Khách hàng hoạt động</h3>
          <p>1.482 người dùng đã đặt vé trong 30 ngày qua.</p>
        </div>
        <div className="report-card">
          <h3>Chờ duyệt</h3>
          <p>Có 12 đơn đặt vé cần xem xét.</p>
        </div>
      </div>
    </div>
  );
}
