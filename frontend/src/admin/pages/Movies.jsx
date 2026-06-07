const sampleMovies = [
  {
    id: 1,
    title: "Đêm Thiên Cầu",
    genre: "Khoa học viễn tưởng",
    status: "Đang chiếu",
  },
  { id: 2, title: "Tiếng vọng im lặng", genre: "Tâm lý", status: "Sắp chiếu" },
  { id: 3, title: "Hỗn loạn Tokyo", genre: "Hành động", status: "Đang chiếu" },
];

export default function AdminMovies() {
  return (
    <div className="admin-movies">
      <div className="movie-grid-admin">
        {sampleMovies.map((movie) => (
          <div className="movie-card" key={movie.id}>
            <div className="movie-cover" />
            <div>
              <h3>{movie.title}</h3>
              <p>{movie.genre}</p>
            </div>
            <div className="action-list">
              <span className="action-pill">{movie.status}</span>
              <span className="action-pill">Sửa</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
