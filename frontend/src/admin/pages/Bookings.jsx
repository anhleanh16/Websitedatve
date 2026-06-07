const sampleBookings = [
  {
    id: "B0087",
    user: "Nguyen An",
    movie: "Đêm Thiên Cầu",
    date: "08/06/2026",
    status: "Đã đặt",
  },
  {
    id: "B0091",
    user: "Tran Binh",
    movie: "Tiếng vọng im lặng",
    date: "09/06/2026",
    status: "Đang chờ",
  },
  {
    id: "B0095",
    user: "Le Chi",
    movie: "Hỗn loạn Tokyo",
    date: "09/06/2026",
    status: "Đã hủy",
  },
];

export default function AdminBookings() {
  return (
    <div className="admin-bookings">
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Mã vé</th>
              <th>Người dùng</th>
              <th>Phim</th>
              <th>Ngày</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {sampleBookings.map((booking) => (
              <tr key={booking.id}>
                <td>{booking.id}</td>
                <td>{booking.user}</td>
                <td>{booking.movie}</td>
                <td>{booking.date}</td>
                <td>
                  <span
                    className={`status-pill ${booking.status === "Đã đặt" ? "booked" : booking.status === "Đã hủy" ? "cancelled" : "pending"}`}
                  >
                    {booking.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
