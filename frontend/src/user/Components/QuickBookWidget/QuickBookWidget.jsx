import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toAbsoluteAssetUrl } from "../../../utils/api";
import "./QuickBookWidget.css";

const BASE = import.meta.env.VITE_API_URL || "/api";

async function fetchJSON(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return { label: `${days[d.getDay()]} ${dd}/${mm}`, iso: dateStr };
}

function getNext7Days() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().split("T")[0];
    days.push(formatDate(iso));
  }
  return days;
}

export default function QuickBookWidget({ defaultCinemaId = null, defaultMovieId = null }) {
  const navigate = useNavigate();

  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [showtimes, setShowtimes] = useState([]);

  const [selectedMovieId, setSelectedMovieId] = useState(defaultMovieId ? String(defaultMovieId) : "");
  const [selectedCinemaId, setSelectedCinemaId] = useState(defaultCinemaId ? String(defaultCinemaId) : "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  const [loadingShowtimes, setLoadingShowtimes] = useState(false);

  useEffect(() => {
    fetchJSON("/user/movies?status=now_showing")
      .then((d) => setMovies(d.movies || []))
      .catch(() => {});
    fetchJSON("/user/cinemas")
      .then((d) => setCinemas(d.cinemas || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMovieId) {
      setShowtimes([]);
      setSelectedDate("");
      setSelectedShowtime(null);
      return;
    }

    setLoadingShowtimes(true);
    setSelectedDate("");
    setSelectedShowtime(null);

    fetchJSON(`/user/movies/${selectedMovieId}`)
      .then((d) => {
        const rows = d.movie?.showtimes || [];
        const filtered = selectedCinemaId
          ? rows.filter((s) => String(s.cinema_id) === String(selectedCinemaId))
          : rows;
        setShowtimes(filtered);
      })
      .catch(() => setShowtimes([]))
      .finally(() => setLoadingShowtimes(false));
  }, [selectedMovieId, selectedCinemaId]);

  const availableDates = (() => {
    if (!showtimes.length) return [];
    const now = new Date();
    const dateSet = new Set();
    showtimes.forEach((s) => {
      const d = new Date(s.start_time);
      if (d > now) {
        dateSet.add(d.toISOString().split("T")[0]);
      }
    });
    return [...dateSet].sort().slice(0, 7).map(formatDate);
  })();

  const showtimesForDate = (() => {
    if (!selectedDate || !showtimes.length) return [];
    const now = new Date();
    return showtimes.filter((s) => {
      const d = new Date(s.start_time);
      return d.toISOString().split("T")[0] === selectedDate && d > now;
    });
  })();

  const availableCinemas = (() => {
    if (!showtimes.length) return cinemas;
    const ids = new Set(showtimes.map((s) => String(s.cinema_id)));
    return cinemas.filter((c) => ids.has(String(c.cinemas_id)));
  })();

  function handleMovieSelect(movieId) {
    setSelectedMovieId(movieId);
    setSelectedCinemaId(defaultCinemaId ? String(defaultCinemaId) : "");
    setSelectedShowtime(null);
  }

  function handleBook() {
    if (!selectedShowtime) return;
    const movie = movies.find((m) => String(m.movie_id) === String(selectedMovieId));
    const cinema = cinemas.find((c) => String(c.cinemas_id) === String(selectedCinemaId || selectedShowtime.cinema_id));
    const d = new Date(selectedShowtime.start_time);
    const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dayLabel = `${days[d.getDay()]} ${dd}/${mm}`;
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const timeLabel = `${hh}:${min} - ${selectedShowtime.room_type || "2D"}`;

    navigate("/booking", {
      state: {
        movieId: Number(selectedMovieId),
        movieTitle: movie?.title || "",
        ageLimit: movie?.age_limit || 0,
        cinema: selectedShowtime.cinema_name || cinema?.cinema_name || "",
        cinemaId: selectedShowtime.cinema_id || Number(selectedCinemaId),
        showtimeId: selectedShowtime.showtime_id,
        roomId: selectedShowtime.room_id,
        roomName: selectedShowtime.room_name || "",
        roomType: selectedShowtime.room_type || "2D",
        day: dayLabel,
        time: timeLabel,
      },
    });
  }

  const canBook = !!selectedShowtime;
  const selectedMovie = movies.find((m) => String(m.movie_id) === String(selectedMovieId));

  return (
    <div className="qbw">
      <div className="qbw-header">
        <h4>🎟️ Đặt vé nhanh</h4>
        <span>Chọn phim và suất chiếu phù hợp nhất.</span>
      </div>

      <div className="qbw-step">
        <label className="qbw-label">
          <span className="qbw-step-num">1</span> Chọn phim đang chiếu
        </label>
        {movies.length === 0 ? (
          <p className="qbw-empty">Hiện chưa có phim đang chiếu.</p>
        ) : (
          <div className="qbw-movies-grid">
            {movies.map((movie) => {
              const isActive = String(movie.movie_id) === String(selectedMovieId);
              const imageUrl = movie.poster_url || movie.image || movie.poster || "";

              return (
                <button
                  type="button"
                  key={movie.movie_id}
                  className={`qbw-movie-card${isActive ? " active" : ""}`}
                  onClick={() => handleMovieSelect(movie.movie_id)}
                >
                  <div className="qbw-movie-poster-wrap">
                    {imageUrl ? (
                      <img src={toAbsoluteAssetUrl(imageUrl)} alt={movie.title} className="qbw-movie-poster" />
                    ) : (
                      <div className="qbw-movie-poster fallback">🎬</div>
                    )}
                  </div>
                  <div className="qbw-movie-meta">
                    <span className="qbw-movie-title">{movie.title}</span>
                    <span className="qbw-movie-sub">
                      {movie.genre || "Phim chiếu rạp"}
                      {movie.age_limit ? ` • ${movie.age_limit}+` : ""}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="qbw-step">
        <label className="qbw-label">
          <span className="qbw-step-num">2</span> Chọn suất chiếu
        </label>

        {!selectedMovieId ? (
          <p className="qbw-empty">Vui lòng chọn một phim để xem suất chiếu.</p>
        ) : loadingShowtimes ? (
          <p className="qbw-loading">Đang tải suất chiếu cho phim này…</p>
        ) : availableDates.length === 0 ? (
          <p className="qbw-empty">Phim này hiện chưa có suất chiếu trong 7 ngày tới.</p>
        ) : (
          <>
            <div className="qbw-dates">
              {availableDates.map((d) => (
                <button
                  key={d.iso}
                  type="button"
                  className={`qbw-date-btn${selectedDate === d.iso ? " active" : ""}`}
                  onClick={() => {
                    setSelectedDate(d.iso);
                    setSelectedShowtime(null);
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            {selectedDate ? (
              showtimesForDate.length > 0 ? (
                <div className="qbw-times">
                  {showtimesForDate.map((s) => {
                    const d = new Date(s.start_time);
                    const hh = String(d.getHours()).padStart(2, "0");
                    const min = String(d.getMinutes()).padStart(2, "0");
                    const label = `${hh}:${min}`;
                    const isSelected = selectedShowtime?.showtime_id === s.showtime_id;

                    return (
                      <button
                        key={s.showtime_id}
                        type="button"
                        className={`qbw-time-btn${isSelected ? " active" : ""}`}
                        onClick={() => setSelectedShowtime(s)}
                        title={`${s.cinema_name || "Rạp"} • ${s.room_name || "Phòng"}`}
                      >
                        <span className="qbw-time">{label}</span>
                        <span className="qbw-format">{s.room_type || "2D"}</span>
                        {s.cinema_name && <span className="qbw-cinema-hint">{s.cinema_name}</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="qbw-empty">Không có suất chiếu cho ngày này.</p>
              )
            ) : (
              <p className="qbw-empty">Chọn một ngày để xem suất chiếu.</p>
            )}
          </>
        )}
      </div>

      <button
        className={`qbw-book-btn${canBook ? " ready" : ""}`}
        disabled={!canBook}
        onClick={handleBook}
      >
        {canBook ? "🎟️ Đặt vé ngay" : "Chọn suất chiếu để đặt vé"}
      </button>

      {selectedShowtime && selectedMovie && (() => {
        const d = new Date(selectedShowtime.start_time);
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");

        return (
          <div className="qbw-summary">
            <div className="qbw-summary-row">
              <span>🎬</span>
              <span>{selectedMovie.title}</span>
            </div>
            <div className="qbw-summary-row">
              <span>🏢</span>
              <span>{selectedShowtime.cinema_name || "Rạp chiếu"}</span>
            </div>
            <div className="qbw-summary-row">
              <span>🕐</span>
              <span>{`${hh}:${min} - ${selectedShowtime.room_type || "2D"}`}</span>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
