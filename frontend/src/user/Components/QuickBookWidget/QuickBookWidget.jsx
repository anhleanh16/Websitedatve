import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toAbsoluteAssetUrl } from "../../../utils/api";
import { formatMovieTitle } from "../../../utils/movieTitle";
import "./QuickBookWidget.css";

const BASE = import.meta.env.VITE_API_URL || "/api";

async function fetchJSON(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

function formatDate(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return { weekday: days[d.getDay()], dayMonth: `${dd}/${mm}`, label: `${days[d.getDay()]} ${dd}/${mm}`, iso: dateStr };
}

function toLocalDateKey(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getNext7Days() {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const iso = toLocalDateKey(d);
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

  const [loadingShowtimes, setLoadingShowtimes] = useState(Boolean(defaultMovieId));

  useEffect(() => {
    fetchJSON("/user/movies?status=now_showing")
      .then((d) => setMovies((d.movies || []).map((movie) => ({
        ...movie,
        title: formatMovieTitle(movie.title),
      }))))
      .catch(() => {});
    fetchJSON("/user/cinemas")
      .then((d) => setCinemas(d.cinemas || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMovieId) return undefined;

    const controller = new AbortController();

    fetchJSON(`/user/movies/${selectedMovieId}`, { signal: controller.signal })
      .then((d) => {
        const rows = d.movie?.showtimes || [];
        const filteredRows = selectedCinemaId
          ? rows.filter((s) => String(s.cinema_id) === String(selectedCinemaId))
          : rows;
        const now = new Date();
        const allowedDates = new Set(getNext7Days().map((item) => item.iso));
        const firstDate = filteredRows
          .filter((showtime) => new Date(showtime.start_time) > now)
          .map((showtime) => toLocalDateKey(showtime.start_time))
          .filter((date) => allowedDates.has(date))
          .sort()[0] || "";

        setShowtimes(rows);
        setSelectedDate(firstDate);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setShowtimes([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingShowtimes(false);
      });

    return () => controller.abort();
  }, [selectedMovieId, selectedCinemaId]);

  const filteredShowtimes = selectedCinemaId
    ? showtimes.filter((showtime) => String(showtime.cinema_id) === String(selectedCinemaId))
    : showtimes;

  const availableDates = (() => {
    if (!filteredShowtimes.length) return [];
    const now = new Date();
    const allowedDates = new Set(getNext7Days().map((item) => item.iso));
    const dateSet = new Set();
    filteredShowtimes.forEach((s) => {
      const d = new Date(s.start_time);
      if (d > now) {
        const dateKey = toLocalDateKey(d);
        if (allowedDates.has(dateKey)) dateSet.add(dateKey);
      }
    });
    return [...dateSet].sort().slice(0, 7).map(formatDate);
  })();

  const showtimesForDate = (() => {
    if (!selectedDate || !filteredShowtimes.length) return [];
    const now = new Date();
    return filteredShowtimes.filter((s) => {
      const d = new Date(s.start_time);
      return toLocalDateKey(d) === selectedDate && d > now;
    }).sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  })();

  const availableCinemas = (() => {
    if (!showtimes.length) return cinemas;
    const ids = new Set(showtimes.map((s) => String(s.cinema_id)));
    return cinemas.filter((c) => ids.has(String(c.cinemas_id)));
  })();

  function handleMovieSelect(movieId) {
    const nextMovieId = String(movieId || "");
    setSelectedMovieId(nextMovieId);
    setSelectedCinemaId(defaultCinemaId ? String(defaultCinemaId) : "");
    setShowtimes([]);
    setSelectedDate("");
    setSelectedShowtime(null);
    setLoadingShowtimes(Boolean(nextMovieId));
  }

  function handleCinemaSelect(cinemaId) {
    const nextCinemaId = String(cinemaId || "");
    setSelectedCinemaId(nextCinemaId);
    setSelectedDate("");
    setSelectedShowtime(null);
    setLoadingShowtimes(Boolean(selectedMovieId));
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
  const selectedCinema = cinemas.find((cinema) => String(cinema.cinemas_id) === String(selectedCinemaId));
  const currentStep = !selectedMovieId ? 1 : !selectedDate ? 2 : 3;

  return (
    <div className="qbw">
      <div className="qbw-header">
        <div className="qbw-header-icon" aria-hidden="true">🎟️</div>
        <div className="qbw-header-copy">
          <span className="qbw-eyebrow">Nhanh chóng · Tiện lợi</span>
          <h4>Đặt vé nhanh</h4>
          <p>Chọn đủ thông tin trong 3 bước đơn giản.</p>
        </div>
      </div>

      <div className="qbw-progress" aria-label={`Đang ở bước ${currentStep} trên 3`}>
        {["Phim", "Lịch chiếu", "Xác nhận"].map((label, index) => {
          const step = index + 1;
          const isDone = step < currentStep || (step === 3 && canBook);
          const isActive = step === currentStep;
          return (
            <div key={label} className={`qbw-progress-item${isDone ? " done" : ""}${isActive ? " active" : ""}`}>
              <span>{isDone ? "✓" : step}</span>
              <small>{label}</small>
            </div>
          );
        })}
      </div>

      <section className="qbw-step qbw-step-movie">
        <div className="qbw-step-head">
          <span className="qbw-step-num">1</span>
          <div>
            <strong>Chọn phim</strong>
            <small>Phim đang chiếu tại Sweetstar</small>
          </div>
        </div>

        <label className="qbw-field">
          <span className="qbw-field-label">Phim muốn xem</span>
          <span className="qbw-select-wrap">
            <span className="qbw-select-icon" aria-hidden="true">🎬</span>
            <select
              value={selectedMovieId}
              onChange={(event) => handleMovieSelect(event.target.value)}
              disabled={movies.length === 0}
            >
              <option value="">Chọn một bộ phim</option>
              {movies.map((movie) => (
                <option key={movie.movie_id} value={movie.movie_id}>{movie.title}</option>
              ))}
            </select>
          </span>
        </label>

        {movies.length === 0 && <div className="qbw-state">Hiện chưa có phim đang chiếu.</div>}

        {selectedMovie && (() => {
          const imageUrl = selectedMovie.poster_url || selectedMovie.image || selectedMovie.poster || "";
          return (
            <div className="qbw-selected-movie">
              <div className="qbw-selected-poster">
                {imageUrl
                  ? <img src={toAbsoluteAssetUrl(imageUrl)} alt="" />
                  : <span aria-hidden="true">🎬</span>}
              </div>
              <div className="qbw-selected-copy">
                <strong title={selectedMovie.title}>{selectedMovie.title}</strong>
                <span>
                  {selectedMovie.genre || "Phim chiếu rạp"}
                  {selectedMovie.age_limit ? ` · ${selectedMovie.age_limit}+` : ""}
                </span>
              </div>
              <span className="qbw-selected-check" aria-label="Đã chọn">✓</span>
            </div>
          );
        })()}
      </section>

      <section className={`qbw-step${!selectedMovieId ? " disabled" : ""}`}>
        <div className="qbw-step-head">
          <span className="qbw-step-num">2</span>
          <div>
            <strong>Chọn rạp và ngày</strong>
            <small>Lọc lịch chiếu phù hợp với bạn</small>
          </div>
        </div>

        <label className="qbw-field">
          <span className="qbw-field-label">Rạp chiếu</span>
          <span className="qbw-select-wrap">
            <span className="qbw-select-icon" aria-hidden="true">📍</span>
            <select
              value={selectedCinemaId}
              onChange={(event) => handleCinemaSelect(event.target.value)}
              disabled={!selectedMovieId || loadingShowtimes}
            >
              <option value="">Tất cả rạp có suất chiếu</option>
              {availableCinemas.map((cinema) => (
                <option key={cinema.cinemas_id} value={cinema.cinemas_id}>{cinema.cinema_name}</option>
              ))}
            </select>
          </span>
        </label>

        {!selectedMovieId ? (
          <div className="qbw-state muted">Chọn phim trước để mở lịch chiếu.</div>
        ) : loadingShowtimes ? (
          <div className="qbw-state loading"><span className="qbw-spinner" />Đang tải lịch chiếu…</div>
        ) : availableDates.length === 0 ? (
          <div className="qbw-state">Chưa có suất chiếu trong 7 ngày tới.</div>
        ) : (
          <div className="qbw-date-block">
            <span className="qbw-field-label">Ngày xem</span>
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
                  <span>{d.weekday}</span>
                  <strong>{d.dayMonth}</strong>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className={`qbw-step${!selectedDate ? " disabled" : ""}`}>
        <div className="qbw-step-head">
          <span className="qbw-step-num">3</span>
          <div>
            <strong>Chọn giờ chiếu</strong>
            <small>{selectedCinema?.cinema_name || "Hiển thị tất cả rạp phù hợp"}</small>
          </div>
        </div>

        {!selectedDate ? (
          <div className="qbw-state muted">Chọn ngày để xem các khung giờ.</div>
        ) : showtimesForDate.length === 0 ? (
          <div className="qbw-state">Không có suất chiếu cho ngày này.</div>
        ) : (
          <div className="qbw-times">
            {showtimesForDate.map((showtime) => {
              const start = new Date(showtime.start_time);
              const hour = String(start.getHours()).padStart(2, "0");
              const minute = String(start.getMinutes()).padStart(2, "0");
              const isSelected = selectedShowtime?.showtime_id === showtime.showtime_id;

              return (
                <button
                  key={showtime.showtime_id}
                  type="button"
                  className={`qbw-time-btn${isSelected ? " active" : ""}`}
                  onClick={() => setSelectedShowtime(showtime)}
                  aria-pressed={isSelected}
                >
                  <span className="qbw-time-main">
                    <strong>{hour}:{minute}</strong>
                    <small>{showtime.room_type || "2D"}</small>
                  </span>
                  <span className="qbw-time-place" title={showtime.cinema_name || "Rạp chiếu"}>
                    {showtime.cinema_name || "Rạp chiếu"}
                  </span>
                  <span className="qbw-time-room">{showtime.room_name || "Phòng chiếu"}</span>
                  {isSelected && <span className="qbw-time-check" aria-hidden="true">✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className={`qbw-checkout${canBook ? " ready" : ""}`}>
        {selectedShowtime && selectedMovie ? (() => {
        const d = new Date(selectedShowtime.start_time);
        const hh = String(d.getHours()).padStart(2, "0");
        const min = String(d.getMinutes()).padStart(2, "0");

        return (
          <div className="qbw-summary">
            <span className="qbw-summary-icon" aria-hidden="true">✓</span>
            <div className="qbw-summary-copy">
              <strong title={selectedMovie.title}>{selectedMovie.title}</strong>
              <span title={selectedShowtime.cinema_name || "Rạp chiếu"}>
                {`${hh}:${min} · ${selectedShowtime.room_type || "2D"} · ${selectedShowtime.cinema_name || "Rạp chiếu"}`}
              </span>
            </div>
          </div>
        );
        })() : (
          <div className="qbw-checkout-hint">
            <span aria-hidden="true">💡</span>
            <span>Chọn một suất chiếu để tiếp tục.</span>
          </div>
        )}

        <button
          type="button"
          className={`qbw-book-btn${canBook ? " ready" : ""}`}
          disabled={!canBook}
          onClick={handleBook}
        >
          <span>{canBook ? "Đặt vé ngay" : "Chưa thể đặt vé"}</span>
          <strong aria-hidden="true">→</strong>
        </button>
      </div>
    </div>
  );
}
