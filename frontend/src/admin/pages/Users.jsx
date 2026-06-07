const sampleUsers = [
  {
    id: 1,
    name: "Nguyen An",
    email: "an@example.com",
    role: "Khách hàng",
    status: "Đã kích hoạt",
  },
  {
    id: 2,
    name: "Tran Binh",
    email: "binh@example.com",
    role: "Khách hàng",
    status: "Đã kích hoạt",
  },
  {
    id: 3,
    name: "Le Chi",
    email: "chi@example.com",
    role: "Điều hành viên",
    status: "Tạm khóa",
  },
  {
    id: 4,
    name: "Pham Du",
    email: "du@example.com",
    role: "Quản trị viên",
    status: "Đã kích hoạt",
  },
];

export default function AdminUsers() {
  return (
    <div className="admin-users">
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Họ tên</th>
              <th>Email</th>
              <th>Vai trò</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {sampleUsers.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>
                  <span
                    className={`status-pill ${user.status === "Đã kích hoạt" ? "booked" : user.status === "Tạm khóa" ? "cancelled" : "pending"}`}
                  >
                    {user.status}
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
