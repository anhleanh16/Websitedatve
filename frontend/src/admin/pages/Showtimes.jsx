import { useState } from "react";

// ─── Sample Data ──────────────────────────────────────────────────────────────
const CINEMAS = [
  { id: 1, name: "Lunexa CGV Hà Nội",    city: "Hà Nội"   },
  { id: 2, name: "Lunexa Lotte TP.HCM",  city: "TP.HCM"   },
  { id: 3, name: "Lunexa CGV Đà Nẵng",   city: "Đà Nẵng"  },
  { id: 4, name: "Lunexa BHD TP.HCM",    city: "TP.HCM"   },
];

const ROOMS = [
  { id: 1, cinemaId: 1, name: "P01 – IMAX",    type: "IMAX",     totalSeats: 200 },
  { id: 2, cinemaId: 1, name: "P02 – 3D",      type: "3D",       totalSeats: 120 },
  { id: 3, cinemaId: 1, name: "P03 – 2D",      type: "2D",       totalSeats: 100 },
  { id: 4, cinemaId: 1, name: "P04 – VIP",     type: "VIP",      totalSeats: 60  },
  { id: 5, cinemaId: 2, name: "P01 – IMAX",    type: "IMAX",     totalSeats: 180 },
  { id: 6, cinemaId: 2, name: "P02 – 3D",      type: "3D",       totalSeats: 100 },
  { id: 7, cinemaId: 3, name: "P01 – 2D",      type: "2D",       totalSeats: 90  },
  { id: 8, cinemaId: 3, name: "P02 – 3D",      type: "3D",       totalSeats: 110 },
  { id: 9, cinemaId: 4, name: "P01 – VIP",     type: "VIP",      totalSeats: 50  },
  { id: 10, cinemaId: 4, name: "P02 – 2D",     type: "2D",       totalSeats: 95  },
];

const MOVIES = [
  { id: 1, title: "Đêm Thiên Cầu",           duration: 128 },
  { id: 2, title: "Tiếng Vọng Im Lặng",      duration: 105 },
  { id: 3, title: "Hỗn Loạn Tokyo",          duration: 135 },
  { id: 4, title: "Ánh Sao Cuối Trời",       duration: 110 },
  { id: 6, title: "Doraemon: Đại Chiến Vũ Trụ", duration: 95 },
];

const SAMPLE_SHOWTIMES = [
  { id: 1,  movieId: 1, roomId: 1, cinemaId: 1, startTime: "2026-06-10T14:00", endTime: "2026-06-10T16:08", price: 150000, availableSeats: 180, status: "active"    },
  { id: 2,  movieId: 1, roomId: 2, cinemaId: 1, startTime: "2026-06-10T19:30", endTime: "2026-06-10T21:38", price: 120000, availableSeats: 95,  status: "active"    },
  { id: 3,  movieId: 2, roomId: 5, cinemaId: 2, startTime: "2026-06-10T17:00", endTime: "2026-06-10T18:45", price: 130000, availableSeats: 140, status: "active"    },
  { id: 4,  movieId: 3, roomId: 7, cinemaId: 3, startTime: "2026-06-10T20:00", endTime: "2026-06-10T22:15", price: 110000, availableSeats: 60,  status: "active"    },
  { id: 5,  movieId: 6, roomId: 3, cinemaId: 1, startTime: "2026-06-11T10:00", endTime: "2026-06-11T11:35", price: 90000,  availableSeats: 100, status: "active"    },
  { id: 6,  movieId: 1, roomId: 4, cinemaId: 1, startTime: "2026-06-11T19:00", endTime: "2026-06-11T21:08", price: 200000, availableSeats: 0,   status: "active"    },
  { id: 7,  movieId: 4, roomId: 9, cinemaId: 4, startTime: "2026-06-12T15:30", endTime: "2026-06-12T17:20", price: 180000, availableSeats: 50,  status: "active"    },
  { id: 8,  movieId: 2, roomId: 6, cinemaId: 2, startTime: "2026-06-09T21:00", endTime: "2026-06-09T22:45", price: 120000, availableSeats: 30,  status: "cancelled" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_SHOW = {
  active:    { label: "Đang hoạt động", cls: "confirmed" },
  cancelled: { label: "Đã hủy",         cls: "cancelled" },
  full:      { label: "Hết chỗ",        cls: "pending"   },
};

const ROOM_TYPE_COLOR = { IMAX: "#7c61ff", "3D": "#5bcad4", "2D": "#4ade80", VIP: "#fbbf24" };

const EMPTY_FORM = {
  movieId: "", roomId: "", cinemaId: "",
  startTime: "", price: "", availableSeats: "", status: "active",
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

function calcEndTime(startIso, durationMin) {
  if (!startIso || !durationMin) return "";
  const d = new Date(startIso);
  d.setMinutes(d.getMinutes() + Number(durationMin));
  return d.toISOString().slice(0, 16);
}

function getConflicts(showtimes, rooms, movies, newSt, excludeId = null) {
  const room = rooms.find(r => r.id === Number(newSt.roomId));
  const movie = movies.find(m => m.id === Number(newSt.movieId));
  if (!room || !movie || !newSt.startTime) return [];
  const newStart = new Date(newSt.startTime);
  const newEnd   = new Date(calcEndTime(newSt.startTime, movie.duration));
  return showtimes.filter(s => {
    if (s.id === excludeId || s.roomId !== room.id || s.status === "cancelled") return false;
    const sStart = new Date(s.startTime);
    const sEnd   = new Date(s.endTime);
    return newStart < sEnd && newEnd > sStart;
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 1. Quản lý Suất chiếu – bảng tổng hợp */
function ShowtimeManager({ showtimes, rooms, movies, cinemas, onEdit, onDelete, onCancel }) {
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
  }).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

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
          <option value="cancelled">Đã hủy</option>
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
              <th>Giá vé</th>
              <th>Ghế trống</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}>Không có suất chiếu nào.</td></tr>
            ) : filtered.map(s => {
              const movie  = movies.find(m => m.id === s.movieId);
              const room   = rooms.find(r => r.id === s.roomId);
              const cinema = cinemas.find(c => c.id === s.cinemaId);
              const st     = s.availableSeats === 0 && s.status === "active"
                ? STATUS_SHOW.full : STATUS_SHOW[s.status] || STATUS_SHOW.active;
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
                  <td><span style={{ color: "#a78bfa", fontWeight: 600 }}>{fmtMoney(s.price)}</span></td>
                  <td>
                    <span style={{ color: s.availableSeats === 0 ? "#f87171" : "#4ade80", fontWeight: 600 }}>
                      {s.availableSeats} / {room?.totalSeats}
                    </span>
                  </td>
                  <td><span className={`status-pill ${st.cls}`}>{st.label}</span></td>
                  <td>
                    <div className="sh-actions">
                      <button className="sh-btn sh-btn-edit" onClick={() => onEdit(s)}>Sửa</button>
                      {s.status === "active" && (
                        <button className="sh-btn sh-btn-cancel" onClick={() => onCancel(s)}>Hủy</button>
                      )}
                      <button className="sh-btn sh-btn-delete" onClick={() => onDelete(s)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sh-footer-count">Hiển thị <strong>{filtered.length}</strong> / {showtimes.length} suất chiếu</div>
    </div>
  );
}

/** 2. Phân bổ phòng chiếu – timeline theo phòng */
function RoomAllocation({ showtimes, rooms, movies, cinemas }) {
  const [selectedCinema, setSC] = useState(String(cinemas[0]?.id || ""));
  const [selectedDate, setSD]   = useState("2026-06-10");

  const cinemaRooms = rooms.filter(r => String(r.cinemaId) === selectedCinema);
  const dayShows    = showtimes.filter(s =>
    String(s.cinemaId) === selectedCinema &&
    s.startTime.startsWith(selectedDate) &&
    s.status !== "cancelled"
  );

  const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 – 22:00
  const totalMin = 15 * 60;

  function pct(iso) {
    const d = new Date(iso);
    const minFromBase = (d.getHours() - 8) * 60 + d.getMinutes();
    return Math.max(0, (minFromBase / totalMin) * 100);
  }
  function widthPct(startIso, endIso) {
    const start = new Date(startIso);
    const end   = new Date(endIso);
    const mins  = (end - start) / 60000;
    return Math.min(100, (mins / totalMin) * 100);
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
          const roomShows = dayShows.filter(s => s.roomId === room.id);
          const rtColor   = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
          return (
            <div key={room.id} className="sh-timeline-row">
              <div className="sh-room-label-col">
                <span className="sh-room-label-name">{room.name}</span>
                <span className="sh-room-label-type" style={{ color: rtColor }}>
                  {room.type} · {room.totalSeats} ghế
                </span>
              </div>
              <div className="sh-timeline-track">
                {HOURS.map(h => (
                  <div key={h} className="sh-track-grid-line" style={{ left: `${((h - 8) / 15) * 100}%` }} />
                ))}
                {roomShows.map(s => {
                  const movie = movies.find(m => m.id === s.movieId);
                  const left  = pct(s.startTime);
                  const width = widthPct(s.startTime, s.endTime);
                  const isFull = s.availableSeats === 0;
                  return (
                    <div
                      key={s.id}
                      className="sh-block"
                      style={{ left: `${left}%`, width: `${width}%`, background: isFull ? "rgba(248,113,113,0.25)" : "rgba(124,97,255,0.28)", borderColor: isFull ? "rgba(248,113,113,0.5)" : "rgba(124,97,255,0.6)" }}
                      title={`${movie?.title} | ${fmtTime(s.startTime)} – ${fmtTime(s.endTime)} | ${fmtMoney(s.price)}`}
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
  const [selectedDate, setSD]   = useState("2026-06-10");
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
                const isCancelled = s.status === "cancelled";
                return (
                  <div key={s.id} className={`sh-schedule-card${isCancelled ? " cancelled" : isFull ? " full" : ""}`}>
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
                      <span style={{ color: "#a78bfa", fontWeight: 600 }}>{fmtMoney(s.price)}</span>
                      <span style={{ color: isFull ? "#f87171" : "#4ade80", fontSize: 12 }}>
                        {isCancelled ? "Đã hủy" : isFull ? "Hết chỗ" : `${s.availableSeats} ghế trống`}
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

/** 4. Tạo / Sửa lịch chiếu */
function ShowtimeForm({ showtime, showtimes, rooms, movies, cinemas, onClose, onSave }) {
  const isEdit = !!showtime;
  const [form, setForm] = useState(showtime
    ? { movieId: showtime.movieId, cinemaId: showtime.cinemaId, roomId: showtime.roomId, startTime: showtime.startTime.slice(0, 16), price: showtime.price, availableSeats: showtime.availableSeats, status: showtime.status }
    : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState({});

  const set = (f, v) => { setForm(p => ({ ...p, [f]: v })); setErrors(p => ({ ...p, [f]: undefined })); };

  const cinemaRooms = rooms.filter(r => String(r.cinemaId) === String(form.cinemaId));
  const selMovie    = movies.find(m => m.id === Number(form.movieId));
  const endTime     = calcEndTime(form.startTime, selMovie?.duration);
  const conflicts   = form.roomId && form.startTime && form.movieId
    ? getConflicts(showtimes, rooms, movies, form, showtime?.id)
    : [];

  const validate = () => {
    const e = {};
    if (!form.movieId)     e.movieId    = "Chọn phim.";
    if (!form.cinemaId)    e.cinemaId   = "Chọn rạp.";
    if (!form.roomId)      e.roomId     = "Chọn phòng chiếu.";
    if (!form.startTime)   e.startTime  = "Chọn giờ bắt đầu.";
    if (!form.price || Number(form.price) <= 0) e.price = "Nhập giá vé hợp lệ.";
    if (conflicts.length)  e.startTime  = "Phòng đã có suất chiếu trùng giờ.";
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
      price: Number(form.price),
      availableSeats: Number(form.availableSeats) || room?.totalSeats || 0,
      status: form.status,
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
                <select value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="active">Đang hoạt động</option>
                  <option value="cancelled">Hủy</option>
                </select>
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

              <div className="sh-field-row">
                <div className="sh-field">
                  <label>Giá vé (₫) *</label>
                  <input type="number" min={0} className={errors.price ? "error" : ""} value={form.price} onChange={e => set("price", e.target.value)} placeholder="120000" />
                  {errors.price && <span className="sh-error">{errors.price}</span>}
                </div>
                <div className="sh-field">
                  <label>Ghế trống</label>
                  <input type="number" min={0} value={form.availableSeats} onChange={e => set("availableSeats", e.target.value)} placeholder="Tự động từ phòng" />
                </div>
              </div>

              {/* Conflict warning */}
              {conflicts.length > 0 && (
                <div className="sh-conflict-warn">
                  ⚠️ Phòng đã có <strong>{conflicts.length}</strong> suất chiếu trùng giờ:
                  {conflicts.map(c => {
                    const m = movies.find(x => x.id === c.movieId);
                    return <div key={c.id} className="sh-conflict-item">• {m?.title} | {fmtTime(c.startTime)} – {fmtTime(c.endTime)}</div>;
                  })}
                </div>
              )}

              {/* Preview */}
              {selMovie && form.startTime && (
                <div className="sh-preview-card">
                  <div className="sh-preview-row"><span>Phim</span><strong>{selMovie.title}</strong></div>
                  <div className="sh-preview-row"><span>Thời lượng</span><strong>{selMovie.duration} phút</strong></div>
                  {endTime && <div className="sh-preview-row"><span>Kết thúc</span><strong>{fmtTime(endTime)}</strong></div>}
                  {form.price && <div className="sh-preview-row"><span>Giá vé</span><strong style={{ color: "#a78bfa" }}>{fmtMoney(form.price)}</strong></div>}
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
  const [showtimes, setShowtimes] = useState(SAMPLE_SHOWTIMES);
  const [activeTab, setActiveTab] = useState("manager");

  const [editSt,   setEditSt]   = useState(undefined); // undefined=closed, null=new, obj=edit
  const [confirmTarget, setConfirmTarget] = useState(null); // {type, data}
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  const handleSave = (data) => {
    if (showtimes.find(s => s.id === data.id)) {
      setShowtimes(p => p.map(s => s.id === data.id ? data : s));
      showToast("Đã cập nhật suất chiếu.");
    } else {
      setShowtimes(p => [data, ...p]);
      showToast("Đã tạo suất chiếu mới.");
    }
    setEditSt(undefined);
  };

  const handleCancel = (s) => setConfirmTarget({ type: "cancel", data: s });
  const handleDelete = (s) => setConfirmTarget({ type: "delete", data: s });

  const handleConfirm = () => {
    const { type, data } = confirmTarget;
    if (type === "cancel") {
      setShowtimes(p => p.map(s => s.id === data.id ? { ...s, status: "cancelled" } : s));
      showToast(`Đã hủy suất chiếu phim "${MOVIES.find(m => m.id === data.movieId)?.title}".`);
    } else {
      setShowtimes(p => p.filter(s => s.id !== data.id));
      showToast("Đã xóa suất chiếu.");
    }
    setConfirmTarget(null);
  };

  const stats = [
    { label: "Tổng suất chiếu", value: showtimes.length,                                            color: "#7c61ff" },
    { label: "Đang hoạt động",  value: showtimes.filter(s => s.status === "active").length,         color: "#4ade80" },
    { label: "Hết chỗ",        value: showtimes.filter(s => s.availableSeats === 0 && s.status === "active").length, color: "#fbbf24" },
    { label: "Đã hủy",         value: showtimes.filter(s => s.status === "cancelled").length,       color: "#f87171" },
  ];

  const TABS = [
    { key: "manager",    label: "Quản lý suất chiếu" },
    { key: "allocation", label: "Phân bổ phòng chiếu" },
    { key: "schedule",   label: "Danh sách lịch chiếu" },
    { key: "create",     label: "+ Tạo lịch chiếu",    highlight: true },
  ];

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
            onClick={() => { if (t.key === "create") { setEditSt(null); } else setActiveTab(t.key); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "manager" && (
        <ShowtimeManager showtimes={showtimes} rooms={ROOMS} movies={MOVIES} cinemas={CINEMAS} onEdit={s => setEditSt(s)} onDelete={handleDelete} onCancel={handleCancel} />
      )}
      {activeTab === "allocation" && (
        <RoomAllocation showtimes={showtimes} rooms={ROOMS} movies={MOVIES} cinemas={CINEMAS} />
      )}
      {activeTab === "schedule" && (
        <ShowtimeSchedule showtimes={showtimes} rooms={ROOMS} movies={MOVIES} cinemas={CINEMAS} />
      )}

      {/* Modals */}
      {editSt !== undefined && (
        <ShowtimeForm
          showtime={editSt}
          showtimes={showtimes}
          rooms={ROOMS} movies={MOVIES} cinemas={CINEMAS}
          onClose={() => setEditSt(undefined)}
          onSave={handleSave}
        />
      )}
      {confirmTarget && (
        <Confirm
          title={confirmTarget.type === "cancel" ? "Xác nhận hủy suất chiếu" : "Xác nhận xóa"}
          message={confirmTarget.type === "cancel"
            ? `Hủy suất chiếu phim "${MOVIES.find(m => m.id === confirmTarget.data.movieId)?.title}" lúc ${fmtTime(confirmTarget.data.startTime)}? Hành động này không thể hoàn tác.`
            : `Xóa suất chiếu này? Toàn bộ dữ liệu liên quan sẽ bị xóa vĩnh viễn.`
          }
          danger={confirmTarget.type === "delete"}
          onClose={() => setConfirmTarget(null)}
          onConfirm={handleConfirm}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
