import { useState, useEffect, useCallback, useMemo } from "react";
import { adminShowtimeService, adminMovieService } from "../../services/adminApi";
import AdminPagination, { useAdminPagination } from "../../components/AdminPagination.jsx";
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
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
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
function ShowtimeManager({ showtimes, rooms, movies, cinemas, onEdit, onDelete }) {
  const [search, setSearch]     = useState("");
  const [filterCinema, setFC]   = useState("all");
  const [filterDate, setFD]     = useState("");
  const [filterStatus, setFS]   = useState("all");

  const filtered = showtimes.filter(s => {
    const movie   = movies.find(m => m.id === s.movieId);
    const room    = rooms.find(r => r.id === s.roomId);
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

  return (
    <div className="sh-section">
      <div className="sh-toolbar">
        <input className="sh-search" placeholder="Tìm phim, rạp…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="sh-select" value={filterCinema} onChange={e => setFC(e.target.value)}>
          <option value="all">Tất cả rạp</option>
          {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="sh-select" value={filterDate} onChange={e => setFD(e.target.value)} />
        <select className="sh-select" value={filterStatus} onChange={e => setFS(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="ended">Đã kết thúc</option>
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
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
              <tr><td colSpan={9} style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}>Không có suất chiếu nào.</td></tr>
            ) : pageItems.map(s => {
              const movie  = movies.find(m => m.id === s.movieId);
              const room   = rooms.find(r => r.id === s.roomId);
              const cinema = cinemas.find(c => c.id === s.cinemaId);
              const st     = STATUS_SHOW[s.status] || STATUS_SHOW.active;
              const rtColor = ROOM_TYPE_COLOR[room?.type] || "#8fa6ff";
              return (
                <tr key={s.id}>
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
                      <button className="sh-btn sh-btn-delete" onClick={() => onDelete(s)}>Xóa</button>
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
function RoomAllocation({ showtimes, rooms, movies, cinemas }) {
  const [selectedCinema, setSC] = useState(String(cinemas[0]?.id || ""));
  const [selectedDate, setSD]   = useState(() => new Date().toISOString().slice(0, 10));

  const cinemaRooms = rooms.filter(r => String(r.cinemaId) === selectedCinema);
  const dayShows    = showtimes.filter(s =>
    String(s.cinemaId) === selectedCinema &&
    s.startTime.startsWith(selectedDate)
  );

  const HOURS = Array.from({ length: 24 }, (_, i) => i); // 00:00 – 23:00
  const totalMin = 24 * 60;

  function minutesFromMidnight(iso) {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  }

  function pct(iso) {
    const minFromStart = minutesFromMidnight(iso);
    return Math.max(0, Math.min(100, (minFromStart / totalMin) * 100));
  }
  function widthPct(startIso, endIso) {
    const start = new Date(startIso);
    const end   = new Date(endIso);
    let startMin = minutesFromMidnight(start);
    let endMin = minutesFromMidnight(end);

    if (endMin <= startMin) {
      endMin += 24 * 60;
    }

    return Math.min(100, ((endMin - startMin) / totalMin) * 100);
  }

  return (
    <div className="sh-section">
      <div className="sh-toolbar">
        <select className="sh-select" value={selectedCinema} onChange={e => setSC(e.target.value)}>
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
          const laneSpacing = 20;

          return (
            <div key={room.id} className="sh-timeline-row">
              <div className="sh-room-label-col">
                <span className="sh-room-label-name">{room.name}</span>
                <span className="sh-room-label-type" style={{ color: rtColor }}>
                  {room.type} · {room.totalSeats} ghế
                </span>
              </div>
              <div className="sh-timeline-track" style={{ height: `${Math.max(52, 18 + maxLanes * laneSpacing)}px` }}>
                {HOURS.map(h => (
                  <div key={h} className="sh-track-grid-line" style={{ left: `${((h - 8) / 15) * 100}%` }} />
                ))}
                {arrangedShows.map(s => {
                  const movie = movies.find(m => m.id === s.movieId);
                  const left  = pct(s.startTime);
                  const width = widthPct(s.startTime, s.endTime);
                  const isFull = s.availableSeats === 0;
                  const isEnded = s.status === "ended";
                  const laneTop = 8 + (s.laneIndex * 20);
                  const blockHeight = Math.max(18, 26 - Math.max(0, maxLanes - 2));
                  const safeWidth = Math.max(8, Math.min(100 - left, width));

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
                          ? "rgba(148,163,184,0.34)"
                          : isFull
                            ? "rgba(248,113,113,0.5)"
                            : "rgba(124,97,255,0.6)",
                        opacity: isEnded ? 0.78 : 1,
                      }}
                      title={`${movie?.title} | ${fmtTime(s.startTime)} – ${fmtTime(s.endTime)} | Thường ${fmtMoney(s.priceStandard)} | VIP ${fmtMoney(s.priceVip)} | Ghế đôi ${fmtMoney(s.priceCouple)}`}
                    >
                      <span className="sh-block-title">{movie?.title}</span>
                      <span className="sh-block-time">{new Date(s.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
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
function ShowtimeSchedule({ showtimes, rooms, movies, cinemas }) {
  const [selectedDate, setSD]   = useState(() => new Date().toISOString().slice(0, 10));
  const [filterCinema, setFC]   = useState("all");

  const dayShows = showtimes
    .filter(s => s.startTime.startsWith(selectedDate) && (filterCinema === "all" || String(s.cinemaId) === filterCinema))
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  // Group by movie
  const byMovie = dayShows.reduce((acc, s) => {
    const key = s.movieId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div className="sh-section">
      <div className="sh-toolbar">
        <input type="date" className="sh-select" value={selectedDate} onChange={e => setSD(e.target.value)} />
        <select className="sh-select" value={filterCinema} onChange={e => setFC(e.target.value)}>
          <option value="all">Tất cả rạp</option>
          {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {Object.keys(byMovie).length === 0 ? (
        <div className="sh-empty">Không có lịch chiếu nào cho ngày này.</div>
      ) : Object.entries(byMovie).map(([movieId, shows]) => {
        const movie = movies.find(m => m.id === Number(movieId));
        return (
          <div key={movieId} className="sh-schedule-movie-block">
            <div className="sh-schedule-movie-header">
              <span className="sh-schedule-movie-title">{movie?.title}</span>
              <span className="sh-schedule-movie-duration">⏱ {movie?.duration} phút</span>
              <span className="sh-schedule-count">{shows.length} suất</span>
            </div>
            <div className="sh-schedule-shows">
              {shows.map(s => {
                const room   = rooms.find(r => r.id === s.roomId);
                const cinema = cinemas.find(c => c.id === s.cinemaId);
                const rtColor = ROOM_TYPE_COLOR[room?.type] || "#8fa6ff";
                const isFull = s.availableSeats === 0;
                const isEnded = s.status === "ended";
                return (
                  <div key={s.id} className={`sh-schedule-card${isEnded ? " ended" : isFull ? " full" : ""}`}>
                    <div className="sh-schedule-time">
                      {new Date(s.startTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="sh-schedule-room">
                      <span style={{ color: "#c0d0ff", fontSize: 12 }}>{cinema?.name}</span>
                      <span className="sh-room-badge sm" style={{ color: rtColor, background: `${rtColor}15`, borderColor: `${rtColor}33` }}>
                        {room?.name} · {room?.type}
                      </span>
                    </div>
                    <div className="sh-schedule-meta">
                      <span style={{ color: "#a78bfa", fontWeight: 600 }}>
                        Thường {fmtMoney(s.priceStandard)} · VIP {fmtMoney(s.priceVip)} · Đôi {fmtMoney(s.priceCouple)}
                      </span>
                      <span style={{ color: isEnded ? "#94a3b8" : isFull ? "#f87171" : "#4ade80", fontSize: 12 }}>
                        {isEnded ? "Đã kết thúc" : isFull ? "Hết chỗ" : `${s.availableSeats} ghế trống`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** 4a. Tạo lịch chiếu lặp lại theo khung giờ cố định */
function RecurringForm({ rooms, movies, cinemas, onClose, onSave }) {
  const today = new Date().toISOString().slice(0, 10);

  const TEMPLATE_PRESETS = {
    balanced: { label: "Cân bằng", slots: [{ hour: "09", minute: "00" }, { hour: "12", minute: "00" }, { hour: "15", minute: "00" }, { hour: "18", minute: "00" }, { hour: "21", minute: "00" }] },
    premium: { label: "Khung giờ cao điểm", slots: [{ hour: "10", minute: "30" }, { hour: "13", minute: "30" }, { hour: "16", minute: "30" }, { hour: "19", minute: "30" }, { hour: "22", minute: "30" }] },
    weekend: { label: "Cuối tuần tập trung", slots: [{ hour: "08", minute: "30" }, { hour: "11", minute: "00" }, { hour: "14", minute: "00" }, { hour: "17", minute: "30" }, { hour: "20", minute: "30" }] },
    compact: { label: "Mật độ cao", slots: [{ hour: "10", minute: "00" }, { hour: "13", minute: "30" }, { hour: "17", minute: "00" }, { hour: "20", minute: "30" }] },
  };

  const [selectedMovieIds, setSelectedMovieIds] = useState([]);
  const [selectedCinemaIds, setSelectedCinemaIds] = useState([]);
  const [form, setForm] = useState({
    campaignType: "new_release",
    campaignReason: "",
    releaseDate: today,
    officialEndDate: today,
    earlyShowEnabled: false,
    earlyShowDays: 3,
    earlyShowDurationDays: 7,
    weekdayTemplate: "balanced",
    weekendTemplate: "weekend",
    defaultPriority: 3,
    defaultSlotsPerDay: 2,
  });
  const [errors, setErrors] = useState({});

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const toggleMovie = (movieId) => {
    setSelectedMovieIds((prev) => {
      const next = prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId];
      return next;
    });
  };

  const toggleCinema = (cinemaId) => {
    setSelectedCinemaIds((prev) => {
      const next = prev.includes(cinemaId) ? prev.filter((id) => id !== cinemaId) : [...prev, cinemaId];
      return next;
    });
  };

  const movieConfigs = useMemo(() => {
    return selectedMovieIds.reduce((acc, movieId) => {
      acc[movieId] = {
        priority: form.defaultPriority,
        slotsPerDay: form.defaultSlotsPerDay,
        earlyBias: 0,
        ...acc[movieId],
      };
      return acc;
    }, {});
  }, [selectedMovieIds, form.defaultPriority, form.defaultSlotsPerDay]);

  const updateMovieConfig = (movieId, field, value) => {
    setSelectedMovieIds((prev) => prev);
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

  const weekdaySlots = TEMPLATE_PRESETS[form.weekdayTemplate]?.slots || TEMPLATE_PRESETS.balanced.slots;
  const weekendSlots = TEMPLATE_PRESETS[form.weekendTemplate]?.slots || TEMPLATE_PRESETS.weekend.slots;

  useEffect(() => {
    if (!form.releaseDate) return;
    const start = new Date(form.releaseDate);
    if (Number.isNaN(start.getTime())) return;
    if (!form.officialEndDate || form.officialEndDate < form.releaseDate) {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      setForm((prev) => ({
        ...prev,
        officialEndDate: end.toISOString().slice(0, 10),
      }));
    }
  }, [form.releaseDate, form.officialEndDate]);

  const calcDays = () => {
    if (!form.releaseDate || !form.officialEndDate) return 0;
    const start = new Date(form.releaseDate);
    const end = new Date(form.officialEndDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
    return Math.floor((end - start) / 86400000) + 1;
  };

  const totalEstimate = useMemo(() => {
    const dayCount = calcDays();
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
  }, [calcDays, selectedMovieIds, selectedCinemaIds, form, weekdaySlots, weekendSlots]);

  const validate = () => {
    const e = {};
    if (!selectedMovieIds.length) e.movies = "Chọn ít nhất 1 phim.";
    if (!selectedCinemaIds.length) e.cinemas = "Chọn ít nhất 1 rạp.";
    if (!form.releaseDate) e.releaseDate = "Chọn ngày phát hành.";
    if (!form.officialEndDate) e.officialEndDate = "Chọn ngày kết thúc dự kiến.";
    if (form.releaseDate && form.officialEndDate && form.officialEndDate < form.releaseDate) e.officialEndDate = "Ngày kết thúc phải sau ngày phát hành.";
    if (form.earlyShowEnabled && Number(form.earlyShowDays || 0) < 0) e.earlyShowDays = "Sớm bao nhiêu ngày phải >= 0.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    const moviesPayload = selectedMovieIds.map((movieId) => {
      const config = (form.movieConfig && form.movieConfig[movieId]) || {};
      return {
        movie_id: Number(movieId),
        priority: Number(config.priority || form.defaultPriority || 1),
        slots_per_day: Number(config.slotsPerDay || form.defaultSlotsPerDay || 1),
        early_bias: Number(config.earlyBias || 0),
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
      weeks: 1,
      default_priority: Number(form.defaultPriority || 1),
      default_slots_per_day: Number(form.defaultSlotsPerDay || 1),
    });
  };

  const days = calcDays();

  return (
    <div className="sh-modal-overlay" onClick={onClose}>
      <div className="sh-modal sh-modal-recurring" onClick={(event) => event.stopPropagation()}>
        <div className="sh-modal-header">
          <h2>🔁 Tạo lịch chiếu theo nhóm</h2>
          <button className="sh-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sh-modal-body">
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

          <div className="sh-form-grid">
            <div className="sh-form-col">
              <div className="sh-schedule-card-block">
                <div className="sh-card-header">Thông tin đợt chiếu</div>

                <div className="sh-field">
                  <label>Danh sách phim *</label>
                  <div className="sh-checkbox-list">
                    {movies.map((movie) => (
                      <label key={movie.id} className="sh-checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedMovieIds.includes(movie.id)}
                          onChange={() => toggleMovie(movie.id)}
                        />
                        <span>{movie.title} · {movie.duration} phút</span>
                      </label>
                    ))}
                  </div>
                  {errors.movies && <span className="sh-error">{errors.movies}</span>}
                </div>

                <div className="sh-field">
                  <label>Rạp chiếu *</label>
                  <div className="sh-checkbox-list">
                    {cinemas.map((cinema) => (
                      <label key={cinema.id} className="sh-checkbox-item">
                        <input
                          type="checkbox"
                          checked={selectedCinemaIds.includes(cinema.id)}
                          onChange={() => toggleCinema(cinema.id)}
                        />
                        <span>{cinema.name}</span>
                      </label>
                    ))}
                  </div>
                  {errors.cinemas && <span className="sh-error">{errors.cinemas}</span>}
                </div>

                <div className="sh-field-row">
                  <div className="sh-field">
                    <label>Ngày phát hành *</label>
                    <input type="date" value={form.releaseDate} onChange={(event) => set("releaseDate", event.target.value)} />
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
                  <div className="sh-field">
                    <label>Ưu tiên mặc định</label>
                    <input type="number" min={1} max={5} value={form.defaultPriority} onChange={(event) => set("defaultPriority", Math.min(5, Math.max(1, Number(event.target.value || 1))))} />
                  </div>
                </div>

                <div className="sh-field">
                  <label>Lý do / ghi chú</label>
                  <textarea
                    rows={3}
                    value={form.campaignReason}
                    onChange={(event) => set("campaignReason", event.target.value)}
                    placeholder="Ví dụ: Khuyến khích mở bán sớm cho phim mới, chiếu lại dịp cuối tuần, sự kiện đặc biệt..."
                    style={{ width: "100%", minHeight: "84px", borderRadius: "12px", padding: "12px 14px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#eef4ff", resize: "vertical" }}
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
                      {Object.entries(TEMPLATE_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>{preset.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sh-field">
                    <label>Khung giờ cuối tuần</label>
                    <select value={form.weekendTemplate} onChange={(event) => set("weekendTemplate", event.target.value)}>
                      {Object.entries(TEMPLATE_PRESETS).map(([key, preset]) => (
                        <option key={key} value={key}>{preset.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="sh-field">
                  <label>Suất chiếu / ngày mặc định</label>
                  <input type="number" min={1} max={8} value={form.defaultSlotsPerDay} onChange={(event) => set("defaultSlotsPerDay", Math.max(1, Number(event.target.value || 1)))} />
                </div>
              </div>

              <div className="sh-schedule-card-block sh-early-block">
                <div className="sh-card-header">Suất chiếu sớm</div>

                <div className="sh-field">
                  <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input type="checkbox" checked={form.earlyShowEnabled} onChange={(event) => set("earlyShowEnabled", event.target.checked)} />
                    Có suất chiếu sớm
                  </label>
                </div>

                {form.earlyShowEnabled && (
                  <div className="sh-field-row">
                    <div className="sh-field">
                      <label>Bắt đầu sớm bao nhiêu ngày</label>
                      <input type="number" min={0} max={30} value={form.earlyShowDays} onChange={(event) => set("earlyShowDays", Number(event.target.value || 0))} />
                      {errors.earlyShowDays && <span className="sh-error">{errors.earlyShowDays}</span>}
                    </div>
                    <div className="sh-field">
                      <label>Số ngày chiếu sớm</label>
                      <input type="number" min={1} max={30} value={form.earlyShowDurationDays} onChange={(event) => set("earlyShowDurationDays", Math.max(1, Number(event.target.value || 1)))} />
                    </div>
                  </div>
                )}
              </div>

              {selectedMovieIds.length > 0 && (
                <div className="sh-field">
                  <label>Cấu hình ưu tiên xếp lịch theo phim</label>
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
                            value={config.priority || form.defaultPriority}
                            onChange={(event) => updateMovieConfig(movieId, "priority", Number(event.target.value || 1))}
                          />
                          <input
                            type="number"
                            min={1}
                            max={6}
                            title="Số suất chiếu mỗi ngày để phân bổ lịch cho phim này"
                            value={config.slotsPerDay || form.defaultSlotsPerDay}
                            onChange={(event) => updateMovieConfig(movieId, "slotsPerDay", Number(event.target.value || 1))}
                          />
                          <input
                            type="number"
                            min={0}
                            max={120}
                            title="Đẩy khung giờ chiếu sớm theo phút để phim bắt đầu sớm hơn khi có suất chiếu sớm"
                            value={config.earlyBias || 0}
                            onChange={(event) => updateMovieConfig(movieId, "earlyBias", Number(event.target.value || 0))}
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
                <div className="sh-preview-row"><span>Phân bổ</span><strong>Ưu tiên cao ⇒ nhiều suất/ngày</strong></div>
              </div>
            </div>
          </div>
        </div>
        <div className="sh-modal-footer">
          <button className="sh-btn sh-btn-add sh-btn-lg" onClick={handleSave}>🔁 Tạo lịch hàng loạt</button>
          <button className="sh-btn sh-btn-secondary sh-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/** 4. Tạo / Sửa lịch chiếu */
function ShowtimeForm({ showtime, showtimes, rooms, movies, cinemas, onClose, onSave }) {
  const isEdit = !!showtime;
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
    : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState({});

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: undefined })); };

  const cinemaRooms = rooms.filter(r => String(r.cinemaId) === String(form.cinemaId));
  const selMovie    = movies.find(m => m.id === Number(form.movieId));
  const releaseDate = selMovie?.releaseDate || "";
  const minStartTime = releaseDate ? `${releaseDate}T00:00` : "";
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
    if (releaseDate && form.startTime && form.startTime.slice(0, 10) < releaseDate) {
      e.startTime = `Phim này chỉ được chiếu từ ngày phát hành ${fmtDate(releaseDate)} trở đi.`;
    }
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
      id: showtime?.id || Date.now(),
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
    <div className="sh-modal-overlay" onClick={onClose}>
      <div className="sh-modal" onClick={e => e.stopPropagation()}>
        <div className="sh-modal-header">
          <h2>{isEdit ? "Chỉnh sửa suất chiếu" : "Tạo suất chiếu mới"}</h2>
          <button className="sh-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sh-modal-body">
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
                <select className={errors.cinemaId ? "error" : ""} value={form.cinemaId} onChange={e => { set("cinemaId", e.target.value); set("roomId", ""); }}>
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
                <input type="datetime-local" className={errors.startTime ? "error" : ""} value={form.startTime} min={minStartTime || undefined} onChange={e => set("startTime", e.target.value)} />
                {releaseDate && (
                  <span className="sh-hint">Chỉ được tạo suất chiếu từ ngày phát hành {fmtDate(releaseDate)} trở đi.</span>
                )}
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
  );
}

/** Confirm modal */
function Confirm({ title, message, onClose, onConfirm, danger }) {
  return (
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
  // ── State ──
  const [showtimes,  setShowtimes]  = useState([]);
  const [movies,     setMovies]     = useState([]);
  const [cinemas,    setCinemas]    = useState([]);
  const [rooms,      setRooms]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  const [activeTab,       setActiveTab]       = useState("manager");
  const [editSt,          setEditSt]          = useState(undefined);
  const [showRecurring,   setShowRecurring]   = useState(false);
  const [confirmTarget,   setConfirmTarget]   = useState(null);
  const [toast,           setToast]           = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

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

      setShowtimes(normalizedSt);
      setCinemas(normalizedCinemas);
      setRooms(normalizedRooms);
      setMovies(normalizedMovies);
    } catch (err) {
      console.error(err);
      setError("Không thể tải dữ liệu. Vui lòng kiểm tra kết nối server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

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
        weeks: data.weeks,
        default_priority: data.default_priority,
        default_slots_per_day: data.default_slots_per_day,
        time_slots: data.timeSlots,
        template: data.template,
        price_standard: data.priceStandard,
        price_vip: data.priceVip,
        price_couple: data.priceCouple,
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

  const handleConfirm = async () => {
    const { data } = confirmTarget;
    try {
      await adminShowtimeService.delete(data.id);
      showToast("Đã xóa suất chiếu.");
      await fetchAll();
    } catch (err) {
      const msg = err.message?.includes('400')
        ? "Không thể xóa: suất chiếu đã có vé đặt."
        : "Lỗi thực hiện. Vui lòng thử lại.";
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
              onEdit={s => setEditSt(s)}
              onDelete={handleDelete}
            />
          )}
          {activeTab === "allocation" && (
            <RoomAllocation showtimes={showtimes} rooms={rooms} movies={movies} cinemas={cinemas} />
          )}
          {activeTab === "schedule" && (
            <ShowtimeSchedule showtimes={showtimes} rooms={rooms} movies={movies} cinemas={cinemas} />
          )}
        </>
      )}

      {/* Modals */}
      {showRecurring && (
        <RecurringForm
          rooms={rooms}
          movies={movies}
          cinemas={cinemas}
          onClose={() => setShowRecurring(false)}
          onSave={handleSaveRecurring}
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
        />
      )}
      {confirmTarget && (
        <Confirm
          title="Xác nhận xóa"
          message="Xóa suất chiếu này? Dữ liệu sẽ bị xóa vĩnh viễn."
          danger
          onClose={() => setConfirmTarget(null)}
          onConfirm={handleConfirm}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
