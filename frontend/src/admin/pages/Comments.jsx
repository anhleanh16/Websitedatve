export default function Comments() {
  const sampleComments = [
    {
      id: 1,
      user: "Nguyen An",
      content: "Phim rất hay, âm thanh sống động.",
      status: "Đã duyệt",
    },
    {
      id: 2,
      user: "Tran Binh",
      content: "Phòng vé nên cập nhật thêm suất chiếu.",
      status: "Chờ duyệt",
    },
    {
      id: 3,
      user: "Le Chi",
      content: "Giá vé hơi cao vào cuối tuần.",
      status: "Đã từ chối",
    },
  ];

  return (
    <div className="admin-comments">
      <h2>Bình luận</h2>
      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Người dùng</th>
              <th>Nội dung</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {sampleComments.map((comment) => (
              <tr key={comment.id}>
                <td>{comment.id}</td>
                <td>{comment.user}</td>
                <td>{comment.content}</td>
                <td>{comment.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
