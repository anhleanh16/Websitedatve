export default function Notifications() {
  const sampleNotifications = [
    {
      id: 1,
      title: "Thông báo hệ thống",
      message: "Cập nhật bảo trì vào 22:00 tối nay.",
      time: "2 giờ trước",
    },
    {
      id: 2,
      title: "Phim mới",
      message: "Đã thêm phim mới: Hành trình thiên hà.",
      time: "5 giờ trước",
    },
    {
      id: 3,
      title: "Đơn đặt vé",
      message: "Có 8 đơn đặt vé đang chờ xác nhận.",
      time: "1 ngày trước",
    },
  ];

  return (
    <div className="admin-notifications">
      <h2>Thông báo</h2>
      <div className="report-grid">
        {sampleNotifications.map((item) => (
          <div className="report-card" key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.message}</p>
            <p style={{ color: "#a2b4ff", marginTop: "10px" }}>{item.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
