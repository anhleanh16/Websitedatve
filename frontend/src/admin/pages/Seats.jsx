import { useState } from "react";

// ─── Data ─────────────────────────────────────────────────────────────────────
const CINEMAS = [
  { id: 1, name: "Lunexa CGV Hà Nội" },
  { id: 2, name: "Lunexa Lotte TP.HCM" },
  { id: 3, name: "Lunexa CGV Đà Nẵng" },
  { id: 4, name: "Lunexa BHD TP.HCM" },
];

const ROOMS = [
  { id: 1, cinemaId: 1, name: "P01 – IMAX",  type: "IMAX", rows: 10, cols: 20 },
  { id: 2, cinemaId: 1, name: "P02 – 3D",    type: "3D",   rows: 8,  cols: 15 },
  { id: 3, cinemaId: 1, name: "P03 – 2D",    type: "2D",   rows: 8,  cols: 13 },
  { id: 4, cinemaId: 1, name: "P04 – VIP",   type: "VIP",  rows: 5,  cols: 12 },
  { id: 5, cinemaId: 2, name: "P01 – IMAX",  type: "IMAX", rows: 9,  cols: 20 },
  { id: 6, cinemaId: 2, name: "P02 – 3D",    type: "3D",   rows: 7,  cols: 14 },
  { id: 7, cinemaId: 3, name: "P01 – 2D",    type: "2D",   rows: 7,  cols: 13 },
  { id: 8, cinemaId: 3, name: "P02 – 3D",    type: "3D",   rows: 8,  cols: 14 },
];

// Tạo ghế mặc định cho một phòng
function generateSeats(room) {
  const seats = [];
  const ROWS = "ABCDEFGHIJKLMNOPQRST".split("").slice(0, room.rows);
  for (let r = 0; r < ROWS.length; r++) {
    for (let c = 1; c <= room.cols; c++) {
      const row = ROWS[r];
      const isVip    = r >= Math.floor(room.rows * 0.35) && r < Math.floor(room.rows * 0.7);
      const isCouple = r >= Math.floor(room.rows * 0.7) && c % 2 === 0 && c <= room.cols - 1;
      const type = room.type === "VIP" ? "VIP"
        : isCouple ? "Couple"
        : isVip    ? "VIP"
        : "Standard";
      // Một số ghế inactive / occupied ngẫu nhiên dựa trên hash
      const hash = (row.charCodeAt(0) * 31 + c * 17) % 20;
      const status = hash === 0 ? "inactive" : hash < 3 ? "occupied" : "active";
      seats.push({
        id: `${room.id}-${row}${c}`,
        code: `${row}${c}`,
        row, col: c, type, status,
        roomId: room.id,
      });
    }
  }
  return seats;
}

// Cache ghế theo roomId
const seatCache = {};
function getSeats(roomId) {
  if (!seatCache[roomId]) {
    const room = ROOMS.find(r => r.id === roomId);
    seatCache[roomId] = room ? generateSeats(room) : [];
  }
  return [...seatCache[roomId]];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SEAT_TYPES = {
  Standard: { label: "Thường",   color: "#4ade80", bg: "rgba(74,222,128,0.18)"  },
  VIP:      { label: "VIP",      color: "#fbbf24", bg: "rgba(251,191,36,0.22)"  },
  Couple:   { label: "Đôi",      color: "#f472b6", bg: "rgba(244,114,182,0.2)"  },
};
const SEAT_STATUSES = {
  active:   { label: "Còn trống",  color: "#4ade80" },
  occupied: { label: "Đang đặt",   color: "#f87171" },
  inactive: { label: "Ngưng hoạt động", color: "#6b7280" },
};
const ROOM_TYPE_COLOR = { IMAX: "#7c61ff", "3D": "#5bcad4", "2D": "#4ade80", VIP: "#fbbf24" };

// ─── Seat Map ─────────────────────────────────────────────────────────────────
function SeatMap({ seats, room, onSeatClick, selectedSeats }) {
  if (!room || seats.length === 0) return (
    <div className="seat-empty">Chọn phòng chiếu để xem sơ đồ ghế</div>
  );

  const rows = [...new Set(seats.map(s => s.row))];

  return (
    <div className="seat-map-wrap">
      {/* Screen */}
      <div className="seat-screen">
        <div className="seat-screen-bar" />
        <span>MÀN HÌNH</span>
      </div>

      {/* Grid */}
      <div className="seat-grid">
        {rows.map(row => {
          const rowSeats = seats.filter(s => s.row === row).sort((a, b) => a.col - b.col);
          return (
            <div className="seat-row" key={row}>
              <span className="seat-row-label">{row}</span>
              <div className="seat-row-seats">
                {rowSeats.map(seat => {
                  const typeInfo   = SEAT_TYPES[seat.type]   || SEAT_TYPES.Standard;
                  const isSelected = selectedSeats.includes(seat.id);
                  const isCouple   = seat.type === "Couple";
                  return (
                    <button
                      key={seat.id}
                      className={`seat-btn seat-${seat.status}${isSelected ? " seat-selected" : ""}${isCouple ? " seat-couple" : ""}`}
                      style={isSelected
                        ? { background: "#7c61ff", borderColor: "#a78bfa", color: "#fff" }
                        : seat.status === "inactive"
                        ? { background: "rgba(100,100,120,0.2)", borderColor: "rgba(100,100,120,0.3)", color: "#4a5568" }
                        : seat.status === "occupied"
                        ? { background: "rgba(248,113,113,0.2)", borderColor: "rgba(248,113,113,0.4)", color: "#f87171" }
                        : { background: typeInfo.bg, borderColor: `${typeInfo.color}44`, color: typeInfo.color }
                      }
                      title={`${seat.code} | ${typeInfo.label} | ${SEAT_STATUSES[seat.status]?.label}`}
                      onClick={() => onSeatClick(seat)}
                      disabled={seat.status === "occupied"}
                    >
                      {isCouple ? "♥" : seat.col}
                    </button>
                  );
                })}
              </div>
              <span className="seat-row-label">{row}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────
function SeatLegend() {
  return (
    <div className="seat-legend">
      {Object.entries(SEAT_TYPES).map(([key, t]) => (
        <div key={key} className="seat-legend-item">
          <div className="seat-legend-box" style={{ background: t.bg, borderColor: `${t.color}44`, color: t.color }}>
            {key === "Couple" ? "♥" : "A"}
          </div>
          <span>{t.label}</span>
        </div>
      ))}
      <div className="seat-legend-item">
        <div className="seat-legend-box" style={{ background: "rgba(248,113,113,0.2)", borderColor: "rgba(248,113,113,0.4)", color: "#f87171" }}>✕</div>
        <span>Đang đặt</span>
      </div>
      <div className="seat-legend-item">
        <div className="seat-legend-box" style={{ background: "rgba(100,100,120,0.2)", borderColor: "rgba(100,100,120,0.3)", color: "#4a5568" }}>—</div>
        <span>Ngưng</span>
      </div>
      <div className="seat-legend-item">
        <div className="seat-legend-box" style={{ background: "#7c61ff", borderColor: "#a78bfa", color: "#fff" }}>✓</div>
        <span>Đã chọn</span>
      </div>
    </div>
  );
}

// ─── Stats panel ─────────────────────────────────────────────────────────────
function SeatStats({ seats }) {
  if (!seats.length) return null;
  const total    = seats.length;
  const active   = seats.filter(s => s.status === "active").length;
  const occupied = seats.filter(s => s.status === "occupied").length;
  const inactive = seats.filter(s => s.status === "inactive").length;
  const standard = seats.filter(s => s.type === "Standard").length;
  const vip      = seats.filter(s => s.type === "VIP").length;
  const couple   = seats.filter(s => s.type === "Couple").length;

  return (
    <div className="seat-stats-grid">
      <div className="seat-stat-card">
        <span>Tổng ghế</span><strong style={{ color: "#7c61ff" }}>{total}</strong>
      </div>
      <div className="seat-stat-card">
        <span>Còn trống</span><strong style={{ color: "#4ade80" }}>{active}</strong>
      </div>
      <div className="seat-stat-card">
        <span>Đang đặt</span><strong style={{ color: "#f87171" }}>{occupied}</strong>
      </div>
      <div className="seat-stat-card">
        <span>Ngưng</span><strong style={{ color: "#6b7280" }}>{inactive}</strong>
      </div>
      <div className="seat-stat-card">
        <span>Ghế Thường</span><strong style={{ color: "#4ade80" }}>{standard}</strong>
      </div>
      <div className="seat-stat-card">
        <span>Ghế VIP</span><strong style={{ color: "#fbbf24" }}>{vip}</strong>
      </div>
      <div className="seat-stat-card">
        <span>Ghế Đôi</span><strong style={{ color: "#f472b6" }}>{couple}</strong>
      </div>
      <div className="seat-stat-card">
        <span>Tỉ lệ lấp đầy</span>
        <strong style={{ color: "#5bcad4" }}>
          {total ? Math.round((occupied / total) * 100) : 0}%
        </strong>
      </div>
    </div>
  );
}

// ─── Edit Panel (sửa ghế được chọn) ──────────────────────────────────────────
function SeatEditPanel({ seats, selectedIds, onClose, onSave }) {
  const selected = seats.filter(s => selectedIds.includes(s.id));
  const [newType,   setNewType]   = useState("");
  const [newStatus, setNewStatus] = useState("");

  if (!selected.length) return null;

  const handleSave = () => {
    onSave(selectedIds, { type: newType || undefined, status: newStatus || undefined });
    onClose();
  };

  return (
    <div className="seat-edit-panel">
      <div className="seat-edit-header">
        <span>Chỉnh sửa <strong>{selected.length}</strong> ghế đã chọn</span>
        <button className="seat-edit-close" onClick={onClose}>✕</button>
      </div>
      <div className="seat-edit-selected">
        {selected.map(s => (
          <span key={s.id} className="seat-tag"
            style={{ color: SEAT_TYPES[s.type]?.color, background: SEAT_TYPES[s.type]?.bg }}>
            {s.code}
          </span>
        ))}
      </div>
      <div className="seat-edit-fields">
        <div className="seat-edit-field">
          <label>Đổi loại ghế</label>
          <select value={newType} onChange={e => setNewType(e.target.value)}>
            <option value="">-- Giữ nguyên --</option>
            {Object.entries(SEAT_TYPES).map(([k, t]) => (
              <option key={k} value={k}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="seat-edit-field">
          <label>Đổi trạng thái</label>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
            <option value="">-- Giữ nguyên --</option>
            {Object.entries(SEAT_STATUSES).map(([k, s]) => (
              <option key={k} value={k}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="seat-edit-actions">
        <button className="seat-edit-save" onClick={handleSave}
          disabled={!newType && !newStatus}>Áp dụng</button>
        <button className="seat-edit-cancel" onClick={onClose}>Hủy</button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminSeats() {
  const [selectedCinema, setSC] = useState(String(CINEMAS[0].id));
  const [selectedRoom,   setSR] = useState("");
  const [seats,  setSeats]      = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterType,   setFT]   = useState("all");
  const [filterStatus, setFS]   = useState("all");
  const [toast, setToast]       = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  const cinemaRooms = ROOMS.filter(r => String(r.cinemaId) === selectedCinema);
  const currentRoom = ROOMS.find(r => String(r.id) === String(selectedRoom));

  const handleSelectRoom = (roomId) => {
    setSR(roomId);
    setSeats(getSeats(Number(roomId)));
    setSelectedIds([]);
  };

  // Filter ghế để highlight
  const displaySeats = seats.map(s => {
    const matchType   = filterType   === "all" || s.type   === filterType;
    const matchStatus = filterStatus === "all" || s.status === filterStatus;
    return { ...s, _dimmed: !(matchType && matchStatus) };
  });

  const handleSeatClick = (seat) => {
    if (seat.status === "occupied") return;
    setSelectedIds(prev =>
      prev.includes(seat.id) ? prev.filter(id => id !== seat.id) : [...prev, seat.id]
    );
  };

  const handleSelectAll = () => {
    const eligible = displaySeats.filter(s => !s._dimmed && s.status !== "occupied").map(s => s.id);
    setSelectedIds(eligible);
  };

  const handleClearSelection = () => setSelectedIds([]);

  const handleSaveEdit = (ids, changes) => {
    setSeats(prev => prev.map(s => {
      if (!ids.includes(s.id)) return s;
      return {
        ...s,
        ...(changes.type   ? { type: changes.type }     : {}),
        ...(changes.status ? { status: changes.status } : {}),
      };
    }));
    // Cập nhật cache
    seatCache[currentRoom.id] = seats.map(s => {
      if (!ids.includes(s.id)) return s;
      return { ...s, ...(changes.type ? { type: changes.type } : {}), ...(changes.status ? { status: changes.status } : {}) };
    });
    showToast(`Đã cập nhật ${ids.length} ghế.`);
    setSelectedIds([]);
  };

  const totalStats = {
    total: seats.length,
    active: seats.filter(s => s.status === "active").length,
    occupied: seats.filter(s => s.status === "occupied").length,
  };

  return (
    <div className="admin-seats-page">
      {/* Header */}
      <div className="seat-page-header">
        <h2>Quản lý ghế ngồi</h2>
        <p>Xem sơ đồ ghế, chỉnh sửa loại ghế và trạng thái theo từng phòng chiếu</p>
      </div>

      {/* Selector */}
      <div className="seat-selector-row">
        <div className="seat-selector-group">
          <label>Rạp chiếu</label>
          <select className="seat-select"
            value={selectedCinema}
            onChange={e => { setSC(e.target.value); setSR(""); setSeats([]); setSelectedIds([]); }}>
            {CINEMAS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="seat-selector-group">
          <label>Phòng chiếu</label>
          <select className="seat-select" value={selectedRoom}
            onChange={e => handleSelectRoom(e.target.value)}>
            <option value="">-- Chọn phòng --</option>
            {cinemaRooms.map(r => (
              <option key={r.id} value={r.id}>{r.name} ({r.rows * r.cols} ghế)</option>
            ))}
          </select>
        </div>

        {seats.length > 0 && (
          <>
            <div className="seat-selector-group">
              <label>Lọc loại ghế</label>
              <select className="seat-select" value={filterType} onChange={e => setFT(e.target.value)}>
                <option value="all">Tất cả loại</option>
                {Object.entries(SEAT_TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
            </div>
            <div className="seat-selector-group">
              <label>Lọc trạng thái</label>
              <select className="seat-select" value={filterStatus} onChange={e => setFS(e.target.value)}>
                <option value="all">Tất cả</option>
                {Object.entries(SEAT_STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Room info bar */}
      {currentRoom && (
        <div className="seat-room-bar">
          <span className="seat-room-name">{currentRoom.name}</span>
          <span className="seat-room-type-badge"
            style={{ color: ROOM_TYPE_COLOR[currentRoom.type], background: `${ROOM_TYPE_COLOR[currentRoom.type]}18`, borderColor: `${ROOM_TYPE_COLOR[currentRoom.type]}33` }}>
            {currentRoom.type}
          </span>
          <span className="seat-room-info">
            {currentRoom.rows} hàng × {currentRoom.cols} cột = {totalStats.total} ghế
          </span>
          <span style={{ color: "#4ade80", fontSize: 13 }}>✓ {totalStats.active} trống</span>
          <span style={{ color: "#f87171", fontSize: 13 }}>✕ {totalStats.occupied} đặt</span>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="seat-action-btn" onClick={handleSelectAll}>Chọn tất cả</button>
            {selectedIds.length > 0 && (
              <button className="seat-action-btn secondary" onClick={handleClearSelection}>
                Bỏ chọn ({selectedIds.length})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      {seats.length > 0 && <SeatStats seats={seats} />}

      {/* Main content */}
      {seats.length > 0 ? (
        <div className="seat-main-layout">
          {/* Sơ đồ ghế */}
          <div className="seat-map-container">
            <SeatMap
              seats={displaySeats}
              room={currentRoom}
              onSeatClick={handleSeatClick}
              selectedSeats={selectedIds}
            />
            <SeatLegend />
          </div>

          {/* Edit panel */}
          {selectedIds.length > 0 && (
            <SeatEditPanel
              seats={seats}
              selectedIds={selectedIds}
              onClose={handleClearSelection}
              onSave={handleSaveEdit}
            />
          )}
        </div>
      ) : (
        <div className="seat-empty-state">
          <div className="seat-empty-icon">💺</div>
          <p>Chọn rạp và phòng chiếu để xem sơ đồ ghế</p>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="seat-toast">
          {toast}
          <button onClick={() => setToast("")}>✕</button>
        </div>
      )}
    </div>
  );
}
