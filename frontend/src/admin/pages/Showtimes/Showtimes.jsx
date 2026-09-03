import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSelector } from "react-redux";
import { adminShowtimeService, adminMovieService, adminEmployeeService } from "../../services/adminApi";
import AdminPagination, { useAdminPagination } from "../../components/AdminPagination.jsx";
import AdminModalPortal from "../../components/AdminModalPortal.jsx";
import './showtimes.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_SHOW = {
  active: { label: "Đang hoạt động", cls: "confirmed" },
  ended:  { label: "Đã kết thúc",    cls: "cancelled" },
};

const ROOM_TYPE_COLOR = { IMAX: "#7c61ff", "3D": "#5bcad4", "2D": "#4ade80", VIP: "#fbbf24" };
const CLEANUP_BUFFER_MINUTES = 20;

const EMPTY_FORM = {
  movieId: "", roomId: "", cinemaId: "",
  startTime: "",
  priceStandard: "",
  priceVip: "",
  priceCouple: "",
  availableSeats: "",
  status: "active",
};

function fmtTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtHour(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function fmtRange(isoStart, isoEnd) {
  const start = fmtHour(isoStart);
  const end = fmtHour(isoEnd);
  if (start === "—" || end === "—") return "—";
  return `Từ ${start} - ${end}`;
}
function fmtDateHeading(dateKey) {
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateKey;
  const weekday = d.toLocaleDateString("vi-VN", { weekday: "long" });
  const date = d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${weekday}, ${date}`;
}
function fmtMoney(n) { return Number(n).toLocaleString("vi-VN") + " ₫"; }

function toDateTimeLocalValue(input) {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function normalizeDateInputValue(input) {
  if (!input) return "";
  if (typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) {
    return typeof input === "string" ? input.slice(0, 10) : "";
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function calcEndTime(startIso, durationMin) {
  if (!startIso || !durationMin) return "";
  const d = new Date(startIso);
  d.setMinutes(d.getMinutes() + Number(durationMin));
  return toDateTimeLocalValue(d);
}

function addMinutes(input, minutes) {
  if (!input && input !== 0) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  d.setMinutes(d.getMinutes() + Number(minutes || 0));
  return d;
}

function calcNextAllowedStartTime(endIso) {
  const nextStart = addMinutes(endIso, CLEANUP_BUFFER_MINUTES);
  return nextStart ? toDateTimeLocalValue(nextStart) : "";
}

function getConflicts(showtimes, rooms, movies, newSt, excludeId = null) {
  const room = rooms.find(r => r.id === Number(newSt.roomId));
  const movie = movies.find(m => m.id === Number(newSt.movieId));
  if (!room || !movie || !newSt.startTime) return [];
  const newStart = new Date(newSt.startTime);
  const newEnd   = new Date(calcEndTime(newSt.startTime, movie.duration));
  const newEndWithCleanup = addMinutes(newEnd, CLEANUP_BUFFER_MINUTES);
  return showtimes.filter(s => {
    if (s.id === excludeId || s.roomId !== room.id || s.status === "ended") return false;
    const sStart = new Date(s.startTime);
    const sEnd   = new Date(s.endTime);
    const sEndWithCleanup = addMinutes(sEnd, CLEANUP_BUFFER_MINUTES);
    return newStart < sEndWithCleanup && newEndWithCleanup > sStart;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 1. Quản lý Suất chiếu – bảng tổng hợp */
function ShowtimeManager({ showtimes, rooms, movies, cinemas, onEdit, onDelete, onDeleteMany, fixedCinemaId = null }) {
  const [search, setSearch]     = useState("");
  const [filterCinema, setFC]   = useState(fixedCinemaId === null ? "all" : String(fixedCinemaId));
  const [filterDate, setFD]     = useState("");
  const [filterStatus, setFS]   = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);

  const filtered = showtimes.filter(s => {
    const movie   = movies.find(m => m.id === s.movieId);
    const cinema  = cinemas.find(c => c.id === s.cinemaId);
    const q = search.toLowerCase();
    const matchQ  = (movie?.title || "").toLowerCase().includes(q) || (cinema?.name || "").toLowerCase().includes(q);
    const matchC  = filterCinema === "all" || String(s.cinemaId) === filterCinema;
    const matchD  = !filterDate || s.startTime.startsWith(filterDate);
    const matchS  = filterStatus === "all" || s.status === filterStatus;
    return matchQ && matchC && matchD && matchS;
  }).sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "active" ? -1 : 1;
    }
    return new Date(a.startTime) - new Date(b.startTime);
  });
  const { page, setPage, totalPages, pageItems } = useAdminPagination(filtered);
  const selectableShowtimes = filtered.filter((showtime) => showtime.status !== "ended");
  const selectableIdSet = new Set(selectableShowtimes.map((showtime) => showtime.id));
  const selectedShowtimes = filtered.filter((showtime) => selectableIdSet.has(showtime.id) && selectedIds.includes(showtime.id));
  const allFilteredSelected = selectableShowtimes.length > 0 && selectedShowtimes.length === selectableShowtimes.length;

  const resetSelectionAndPage = () => {
    setSelectedIds([]);
    setPage(1);
  };

  const toggleShowtime = (showtime) => {
    if (showtime.status === "ended") return;
    setSelectedIds((current) => current.includes(showtime.id)
      ? current.filter((id) => id !== showtime.id)
      : [...current, showtime.id]);
  };

  const toggleAllFiltered = () => {
    setSelectedIds(allFilteredSelected ? [] : selectableShowtimes.map((showtime) => showtime.id));
  };

  return (
    <div className="sh-section">
      <div className="sh-toolbar">
        <label className={`sh-select-all${selectableShowtimes.length === 0 ? " disabled" : ""}`}>
          <input
            type="checkbox"
            checked={allFilteredSelected}
            disabled={selectableShowtimes.length === 0}
            onChange={toggleAllFiltered}
          />
          <span>Chọn tất cả</span>
        </label>
        <input
          className="sh-search"
          placeholder="Tìm phim, rạp…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            resetSelectionAndPage();
          }}
        />
        {selectedShowtimes.length > 0 && (
          <button
            type="button"
            className="sh-btn sh-btn-delete sh-bulk-delete"
            onClick={() => onDeleteMany(selectedShowtimes)}
          >
            Xóa đã chọn ({selectedShowtimes.length})
          </button>
        )}
        <select className="sh-select" value={filterCinema} onChange={(event) => { setFC(event.target.value); resetSelectionAndPage(); }}>
          {fixedCinemaId === null && <option value="all">Tất cả rạp</option>}
          {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="sh-select" value={filterDate} onChange={(event) => { setFD(event.target.value); resetSelectionAndPage(); }} />
        <select className="sh-select" value={filterStatus} onChange={(event) => { setFS(event.target.value); resetSelectionAndPage(); }}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="ended">Đã kết thúc</option>
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th className="sh-select-column"><span className="sh-visually-hidden">Chọn</span></th>
              <th>Phim</th>
              <th>Rạp / Phòng</th>
              <th>Loại phòng</th>
              <th>Bắt đầu</th>
              <th>Kết thúc</th>
              <th>Bảng giá vé</th>
              <th>Ghế trống</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}>Không có suất chiếu nào.</td></tr>
            ) : pageItems.map(s => {
              const movie  = movies.find(m => m.id === s.movieId);
              const room   = rooms.find(r => r.id === s.roomId);
              const cinema = cinemas.find(c => c.id === s.cinemaId);
              const st     = STATUS_SHOW[s.status] || STATUS_SHOW.active;
              const rtColor = ROOM_TYPE_COLOR[room?.type] || "#8fa6ff";
              const isEnded = s.status === "ended";
              const isSelected = !isEnded && selectedIds.includes(s.id);
              return (
                <tr key={s.id} className={`${isSelected ? "sh-row-selected" : ""}${isEnded ? " sh-row-ended" : ""}`}>
                  <td className="sh-select-column">
                    <input
                      className="sh-row-checkbox"
                      type="checkbox"
                      checked={isSelected}
                      disabled={isEnded}
                      title={isEnded ? "Lịch đã kết thúc không thể chọn hoặc xóa" : "Chọn suất chiếu"}
                      aria-label={isEnded ? `Không thể chọn ${movie?.title || "suất chiếu đã kết thúc"}` : `Chọn ${movie?.title || "suất chiếu"}`}
                      onChange={() => toggleShowtime(s)}
                    />
                  </td>
                  <td><span style={{ color: "#eef4ff", fontWeight: 500 }}>{movie?.title || "—"}</span></td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "#c0d0ff", fontSize: 13 }}>{cinema?.name}</span>
                      <span style={{ color: "#7a8fc0", fontSize: 12 }}>{room?.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="sh-room-badge" style={{ color: rtColor, background: `${rtColor}18`, borderColor: `${rtColor}33` }}>
                      {room?.type}
                    </span>
                  </td>
                  <td><span style={{ color: "#c0d0ff", fontSize: 13 }}>{fmtTime(s.startTime)}</span></td>
                  <td><span style={{ color: "#7a8fc0", fontSize: 13 }}>{fmtTime(s.endTime)}</span></td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ color: "#a78bfa", fontWeight: 600 }}>Thường: {fmtMoney(s.priceStandard)}</span>
                      <span style={{ color: "#fbbf24", fontSize: 12 }}>VIP: {fmtMoney(s.priceVip)}</span>
                      <span style={{ color: "#fb7185", fontSize: 12 }}>Ghế đôi: {fmtMoney(s.priceCouple)}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: s.availableSeats === 0 ? "#f87171" : "#4ade80", fontWeight: 600 }}>
                      {s.availableSeats} / {room?.totalSeats}
                    </span>
                  </td>
                  <td><span className={`status-pill ${st.cls}`}>{st.label}</span></td>
                  <td>
                    <div className="sh-actions">
                      <button className="sh-btn sh-btn-edit" onClick={() => onEdit(s)}>Sửa</button>
                      <button
                        className="sh-btn sh-btn-delete"
                        disabled={isEnded}
                        title={isEnded ? "Lịch đã kết thúc không thể xóa" : "Xóa suất chiếu"}
                        onClick={() => onDelete(s)}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AdminPagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={10} onPageChange={setPage} />
      <div className="sh-footer-count">Hiển thị <strong>{filtered.length}</strong> / {showtimes.length} suất chiếu</div>
    </div>
  );
}

/** 2. Phân bổ phòng chiếu – timeline theo phòng */
function RoomAllocation({ showtimes, rooms, movies, cinemas, fixedCinemaId = null }) {
  const [selectedCinema, setSC] = useState(String(fixedCinemaId ?? (cinemas[0]?.id || "")));
  const [selectedDate, setSD]   = useState(() => new Date().toISOString().slice(0, 10));

  const cinemaRooms = rooms.filter(r => String(r.cinemaId) === selectedCinema);
  const dayShows    = showtimes.filter(s =>
    String(s.cinemaId) === selectedCinema &&
    s.startTime.startsWith(selectedDate)
  );

  const DISPLAY_START_HOUR = 8;
  const DISPLAY_END_HOUR = 23;
  const HOURS = Array.from({ length: DISPLAY_END_HOUR - DISPLAY_START_HOUR + 1 }, (_, i) => DISPLAY_START_HOUR + i);
  const totalMin = (DISPLAY_END_HOUR - DISPLAY_START_HOUR + 1) * 60;

  function minutesFromMidnight(iso) {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  }

  function pct(iso) {
    const minFromStart = Math.max(0, minutesFromMidnight(iso) - DISPLAY_START_HOUR * 60);
    return Math.max(0, Math.min(100, (minFromStart / totalMin) * 100));
  }
  function widthPct(startIso, endIso) {
    const start = new Date(startIso);
    const end   = new Date(endIso);
    let startMin = Math.max(0, minutesFromMidnight(start) - DISPLAY_START_HOUR * 60);
    let endMin = minutesFromMidnight(end) - DISPLAY_START_HOUR * 60;

    if (endMin <= startMin) {
      endMin += 24 * 60;
    }

    return Math.max(0, Math.min(100, ((endMin - startMin) / totalMin) * 100));
  }

  return (
    <div className="sh-section">
      <div className="sh-toolbar">
        <select className="sh-select" value={selectedCinema} onChange={e => setSC(e.target.value)} disabled={fixedCinemaId !== null}>
          {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="sh-select" value={selectedDate} onChange={e => setSD(e.target.value)} />
      </div>

      {/* Timeline header */}
      <div className="sh-timeline-wrap">
        <div className="sh-timeline-header">
          <div className="sh-room-label-col" />
          <div className="sh-timeline-hours">
            {HOURS.map(h => (
              <div key={h} className="sh-hour-mark">{String(h).padStart(2, "0")}:00</div>
            ))}
          </div>
        </div>

        {cinemaRooms.length === 0 ? (
          <div className="sh-empty">Không có phòng chiếu nào cho rạp này.</div>
        ) : cinemaRooms.map(room => {
          const roomShows = dayShows
            .filter(s => s.roomId === room.id)
            .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

          const laneEndTimes = [];
          const arrangedShows = roomShows.map(show => {
            const start = new Date(show.startTime).getTime();
            const end = new Date(show.endTime).getTime();
            let laneIndex = laneEndTimes.findIndex((laneEnd) => laneEnd <= start);

            if (laneIndex === -1) {
              laneIndex = laneEndTimes.length;
            }

            laneEndTimes[laneIndex] = end;
            return { ...show, laneIndex };
          });

          const maxLanes = Math.max(1, ...arrangedShows.map(show => show.laneIndex + 1));
          const rtColor   = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
          const laneSpacing = 56;

          return (
            <div key={room.id} className="sh-timeline-row">
              <div className="sh-room-label-col">
                <span className="sh-room-label-name">{room.name}</span>
                <span className="sh-room-label-type" style={{ color: rtColor }}>
                  {room.type} · {room.totalSeats} ghế
                </span>
              </div>
              <div className="sh-timeline-track" style={{ height: `${Math.max(74, 16 + maxLanes * laneSpacing)}px` }}>
                {HOURS.map(h => (
                  <div key={h} className="sh-track-grid-line" style={{ left: `${((h - DISPLAY_START_HOUR) / (DISPLAY_END_HOUR - DISPLAY_START_HOUR)) * 100}%` }} />
                ))}
                {arrangedShows.map(s => {
                  const movie = movies.find(m => m.id === s.movieId);
                  const left  = pct(s.startTime);
                  const width = widthPct(s.startTime, s.endTime);
                  const isFull = s.availableSeats === 0;
                  const isEnded = s.status === "ended";
                  const laneTop = 8 + (s.laneIndex * laneSpacing);
                  const blockHeight = 48;
                  const safeWidth = Math.min(100 - left, width);

                  return (
                    <div
                      key={s.id}
                      className="sh-block"
                      style={{
                        left: `${left}%`,
                        width: `${safeWidth}%`,
                        top: `${laneTop}px`,
                        height: `${blockHeight}px`,
                        background: isEnded
                          ? "rgba(148,163,184,0.16)"
                          : isFull
                            ? "rgba(248,113,113,0.25)"
                            : "rgba(124,97,255,0.28)",
                        borderColor: isEnded
                          ? "rgba(148,163,184,0.88)"
                          : isFull
                            ? "rgba(248,113,113,0.95)"
                            : "rgba(139,111,255,0.98)",
                        opacity: isEnded ? 0.78 : 1,
                      }}
                      title={`${movie?.title} | ${fmtTime(s.startTime)} – ${fmtTime(s.endTime)} | Thường ${fmtMoney(s.priceStandard)} | VIP ${fmtMoney(s.priceVip)} | Ghế đôi ${fmtMoney(s.priceCouple)}`}
                    >
                      <span className="sh-block-title">{movie?.title}</span>
                      <span className="sh-block-time">{fmtRange(s.startTime, s.endTime)}</span>
                    </div>
                  );
                })}
                {roomShows.length === 0 && (
                  <span className="sh-track-empty">Chưa có suất chiếu</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="sh-legend">
        <span className="sh-legend-item sh-legend-normal">Còn chỗ</span>
        <span className="sh-legend-item sh-legend-full">Hết chỗ</span>
      </div>
    </div>
  );
}

/** 3. Danh sách lịch chiếu – theo ngày dạng card */
function ShowtimeSchedule({ showtimes, rooms, movies, cinemas, fixedCinemaId = null }) {
  const [filterDate, setFD]       = useState("");
  const [filterMovie, setFM]      = useState("all");
  const [filterCinema, setFC]     = useState(fixedCinemaId === null ? "all" : String(fixedCinemaId));
  const dayCapacity = 12;

  const filteredShows = useMemo(() => showtimes
    .filter(showtime => (
      (!filterDate || showtime.startTime.startsWith(filterDate))
      && (filterMovie === "all" || String(showtime.movieId) === filterMovie)
      && (filterCinema === "all" || String(showtime.cinemaId) === filterCinema)
    ))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime)),
  [showtimes, filterDate, filterMovie, filterCinema]);

  const dayGroups = useMemo(() => {
    const dates = new Map();
    filteredShows.forEach(showtime => {
      const dateKey = showtime.startTime.slice(0, 10);
      if (!dates.has(dateKey)) dates.set(dateKey, new Map());
      const movieGroups = dates.get(dateKey);
      const movieKey = String(showtime.movieId);
      if (!movieGroups.has(movieKey)) movieGroups.set(movieKey, []);
      movieGroups.get(movieKey).push(showtime);
    });
    return [...dates.entries()].map(([dateKey, movieGroups]) => [dateKey, [...movieGroups.entries()]]);
  }, [filteredShows]);

  const schedulePages = useMemo(() => {
    const pages = [];
    let currentPage = [];
    let currentCount = 0;

    dayGroups.forEach(([dateKey, movieGroups]) => {
      const dayCount = movieGroups.reduce((count, [, shows]) => count + shows.length, 0);
      if (currentPage.length > 0 && currentCount + dayCount > dayCapacity) {
        pages.push(currentPage);
        currentPage = [];
        currentCount = 0;
      }
      currentPage.push([dateKey, movieGroups]);
      currentCount += dayCount;
      if (dayCount > dayCapacity) {
        pages.push(currentPage);
        currentPage = [];
        currentCount = 0;
      }
    });

    if (currentPage.length > 0) pages.push(currentPage);
    return pages;
  }, [dayGroups]);

  const { page, setPage, totalPages, pageItems } = useAdminPagination(schedulePages, 1);
  const scheduleGroups = pageItems[0] || [];

  const groupCounts = useMemo(() => {
    const dates = new Map();
    const moviesByDate = new Map();
    filteredShows.forEach(showtime => {
      const dateKey = showtime.startTime.slice(0, 10);
      const movieKey = `${dateKey}:${showtime.movieId}`;
      dates.set(dateKey, (dates.get(dateKey) || 0) + 1);
      moviesByDate.set(movieKey, (moviesByDate.get(movieKey) || 0) + 1);
    });
    return { dates, moviesByDate };
  }, [filteredShows]);

  const changeFilter = (setter, value) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="sh-section">
      <div className="sh-toolbar sh-schedule-toolbar">
        <input
          type="date"
          className="sh-select"
          value={filterDate}
          aria-label="Lọc lịch chiếu theo ngày"
          title="Để trống để xem tất cả ngày"
          onChange={event => changeFilter(setFD, event.target.value)}
        />
        {filterDate && (
          <button type="button" className="sh-btn sh-btn-secondary" onClick={() => changeFilter(setFD, "")}>
            Tất cả ngày
          </button>
        )}
        <select className="sh-select sh-schedule-movie-filter" value={filterMovie} onChange={event => changeFilter(setFM, event.target.value)}>
          <option value="all">Tất cả phim</option>
          {movies.map(movie => <option key={movie.id} value={movie.id}>{movie.title}</option>)}
        </select>
        <select className="sh-select" value={filterCinema} onChange={event => changeFilter(setFC, event.target.value)}>
          {fixedCinemaId === null && <option value="all">Tất cả rạp</option>}
          {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {scheduleGroups.length === 0 ? (
        <div className="sh-empty">Không có lịch chiếu phù hợp với bộ lọc.</div>
      ) : scheduleGroups.map(([dateKey, movieGroups]) => (
        <section key={dateKey} className="sh-schedule-day-block">
          <div className="sh-schedule-day-header">
            <div>
              <span className="sh-schedule-day-label">Ngày chiếu</span>
              <h3>{fmtDateHeading(dateKey)}</h3>
            </div>
            <span className="sh-schedule-day-count">{groupCounts.dates.get(dateKey) || 0} suất</span>
          </div>

          {movieGroups.map(([movieId, shows]) => {
            const movie = movies.find(item => item.id === Number(movieId));
            return (
              <div key={`${dateKey}-${movieId}`} className="sh-schedule-movie-block">
                <div className="sh-schedule-movie-header">
                  <span className="sh-schedule-movie-title">{movie?.title || "Phim không xác định"}</span>
                  <span className="sh-schedule-movie-duration">⏱ {movie?.duration || 0} phút</span>
                  <span className="sh-schedule-count">{groupCounts.moviesByDate.get(`${dateKey}:${movieId}`) || 0} suất</span>
                </div>
                <div className="sh-schedule-shows">
                  {shows.map(showtime => {
                    const room = rooms.find(item => item.id === showtime.roomId);
                    const cinema = cinemas.find(item => item.id === showtime.cinemaId);
                    const roomColor = ROOM_TYPE_COLOR[room?.type] || "#8fa6ff";
                    const isFull = showtime.availableSeats === 0;
                    const isEnded = showtime.status === "ended";
                    return (
                      <article key={showtime.id} className={`sh-schedule-card${isEnded ? " ended" : isFull ? " full" : ""}`}>
                        <div className="sh-schedule-card-head">
                          <strong className="sh-schedule-time">{fmtRange(showtime.startTime, showtime.endTime)}</strong>
                          <span className={`sh-schedule-state${isEnded ? " ended" : isFull ? " full" : " active"}`}>
                            {isEnded ? "Đã kết thúc" : isFull ? "Hết chỗ" : "Đang hoạt động"}
                          </span>
                        </div>
                        <div className="sh-schedule-room">
                          <span className="sh-schedule-cinema" title={cinema?.name}>{cinema?.name || "Rạp không xác định"}</span>
                          <div className="sh-schedule-room-row">
                            <span className="sh-room-badge sm" style={{ color: roomColor, background: `${roomColor}15`, borderColor: `${roomColor}33` }}>
                              {room?.name || "Chưa có phòng"} · {room?.type || "—"}
                            </span>
                            <span className={`sh-schedule-seats${isFull ? " full" : ""}`}>
                              {isFull ? "0 ghế trống" : `${showtime.availableSeats} ghế trống`}
                            </span>
                          </div>
                        </div>
                        <div className="sh-schedule-prices">
                          <span>Thường <strong>{fmtMoney(showtime.priceStandard)}</strong></span>
                          <span>VIP <strong>{fmtMoney(showtime.priceVip)}</strong></span>
                          <span>Đôi <strong>{fmtMoney(showtime.priceCouple)}</strong></span>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ))}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        totalItems={schedulePages.length}
        pageSize={1}
        summaryLabel={`Trang ngày ${page} / ${totalPages}`}
        onPageChange={setPage}
      />
      <div className="sh-footer-count">
        Tìm thấy <strong>{filteredShows.length}</strong> / {showtimes.length} lịch chiếu
      </div>
    </div>
  );
}

const RECURRING_TEMPLATE_PRESETS = {
  balanced: { label: "Cân bằng", slots: [{ hour: "09", minute: "00" }, { hour: "12", minute: "00" }, { hour: "15", minute: "00" }, { hour: "18", minute: "00" }, { hour: "21", minute: "00" }] },
  premium: { label: "Khung giờ cao điểm", slots: [{ hour: "10", minute: "30" }, { hour: "13", minute: "30" }, { hour: "16", minute: "30" }, { hour: "19", minute: "30" }, { hour: "22", minute: "30" }] },
  weekend: { label: "Cuối tuần tập trung", slots: [{ hour: "08", minute: "30" }, { hour: "11", minute: "00" }, { hour: "14", minute: "00" }, { hour: "17", minute: "30" }, { hour: "20", minute: "30" }] },
  compact: { label: "Mật độ cao", slots: [{ hour: "10", minute: "00" }, { hour: "13", minute: "30" }, { hour: "17", minute: "00" }, { hour: "20", minute: "30" }] },
};

/** 4a. Tạo lịch chiếu lặp lại theo khung giờ cố định */
function RecurringForm({ movies, cinemas, showtimes = [], onClose, onSave, fixedCinemaId = null }) {
  const modalBodyRef = useRef(null);
  const [selectedMovieIds, setSelectedMovieIds] = useState([]);
  const [selectedCinemaIds, setSelectedCinemaIds] = useState(() => fixedCinemaId === null ? [] : [Number(fixedCinemaId)]);
  const [openSelectionDropdown, setOpenSelectionDropdown] = useState(null);
  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      campaignType: "new_release",
      campaignReason: "",
      releaseDate: today,
      officialEndDate: today,
      earlyShowEnabled: false,
      earlyShowDays: 3,
      earlyShowDurationDays: 7,
      weekdayTemplate: "balanced",
      weekendTemplate: "weekend",
      priceStandard: "",
      priceVip: "",
      priceCouple: "",
      defaultPriority: 3,
      defaultSlotsPerDay: 2,
    };
  });

  // Scroll modal body to top khi mở
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, []);
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const setReleaseDate = (value) => {
    setForm((prev) => {
      let officialEndDate = prev.officialEndDate;
      if (value && (!officialEndDate || officialEndDate < value)) {
        const end = new Date(value);
        if (!Number.isNaN(end.getTime())) {
          end.setDate(end.getDate() + 6);
          officialEndDate = end.toISOString().slice(0, 10);
        }
      }
      return { ...prev, releaseDate: value, officialEndDate };
    });
    setErrors((prev) => ({ ...prev, releaseDate: undefined, officialEndDate: undefined }));
  };

  const toggleMovie = (movieId) => {
    setSelectedMovieIds((prev) => {
      const next = prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId];
      return next;
    });
    setErrors((prev) => ({ ...prev, movies: undefined }));
  };

  const toggleCinema = (cinemaId) => {
    if (fixedCinemaId !== null) return;
    setSelectedCinemaIds((prev) => {
      const next = prev.includes(cinemaId) ? prev.filter((id) => id !== cinemaId) : [...prev, cinemaId];
      return next;
    });
    setErrors((prev) => ({ ...prev, cinemas: undefined }));
  };

  const toggleSelectionDropdown = (name) => {
    setOpenSelectionDropdown((current) => (current === name ? null : name));
  };

  const updateMovieConfig = (movieId, field, value) => {
    setForm((prev) => ({
      ...prev,
      movieConfig: {
        ...(prev.movieConfig || {}),
        [movieId]: {
          ...((prev.movieConfig && prev.movieConfig[movieId]) || {}),
          [field]: value,
        },
      },
    }));
  };

  const weekdaySlots = RECURRING_TEMPLATE_PRESETS[form.weekdayTemplate]?.slots || RECURRING_TEMPLATE_PRESETS.balanced.slots;
  const weekendSlots = RECURRING_TEMPLATE_PRESETS[form.weekendTemplate]?.slots || RECURRING_TEMPLATE_PRESETS.weekend.slots;

  const days = useMemo(() => {
    if (!form.releaseDate || !form.officialEndDate) return 0;
    const start = new Date(form.releaseDate);
    const end = new Date(form.officialEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return Math.floor((end - start) / 86400000) + 1;
  }, [form.releaseDate, form.officialEndDate]);

  const totalEstimate = useMemo(() => {
    const dayCount = days;
    if (!dayCount || selectedMovieIds.length === 0) return 0;
    return selectedMovieIds.reduce((sum, movieId) => {
      const config = (form.movieConfig && form.movieConfig[movieId]) || {};
      const priority = Number(config.priority || form.defaultPriority || 1);
      const slotsPerDay = Number(config.slotsPerDay || form.defaultSlotsPerDay || 1);
      const effectiveSlots = Math.max(1, slotsPerDay + Math.max(0, priority - 2));
      const weekdayCount = weekdaySlots.length;
      const weekendCount = weekendSlots.length;
      const estimated = dayCount * ((effectiveSlots > weekdayCount ? weekdayCount : effectiveSlots) + (effectiveSlots > weekendCount ? weekendCount : effectiveSlots)) / 2;
      return sum + Math.ceil(estimated);
    }, 0) * selectedCinemaIds.length;
  }, [days, selectedMovieIds, selectedCinemaIds, form, weekdaySlots, weekendSlots]);

  const existingShowtimeCountByMovie = useMemo(() => {
    const counts = new Map();
    showtimes.forEach((showtime) => {
      if (showtime.status !== "active") return;
      const movieId = Number(showtime.movieId);
      counts.set(movieId, (counts.get(movieId) || 0) + 1);
    });
    return counts;
  }, [showtimes]);

  const validate = () => {
    const e = {};
    if (!selectedMovieIds.length) e.movies = "Chọn ít nhất 1 phim.";
    if (!selectedCinemaIds.length) e.cinemas = "Chọn ít nhất 1 rạp.";
    if (!form.releaseDate) e.releaseDate = "Chọn ngày phát hành.";
    if (!form.officialEndDate) e.officialEndDate = "Chọn ngày kết thúc dự kiến.";
    if (form.releaseDate && form.officialEndDate && form.officialEndDate < form.releaseDate) e.officialEndDate = "Ngày kết thúc phải sau ngày phát hành.";
    if (!form.priceStandard || Number(form.priceStandard) <= 0) e.priceStandard = "Nhập giá vé thường hợp lệ.";
    if (!form.priceVip || Number(form.priceVip) <= 0) e.priceVip = "Nhập giá vé VIP hợp lệ.";
    if (!form.priceCouple || Number(form.priceCouple) <= 0) e.priceCouple = "Nhập giá ghế đôi hợp lệ.";
    if (form.earlyShowEnabled && Number(form.earlyShowDays || 0) < 0) e.earlyShowDays = "Sớm bao nhiêu ngày phải >= 0.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      if (e.movies) setOpenSelectionDropdown("movies");
      else if (e.cinemas) setOpenSelectionDropdown("cinemas");
      return;
    }

    const moviesPayload = selectedMovieIds.map((movieId) => {
      const config = (form.movieConfig && form.movieConfig[movieId]) || {};
      return {
        movie_id: Number(movieId),
        priority: Math.min(5, Math.max(1, Number(config.priority || form.defaultPriority || 1))),
        slots_per_day: Math.min(8, Math.max(1, Number(config.slotsPerDay || form.defaultSlotsPerDay || 1))),
        early_bias: Math.min(120, Math.max(0, Number(config.earlyBias || 0))),
      };
    });

    onSave({
      campaign_type: form.campaignType,
      campaign_reason: form.campaignReason,
      release_date: form.releaseDate,
      official_end_date: form.officialEndDate,
      early_show_enabled: Boolean(form.earlyShowEnabled),
      early_show_days: Number(form.earlyShowDays || 0),
      early_show_duration_days: Number(form.earlyShowDurationDays || 0),
      official_time_slots: weekdaySlots,
      early_time_slots: weekendSlots,
      movies: moviesPayload,
      cinemas: selectedCinemaIds.map(Number),
      start_date: form.releaseDate,
      end_date: form.officialEndDate,
      weekday_slots: weekdaySlots,
      weekend_slots: weekendSlots,
      weekday_template: form.weekdayTemplate,
      weekend_template: form.weekendTemplate,
      weeks: 1,
      priceStandard: Number(form.priceStandard),
      priceVip: Number(form.priceVip),
      priceCouple: Number(form.priceCouple),
      default_priority: Number(form.defaultPriority || 1),
      default_slots_per_day: Number(form.defaultSlotsPerDay || 1),
    });
  };

  return (
    <AdminModalPortal>
    <div className="sh-modal-overlay" onClick={onClose}>
      <div className="sh-modal sh-modal-recurring" onClick={(event) => event.stopPropagation()}>
        <div className="sh-modal-header">
          <h2>🔁 Tạo lịch chiếu theo nhóm</h2>
          <button className="sh-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sh-modal-body sh-recurring-body" ref={modalBodyRef}>
          <p className="sh-recurring-desc">
            Chọn nhiều phim và nhiều rạp cùng lúc. Mỗi phòng có thể tự động nhận nhiều suất ở các khung giờ khác nhau, theo thời lượng phim, khoảng nghỉ 15 phút và ưu tiên của từng phim.
          </p>

          <div className="sh-recurring-flow" aria-label="Cách vận hành lịch chiếu theo nhóm">
            <div className="sh-flow-intro">
              <h3>Vận hành tạo lịch chiếu</h3>
              <p>Hệ thống sẽ tạo <strong>Lịch chiếu chính thức</strong> hoặc <strong>Lịch chiếu sớm</strong> dựa trên ngày phát hành, ưu tiên phim và khung giờ phù hợp.</p>
            </div>

            <div className="sh-flow-cards">
              <div className="sh-flow-card sh-flow-card-active">
                <span className="sh-flow-step">01</span>
                <strong>Lịch chiếu chính thức</strong>
                <small>Bắt đầu từ ngày phát hành, áp dụng khung giờ thường/cuối tuần.</small>
              </div>

              <div className="sh-flow-card">
                <span className="sh-flow-step">02</span>
                <strong>Suất chiếu sớm</strong>
                <small>Chiếu trước X ngày để mở bán sớm cho phim hot hoặc ưu tiên đặc biệt.</small>
              </div>
            </div>

            <div className="sh-priority-clarify">
              <span className="sh-priority-badge">Ưu tiên phân bổ</span>
              <p>Ưu tiên ở đây là thứ tự hệ thống dùng để xếp phim vào phòng và suất chiếu: phim hot trước, suất nhiều hơn, thời điểm bắt đầu sớm hơn.</p>
            </div>
          </div>

          <div className="sh-recurring-form-grid">
            <div className="sh-form-col">
              <div className="sh-schedule-card-block">
                <div className="sh-card-header">Thông tin đợt chiếu</div>

                <div className="sh-field">
                  <label>Danh sách phim *</label>
                  <div className={`sh-selection-dropdown${openSelectionDropdown === "movies" ? " open" : ""}`}>
                    <button
                      type="button"
                      className="sh-selection-dropdown-toggle"
                      aria-expanded={openSelectionDropdown === "movies"}
                      aria-controls="recurring-movie-list"
                      onClick={() => toggleSelectionDropdown("movies")}
                    >
                      <span className="sh-selection-dropdown-copy">
                        <strong>Chọn phim</strong>
                        <small>
                          {selectedMovieIds.length > 0
                            ? `Đã chọn ${selectedMovieIds.length} phim`
                            : "Bấm để mở danh sách phim"}
                        </small>
                      </span>
                      <span className="sh-selection-dropdown-caret" aria-hidden="true">
                        {openSelectionDropdown === "movies" ? "▲" : "▼"}
                      </span>
                    </button>
                    {openSelectionDropdown === "movies" && (
                      <div id="recurring-movie-list" className="sh-selection-dropdown-body">
                        <div className="sh-checkbox-list">
                          {movies.length > 0 ? movies.map((movie) => (
                            <label key={movie.id} className="sh-checkbox-item">
                              <input
                                type="checkbox"
                                checked={selectedMovieIds.includes(movie.id)}
                                onChange={() => toggleMovie(movie.id)}
                              />
                              <span className="sh-movie-choice-title">{movie.title} · {movie.duration} phút</span>
                              <span
                                className="sh-movie-existing-count"
                                title="Số suất chiếu đang hoạt động, chưa kết thúc"
                              >
                                {existingShowtimeCountByMovie.get(Number(movie.id)) || 0} suất
                              </span>
                            </label>
                          )) : (
                            <div className="sh-selection-dropdown-empty">Chưa có phim để lựa chọn.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.movies && <span className="sh-error">{errors.movies}</span>}
                </div>

                <div className="sh-field">
                  <label>Rạp chiếu *</label>
                  <div className={`sh-selection-dropdown${openSelectionDropdown === "cinemas" ? " open" : ""}`}>
                    <button
                      type="button"
                      className="sh-selection-dropdown-toggle"
                      aria-expanded={openSelectionDropdown === "cinemas"}
                      aria-controls="recurring-cinema-list"
                      onClick={() => toggleSelectionDropdown("cinemas")}
                    >
                      <span className="sh-selection-dropdown-copy">
                        <strong>Chọn rạp chiếu</strong>
                        <small>
                          {selectedCinemaIds.length > 0
                            ? `Đã chọn ${selectedCinemaIds.length} rạp`
                            : "Bấm để mở danh sách rạp"}
                        </small>
                      </span>
                      <span className="sh-selection-dropdown-caret" aria-hidden="true">
                        {openSelectionDropdown === "cinemas" ? "▲" : "▼"}
                      </span>
                    </button>
                    {openSelectionDropdown === "cinemas" && (
                      <div id="recurring-cinema-list" className="sh-selection-dropdown-body">
                        <div className="sh-checkbox-list">
                          {cinemas.length > 0 ? cinemas.map((cinema) => (
                            <label key={cinema.id} className="sh-checkbox-item">
                              <input
                                type="checkbox"
                                checked={selectedCinemaIds.includes(cinema.id)}
                                onChange={() => toggleCinema(cinema.id)}
                                disabled={fixedCinemaId !== null}
                              />
                              <span>{cinema.name}</span>
                            </label>
                          )) : (
                            <div className="sh-selection-dropdown-empty">Chưa có rạp để lựa chọn.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors.cinemas && <span className="sh-error">{errors.cinemas}</span>}
                </div>

                <div className="sh-field-row">
                  <div className="sh-field">
                    <label>Ngày phát hành *</label>
                    <input type="date" value={form.releaseDate} onChange={(event) => setReleaseDate(event.target.value)} />
                    {errors.releaseDate && <span className="sh-error">{errors.releaseDate}</span>}
                  </div>
                  <div className="sh-field">
                    <label>Kết thúc dự kiến *</label>
                    <input type="date" value={form.officialEndDate} onChange={(event) => set("officialEndDate", event.target.value)} min={form.releaseDate} />
                    {errors.officialEndDate && <span className="sh-error">{errors.officialEndDate}</span>}
                  </div>
                </div>

                <div className="sh-field-row">
                  <div className="sh-field">
                    <label>Loại đợt chiếu</label>
                    <select value={form.campaignType} onChange={(event) => set("campaignType", event.target.value)}>
                      <option value="new_release">Phát hành mới</option>
                      <option value="rerun">Chiếu lại</option>
                      <option value="special_event">Sự kiện đặc biệt</option>
                    </select>
                  </div>
                  <div className="sh-field sh-priority-slider-field">
                    <div className="sh-priority-slider-label">
                      <label htmlFor="default-priority">Ưu tiên mặc định</label>
                      <span>Mức {form.defaultPriority}/5</span>
                    </div>
                    <div className={`sh-priority-slider sh-priority-level-${form.defaultPriority}`}>
                      <input
                        id="default-priority"
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={form.defaultPriority}
                        aria-label={`Mức ưu tiên mặc định ${form.defaultPriority} trên 5`}
                        onChange={(event) => set("defaultPriority", Number(event.target.value))}
                      />
                      <div className="sh-priority-scale" aria-hidden="true">
                        <span>Thấp</span>
                        <span>Trung bình</span>
                        <span>Rất cao</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sh-field">
                  <label>Lý do / ghi chú</label>
                  <textarea
                    className="sh-recurring-textarea"
                    rows={3}
                    value={form.campaignReason}
                    onChange={(event) => set("campaignReason", event.target.value)}
                    placeholder="Ví dụ: Khuyến khích mở bán sớm cho phim mới, chiếu lại dịp cuối tuần, sự kiện đặc biệt..."
                  />
                </div>
              </div>
            </div>

            <div className="sh-form-col">
              <div className="sh-schedule-card-block">
                <div className="sh-card-header">Lịch chiếu chính thức</div>

                <div className="sh-field-row">
                  <div className="sh-field">
                    <label>Khung giờ chiếu chính thức</label>
                    <select value={form.weekdayTemplate} onChange={(event) => set("weekdayTemplate", event.target.value)}>
                      {Object.entries(RECURRING_TEMPLATE_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>{preset.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sh-field">
                    <label>Khung giờ cuối tuần</label>
                    <select value={form.weekendTemplate} onChange={(event) => set("weekendTemplate", event.target.value)}>
                      {Object.entries(RECURRING_TEMPLATE_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>{preset.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sh-field">
                  <label>Suất chiếu / ngày mặc định</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={form.defaultSlotsPerDay}
                    onChange={(event) => set("defaultSlotsPerDay", event.target.value)}
                    onBlur={() => set("defaultSlotsPerDay", Math.min(8, Math.max(1, Number(form.defaultSlotsPerDay) || 1)))}
                  />
                </div>

                <div className="sh-field">
                  <label>Giá vé thường (₫) *</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    className={errors.priceStandard ? "error" : ""}
                    value={form.priceStandard}
                    onChange={(event) => set("priceStandard", event.target.value)}
                    placeholder="120000"
                  />
                  {errors.priceStandard && <span className="sh-error">{errors.priceStandard}</span>}
                </div>

                <div className="sh-field-row">
                  <div className="sh-field">
                    <label>Giá vé VIP (₫) *</label>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      className={errors.priceVip ? "error" : ""}
                      value={form.priceVip}
                      onChange={(event) => set("priceVip", event.target.value)}
                      placeholder="150000"
                    />
                    {errors.priceVip && <span className="sh-error">{errors.priceVip}</span>}
                  </div>
                  <div className="sh-field">
                    <label>Giá ghế đôi (₫) *</label>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      className={errors.priceCouple ? "error" : ""}
                      value={form.priceCouple}
                      onChange={(event) => set("priceCouple", event.target.value)}
                      placeholder="220000"
                    />
                    {errors.priceCouple && <span className="sh-error">{errors.priceCouple}</span>}
                  </div>
                </div>

                <span className="sh-hint">Mức giá này áp dụng cho tất cả suất chiếu được tạo trong đợt.</span>
              </div>

              <div className="sh-schedule-card-block sh-early-block">
                <div className="sh-card-header">Suất chiếu sớm</div>

                <div className="sh-field sh-early-toggle-field">
                  <label className="sh-early-toggle">
                    <input type="checkbox" checked={form.earlyShowEnabled} onChange={(event) => set("earlyShowEnabled", event.target.checked)} />
                    <span>
                      <strong>Có suất chiếu sớm</strong>
                      <small>Tạo thêm lịch trước ngày phát hành chính thức</small>
                    </span>
                  </label>
                </div>

                {form.earlyShowEnabled && (
                  <div className="sh-field-row">
                    <div className="sh-field">
                      <label>Bắt đầu sớm bao nhiêu ngày</label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        value={form.earlyShowDays}
                        onChange={(event) => set("earlyShowDays", event.target.value)}
                        onBlur={() => set("earlyShowDays", Math.min(30, Math.max(0, Number(form.earlyShowDays) || 0)))}
                      />
                      {errors.earlyShowDays && <span className="sh-error">{errors.earlyShowDays}</span>}
                    </div>
                    <div className="sh-field">
                      <label>Số ngày chiếu sớm</label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={form.earlyShowDurationDays}
                        onChange={(event) => set("earlyShowDurationDays", event.target.value)}
                        onBlur={() => set("earlyShowDurationDays", Math.min(30, Math.max(1, Number(form.earlyShowDurationDays) || 1)))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {selectedMovieIds.length > 0 && (
                <div className="sh-schedule-card-block sh-priority-block">
                  <div className="sh-card-header">Ưu tiên xếp lịch theo phim</div>
                  <div className="sh-priority-table">
                    <div className="sh-priority-header">
                      <span>Phim</span>
                      <span>Ưu tiên</span>
                      <span>Suất/ngày</span>
                      <span>Early show</span>
                    </div>
                    {selectedMovieIds.map((movieId) => {
                      const movie = movies.find((item) => item.id === Number(movieId));
                      const config = (form.movieConfig && form.movieConfig[movieId]) || {};
                      return (
                        <div key={movieId} className="sh-priority-row">
                          <span className="sh-priority-name">{movie?.title || `Phim ${movieId}`}</span>
                          <input
                            type="number"
                            min={1}
                            max={5}
                            title="Mức ưu tiên xếp lịch: phim hot sẽ được ưu tiên phòng, suất và khung giờ tốt hơn"
                            value={config.priority ?? form.defaultPriority}
                            onChange={(event) => updateMovieConfig(movieId, "priority", event.target.value)}
                            onBlur={() => updateMovieConfig(movieId, "priority", Math.min(5, Math.max(1, Number(config.priority) || Number(form.defaultPriority) || 1)))}
                          />
                          <input
                            type="number"
                            min={1}
                            max={8}
                            title="Số suất chiếu mỗi ngày để phân bổ lịch cho phim này"
                            value={config.slotsPerDay ?? form.defaultSlotsPerDay}
                            onChange={(event) => updateMovieConfig(movieId, "slotsPerDay", event.target.value)}
                            onBlur={() => updateMovieConfig(movieId, "slotsPerDay", Math.min(8, Math.max(1, Number(config.slotsPerDay) || Number(form.defaultSlotsPerDay) || 1)))}
                          />
                          <input
                            type="number"
                            min={0}
                            max={120}
                            title="Đẩy khung giờ chiếu sớm theo phút để phim bắt đầu sớm hơn khi có suất chiếu sớm"
                            value={config.earlyBias ?? 0}
                            onChange={(event) => updateMovieConfig(movieId, "earlyBias", event.target.value)}
                            onBlur={() => updateMovieConfig(movieId, "earlyBias", Math.min(120, Math.max(0, Number(config.earlyBias) || 0)))}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {days > 0 && (
                <div className="sh-recurring-days-badge">
                  📅 {days} ngày • {selectedMovieIds.length} phim • {selectedCinemaIds.length} rạp
                  <strong style={{ color: "#4ade80" }}> • ~{totalEstimate} suất ước tính</strong>
                </div>
              )}

              <div className="sh-preview-card">
                <div className="sh-preview-row"><span>Khung ngày thường</span><strong>{weekdaySlots.map((slot) => `${slot.hour}:${slot.minute}`).join(" • ")}</strong></div>
                <div className="sh-preview-row"><span>Khung cuối tuần</span><strong>{weekendSlots.map((slot) => `${slot.hour}:${slot.minute}`).join(" • ")}</strong></div>
                <div className="sh-preview-row"><span>Giá ghế</span><strong>Thường {fmtMoney(form.priceStandard)} • VIP {fmtMoney(form.priceVip)} • Đôi {fmtMoney(form.priceCouple)}</strong></div>
                <div className="sh-preview-row"><span>Phân bổ</span><strong>Ưu tiên cao ⇒ nhiều suất/ngày</strong></div>
              </div>
            </div>
          </div>
        </div>
        <div className="sh-modal-footer sh-recurring-footer">
          <button className="sh-btn sh-btn-add sh-btn-lg" onClick={handleSave}>🔁 Tạo lịch hàng loạt</button>
          <button className="sh-btn sh-btn-secondary sh-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

/** 4. Tạo / Sửa lịch chiếu */
function ShowtimeForm({ showtime, showtimes, rooms, movies, cinemas, onClose, onSave, fixedCinemaId = null }) {
  const isEdit = !!showtime;
  const modalBodyRef = useRef(null);
  const [form, setForm] = useState(showtime
    ? {
        movieId: showtime.movieId,
        cinemaId: showtime.cinemaId,
        roomId: showtime.roomId,
        startTime: toDateTimeLocalValue(showtime.startTime),
        priceStandard: showtime.priceStandard,
        priceVip: showtime.priceVip,
        priceCouple: showtime.priceCouple,
        availableSeats: showtime.availableSeats,
        status: "active",
      }
    : { ...EMPTY_FORM, cinemaId: fixedCinemaId === null ? "" : String(fixedCinemaId) }
  );
  const [errors, setErrors] = useState({});

  // Scroll modal body to top khi mở
  useEffect(() => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  }, []);

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: undefined })); };

  const cinemaRooms = rooms.filter(r => String(r.cinemaId) === String(form.cinemaId));
  const selMovie    = movies.find(m => m.id === Number(form.movieId));
  const endTime     = calcEndTime(form.startTime, selMovie?.duration);
  const nextAllowedStartTime = calcNextAllowedStartTime(endTime);
  const conflicts   = form.roomId && form.startTime && form.movieId
    ? getConflicts(showtimes, rooms, movies, form, showtime?.id)
    : [];

  const validate = () => {
    const e = {};
    if (!form.movieId)     e.movieId    = "Chọn phim.";
    if (!form.cinemaId)    e.cinemaId   = "Chọn rạp.";
    if (!form.roomId)      e.roomId     = "Chọn phòng chiếu.";
    if (!form.startTime)   e.startTime  = "Chọn giờ bắt đầu.";
    if (!form.priceStandard || Number(form.priceStandard) <= 0) e.priceStandard = "Nhập giá vé thường hợp lệ.";
    if (!form.priceVip || Number(form.priceVip) <= 0) e.priceVip = "Nhập giá vé VIP hợp lệ.";
    if (!form.priceCouple || Number(form.priceCouple) <= 0) e.priceCouple = "Nhập giá ghế đôi hợp lệ.";
    if (conflicts.length)  e.startTime  = `Phòng phải nghỉ ${CLEANUP_BUFFER_MINUTES} phút giữa 2 suất chiếu.`;
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const room = rooms.find(r => r.id === Number(form.roomId));
    onSave({
      ...(showtime || {}),
      id: showtime?.id,
      movieId: Number(form.movieId),
      cinemaId: Number(form.cinemaId),
      roomId: Number(form.roomId),
      startTime: form.startTime,
      endTime,
      priceStandard: Number(form.priceStandard),
      priceVip: Number(form.priceVip),
      priceCouple: Number(form.priceCouple),
      availableSeats: Number(form.availableSeats) || room?.totalSeats || 0,
      status: "active",
    });
  };

  return (
    <AdminModalPortal>
    <div className="sh-modal-overlay" onClick={onClose}>
      <div className="sh-modal" onClick={e => e.stopPropagation()}>
        <div className="sh-modal-header">
          <h2>{isEdit ? "Chỉnh sửa suất chiếu" : "Tạo suất chiếu mới"}</h2>
          <button className="sh-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sh-modal-body" ref={modalBodyRef}>
          <div className="sh-form-grid">
            {/* Col 1 */}
            <div className="sh-form-col">
              <div className="sh-field">
                <label>Phim *</label>
                <select className={errors.movieId ? "error" : ""} value={form.movieId} onChange={e => set("movieId", e.target.value)}>
                  <option value="">-- Chọn phim --</option>
                  {movies.map(m => <option key={m.id} value={m.id}>{m.title} ({m.duration} phút)</option>)}
                </select>
                {errors.movieId && <span className="sh-error">{errors.movieId}</span>}
              </div>

              <div className="sh-field">
                <label>Rạp chiếu *</label>
                <select className={errors.cinemaId ? "error" : ""} value={form.cinemaId} onChange={e => { set("cinemaId", e.target.value); set("roomId", ""); }} disabled={fixedCinemaId !== null}>
                  <option value="">-- Chọn rạp --</option>
                  {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.cinemaId && <span className="sh-error">{errors.cinemaId}</span>}
              </div>

              <div className="sh-field">
                <label>Phòng chiếu *</label>
                <select className={errors.roomId ? "error" : ""} value={form.roomId} onChange={e => set("roomId", e.target.value)} disabled={!form.cinemaId}>
                  <option value="">-- Chọn phòng --</option>
                  {cinemaRooms.map(r => <option key={r.id} value={r.id}>{r.name} · {r.totalSeats} ghế</option>)}
                </select>
                {errors.roomId && <span className="sh-error">{errors.roomId}</span>}
              </div>

              <div className="sh-field">
                <label>Trạng thái</label>
                <input value={endTime ? "Tự động: đang hoạt động, hết giờ sẽ chuyển sang đã kết thúc" : "Tự động theo thời gian chiếu"} readOnly style={{ opacity: 0.7, cursor: "not-allowed" }} />
              </div>
            </div>

            {/* Col 2 */}
            <div className="sh-form-col">
              <div className="sh-field">
                <label>Giờ bắt đầu *</label>
                <input type="datetime-local" className={errors.startTime ? "error" : ""} value={form.startTime} onChange={e => set("startTime", e.target.value)} />
                {errors.startTime && <span className="sh-error">{errors.startTime}</span>}
              </div>

              {endTime && (
                <div className="sh-field">
                  <label>Giờ kết thúc (tự tính)</label>
                  <input type="datetime-local" value={endTime} readOnly style={{ opacity: 0.6, cursor: "not-allowed" }} />
                </div>
              )}

              {nextAllowedStartTime && (
                <div className="sh-field">
                  <label>Giờ sớm nhất cho suất kế tiếp</label>
                  <input type="datetime-local" value={nextAllowedStartTime} readOnly style={{ opacity: 0.6, cursor: "not-allowed" }} />
                </div>
              )}

              <div className="sh-field">
                <label>Giá vé thường (₫) *</label>
                <input type="number" min={0} className={errors.priceStandard ? "error" : ""} value={form.priceStandard} onChange={e => set("priceStandard", e.target.value)} placeholder="120000" />
                {errors.priceStandard && <span className="sh-error">{errors.priceStandard}</span>}
              </div>

              <div className="sh-field-row">
                <div className="sh-field">
                  <label>Giá vé VIP (₫) *</label>
                  <input type="number" min={0} className={errors.priceVip ? "error" : ""} value={form.priceVip} onChange={e => set("priceVip", e.target.value)} placeholder="150000" />
                  {errors.priceVip && <span className="sh-error">{errors.priceVip}</span>}
                </div>
                <div className="sh-field">
                  <label>Giá ghế đôi (₫) *</label>
                  <input type="number" min={0} className={errors.priceCouple ? "error" : ""} value={form.priceCouple} onChange={e => set("priceCouple", e.target.value)} placeholder="220000" />
                  {errors.priceCouple && <span className="sh-error">{errors.priceCouple}</span>}
                </div>
              </div>

              <div className="sh-field">
                <label>Ghế trống</label>
                <input type="number" min={0} value={form.availableSeats} onChange={e => set("availableSeats", e.target.value)} placeholder="Tự động từ phòng" />
              </div>

              {/* Conflict warning */}
              {conflicts.length > 0 && (
                <div className="sh-conflict-warn">
                  ⚠️ Phòng đã có <strong>{conflicts.length}</strong> suất chưa đủ khoảng nghỉ {CLEANUP_BUFFER_MINUTES} phút:
                  {conflicts.map(c => {
                    const m = movies.find(x => x.id === c.movieId);
                    return <div key={c.id} className="sh-conflict-item">• {m?.title} | {fmtTime(c.startTime)} – {fmtTime(c.endTime)} | Suất sau chỉ được bắt đầu từ {fmtTime(calcNextAllowedStartTime(c.endTime))}</div>;
                  })}
                </div>
              )}

              {/* Preview */}
              {selMovie && form.startTime && (
                <div className="sh-preview-card">
                  <div className="sh-preview-row"><span>Phim</span><strong>{selMovie.title}</strong></div>
                  <div className="sh-preview-row"><span>Thời lượng</span><strong>{selMovie.duration} phút</strong></div>
                  {endTime && <div className="sh-preview-row"><span>Kết thúc</span><strong>{fmtTime(endTime)}</strong></div>}
                  {nextAllowedStartTime && <div className="sh-preview-row"><span>Suất kế tiếp sớm nhất</span><strong>{fmtTime(nextAllowedStartTime)}</strong></div>}
                  {form.priceStandard && <div className="sh-preview-row"><span>Vé thường</span><strong style={{ color: "#a78bfa" }}>{fmtMoney(form.priceStandard)}</strong></div>}
                  {form.priceVip && <div className="sh-preview-row"><span>Vé VIP</span><strong style={{ color: "#fbbf24" }}>{fmtMoney(form.priceVip)}</strong></div>}
                  {form.priceCouple && <div className="sh-preview-row"><span>Ghế đôi</span><strong style={{ color: "#fb7185" }}>{fmtMoney(form.priceCouple)}</strong></div>}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="sh-modal-footer">
          <button className="sh-btn sh-btn-add sh-btn-lg" onClick={handleSave} disabled={conflicts.length > 0}>
            {isEdit ? "Lưu thay đổi" : "Tạo suất chiếu"}
          </button>
          <button className="sh-btn sh-btn-secondary sh-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

/** Confirm modal */
function Confirm({ title, message, onClose, onConfirm, danger }) {
  return (
    <AdminModalPortal>
    <div className="sh-modal-overlay" onClick={onClose}>
      <div className="sh-modal sh-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="sh-modal-header"><h2>{title}</h2><button className="sh-modal-close" onClick={onClose}>✕</button></div>
        <div className="sh-modal-body">
          <div className={`sh-confirm-msg${danger ? " danger" : ""}`}>{message}</div>
        </div>
        <div className="sh-modal-footer">
          <button className={`sh-btn ${danger ? "sh-btn-delete" : "sh-btn-cancel"} sh-btn-lg`} onClick={onConfirm}>Xác nhận</button>
          <button className="sh-btn sh-btn-secondary sh-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

/** Toast */
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="sh-toast">
      {message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminShowtimes() {
  const reduxProfile = useSelector((state) => state.user.profile);
  const profile = { ...(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })(), ...(reduxProfile || {}) };
  const role = String(profile.role || "").toLowerCase();
  const isManager = role === "manager" || (role === "employee" && /quản lý|quan ly|manager/i.test(String(profile.employee_position || profile.position || "")));
  const currentUserId = profile.id || profile.userId;
  // ── State ──
  const [showtimes,  setShowtimes]  = useState([]);
  const [movies,     setMovies]     = useState([]);
  const [cinemas,    setCinemas]    = useState([]);
  const [rooms,      setRooms]      = useState([]);
  const [managerCinemaId, setManagerCinemaId] = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  const [activeTab,       setActiveTab]       = useState("manager");
  const [editSt,          setEditSt]          = useState(undefined);
  const [showRecurring,   setShowRecurring]   = useState(false);
  const [confirmTarget,   setConfirmTarget]   = useState(null);
  const [toast,           setToast]           = useState("");

  const modalsContainerRef = useRef(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  // Auto-scroll khi mở form
  useEffect(() => {
    if ((editSt !== undefined || showRecurring) && modalsContainerRef.current) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [editSt, showRecurring]);

  // ── Fetch dữ liệu từ API ──
  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [stRes, cinRes, roomRes, mvRes] = await Promise.all([
        adminShowtimeService.getAll(),
        adminShowtimeService.getCinemas(),
        adminShowtimeService.getRooms(),
        adminMovieService.getAllMovies(false),
      ]);
      const employeeRes = isManager ? await adminEmployeeService.getAll() : null;
      const managerCinemaId = isManager
        ? (employeeRes?.employees || []).find((employee) => Number(employee.userId) === Number(currentUserId))?.cinemaId
        : null;
      setManagerCinemaId(isManager ? managerCinemaId ?? null : null);

      // Chuẩn hoá dữ liệu từ DB sang format component cần
      const normalizedSt = (stRes.showtimes || []).map(s => ({
        id:             s.showtime_id,
        movieId:        s.movie_id,
        roomId:         s.room_id,
        cinemaId:       s.cinema_id,
        startTime:      toDateTimeLocalValue(s.start_time),
        endTime:        toDateTimeLocalValue(s.end_time),
        price:          Number(s.price),
        priceStandard:  Number(s.price_standard ?? s.price),
        priceVip:       Number(s.price_vip ?? s.price),
        priceCouple:    Number(s.price_couple ?? s.price),
        availableSeats: Number(s.available_seats),
        status:         s.status,
        // join fields (dùng cho display nhanh)
        movieTitle:  s.movie_title,
        duration:    s.duration,
        roomName:    s.room_name,
        roomType:    s.room_type,
        totalSeats:  s.total_seat,
        cinemaName:  s.cinema_name,
      }));

      const normalizedCinemas = (cinRes.cinemas || []).map((c) => ({
        id: c.cinema_id,
        name: c.cinema_name,
      }));

      const normalizedRooms = (roomRes.rooms || []).map((r) => ({
        id: r.room_id,
        cinemaId: r.cinema_id,
        name: r.room_name,
        type: r.room_type,
        totalSeats: Number(r.total_seat),
      }));

      const normalizedMovies = (mvRes.movies || []).map(m => ({
        id:       m.movie_id,
        title:    m.title,
        duration: m.duration,
        releaseDate: normalizeDateInputValue(m.release_date),
      }));

      const scopedCinemas = isManager
        ? normalizedCinemas.filter((cinema) => Number(cinema.id) === Number(managerCinemaId))
        : normalizedCinemas;
      const scopedCinemaIds = new Set(scopedCinemas.map((cinema) => Number(cinema.id)));
      setShowtimes(normalizedSt.filter((showtime) => !isManager || scopedCinemaIds.has(Number(showtime.cinemaId))));
      setCinemas(scopedCinemas);
      setRooms(normalizedRooms.filter((room) => !isManager || scopedCinemaIds.has(Number(room.cinemaId))));
      setMovies(normalizedMovies);
    } catch (err) {
      console.error(err);
      setError("Không thể tải dữ liệu. Vui lòng kiểm tra kết nối server.");
    } finally {
      setLoading(false);
    }
  }, [currentUserId, isManager]);

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchAll, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchAll]);

  // ── Handlers ──
  const handleSave = async (data) => {
    try {
      const payload = {
        movieId:        data.movieId,
        roomId:         data.roomId,
        startTime:      data.startTime,
        endTime:        data.endTime,
        price:          data.priceStandard,
        priceStandard:  data.priceStandard,
        priceVip:       data.priceVip,
        priceCouple:    data.priceCouple,
        availableSeats: data.availableSeats,
        status:         "active",
      };

      if (data.id && showtimes.find(s => s.id === data.id)) {
        await adminShowtimeService.update(data.id, payload);
        showToast("Đã cập nhật suất chiếu.");
      } else {
        await adminShowtimeService.create(payload);
        showToast("Đã tạo suất chiếu mới.");
      }
      await fetchAll();
      setEditSt(undefined);
    } catch (err) {
      const msg = err?.message || "Lỗi lưu suất chiếu. Vui lòng thử lại.";
      showToast(msg);
    }
  };

  const handleSaveRecurring = async (data) => {
    try {
      const payload = {
        movies: data.movies || (data.movieId ? [{ movie_id: Number(data.movieId), priority: 1, slots_per_day: 1, early_bias: 0 }] : []),
        cinemas: data.cinemas || (data.cinemaId ? [Number(data.cinemaId)] : []),
        room_ids: data.room_ids || (data.roomId ? [Number(data.roomId)] : []),
        start_date: data.start_date || data.startDate,
        end_date: data.end_date || data.endDate,
        weekday_slots: data.weekday_slots || data.timeSlots,
        weekend_slots: data.weekend_slots || data.timeSlots,
        weekday_template: data.weekday_template,
        weekend_template: data.weekend_template,
        campaign_type: data.campaign_type,
        campaign_reason: data.campaign_reason,
        release_date: data.release_date,
        official_end_date: data.official_end_date,
        early_show_enabled: data.early_show_enabled,
        early_show_days: data.early_show_days,
        early_show_duration_days: data.early_show_duration_days,
        weeks: data.weeks,
        default_priority: data.default_priority,
        default_slots_per_day: data.default_slots_per_day,
        time_slots: data.timeSlots,
        template: data.template,
        price_standard: data.price_standard ?? data.priceStandard,
        price_vip: data.price_vip ?? data.priceVip,
        price_couple: data.price_couple ?? data.priceCouple,
      };

      const res = await adminShowtimeService.createRecurring(payload);
      showToast(res.message || `Đã tạo ${res.created?.length ?? 0} suất chiếu.`);
      setShowRecurring(false);
      await fetchAll();
    } catch (err) {
      showToast(err?.message || "Lỗi tạo lịch lặp lại.");
    }
  };

  const handleDelete = (s) => setConfirmTarget({ type: "delete", data: s });
  const handleDeleteMany = (items) => {
    const deletableItems = items.filter((item) => item.status !== "ended");
    if (deletableItems.length > 0) {
      setConfirmTarget({ type: "delete-many", data: deletableItems });
    }
  };

  const handleConfirm = async () => {
    const { type, data } = confirmTarget;
    try {
      if (type === "delete-many") {
        const results = await Promise.allSettled(
          data.map((showtime) => adminShowtimeService.delete(showtime.id)),
        );
        const deletedCount = results.filter((result) => result.status === "fulfilled").length;
        const failedCount = results.length - deletedCount;

        if (deletedCount > 0 && failedCount === 0) {
          showToast(`Đã xóa ${deletedCount} suất chiếu.`);
        } else if (deletedCount > 0) {
          showToast(`Đã xóa ${deletedCount} suất chiếu, ${failedCount} suất không thể xóa do đã có vé hoặc không còn hợp lệ.`);
        } else {
          showToast("Không thể xóa các suất chiếu đã chọn vì đã có vé hoặc không còn hợp lệ.");
        }
      } else {
        await adminShowtimeService.delete(data.id);
        showToast("Đã xóa suất chiếu.");
      }
      await fetchAll();
    } catch (err) {
      const rawMessage = err?.message || "";
      const msg = rawMessage.includes("associated bookings")
        ? "Không thể xóa: suất chiếu đã có vé đặt."
        : rawMessage || "Lỗi thực hiện. Vui lòng thử lại.";
      showToast(msg);
    }
    setConfirmTarget(null);
  };

  // ── Stats ──
  const stats = [
    { label: "Tổng suất chiếu", value: showtimes.length,                                    color: "#7c61ff" },
    { label: "Đang hoạt động",  value: showtimes.filter(s => s.status === "active").length, color: "#4ade80" },
    { label: "Đã kết thúc",     value: showtimes.filter(s => s.status === "ended").length,  color: "#94a3b8" },
  ];

  const TABS = [
    { key: "manager",    label: "Quản lý suất chiếu" },
    { key: "allocation", label: "Phân bổ phòng chiếu" },
    { key: "schedule",   label: "Danh sách lịch chiếu" },
    { key: "recurring",  label: "🔁 Lịch lặp lại", highlight: true },
    { key: "create",     label: "+ Tạo lịch chiếu", highlight: true },
  ];

  // ── Render ──
  return (
    <div className="admin-showtimes-page">
      <div className="sh-page-header">
        <h2>Quản lý lịch chiếu</h2>
        <p>Quản lý suất chiếu, phân bổ phòng, lịch chiếu theo ngày và tạo suất chiếu mới</p>
      </div>

      {/* Stats */}
      <div className="sh-stats-row">
        {stats.map(s => (
          <div className="sh-stat-pill" key={s.label}>
            <span>{s.label}</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="sh-tabs">
        {TABS.map(t => (
          <button
            key={t.key}
            className={`sh-tab${activeTab === t.key ? " active" : ""}${t.highlight ? " highlight" : ""}`}
            onClick={() => { if (t.key === "create") { setEditSt(null); } else if (t.key === "recurring") { setShowRecurring(true); } else setActiveTab(t.key); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="sh-loading">
          <div className="sh-spinner" />
          <span>Đang tải dữ liệu…</span>
        </div>
      )}
      {!loading && error && (
        <div className="sh-error-banner">
          ⚠️ {error}
          <button onClick={fetchAll}>Thử lại</button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {activeTab === "manager" && (
            <ShowtimeManager
              showtimes={showtimes} rooms={rooms} movies={movies} cinemas={cinemas}
              fixedCinemaId={isManager ? managerCinemaId : null}
              onEdit={s => setEditSt(s)}
              onDelete={handleDelete}
              onDeleteMany={handleDeleteMany}
            />
          )}
          {activeTab === "allocation" && (
            <RoomAllocation showtimes={showtimes} rooms={rooms} movies={movies} cinemas={cinemas} fixedCinemaId={isManager ? managerCinemaId : null} />
          )}
          {activeTab === "schedule" && (
            <ShowtimeSchedule showtimes={showtimes} rooms={rooms} movies={movies} cinemas={cinemas} fixedCinemaId={isManager ? managerCinemaId : null} />
          )}
        </>
      )}

      {/* Modals */}
      <div ref={modalsContainerRef}>
        {showRecurring && (
          <RecurringForm
            movies={movies}
            cinemas={cinemas}
            showtimes={showtimes}
            onClose={() => setShowRecurring(false)}
            onSave={handleSaveRecurring}
            fixedCinemaId={isManager ? managerCinemaId : null}
          />
        )}
        {editSt !== undefined && (
          <ShowtimeForm
            showtime={editSt}
            showtimes={showtimes}
            rooms={rooms}
            movies={movies}
            cinemas={cinemas}
            onClose={() => setEditSt(undefined)}
            onSave={handleSave}
            fixedCinemaId={isManager ? managerCinemaId : null}
          />
        )}
      </div>
      {confirmTarget && (
        <Confirm
          title="Xác nhận xóa"
          message={confirmTarget.type === "delete-many"
            ? `Xóa ${confirmTarget.data.length} suất chiếu đã chọn? Dữ liệu sẽ bị xóa vĩnh viễn.`
            : "Xóa suất chiếu này? Dữ liệu sẽ bị xóa vĩnh viễn."}
          danger
          onClose={() => setConfirmTarget(null)}
          onConfirm={handleConfirm}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
