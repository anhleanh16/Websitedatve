import { useEffect, useMemo, useState } from "react";
import { adminCinemaService, adminRoomService, adminSeatService } from "../../services/adminApi";

function parseSeatCode(code) {
  const m = String(code || "").trim().match(/^([A-Za-z]+)(\d+)$/);
  if (!m) return { row: "?", col: 0 };
  return { row: m[1].toUpperCase(), col: Number(m[2]) };
}

function computeRoomGridFromSeats(seats) {
  const parsed = seats.map((s) => parseSeatCode(s.code));
  const rows = new Set(parsed.map((p) => p.row));
  const cols = parsed.reduce((max, p) => (p.col > max ? p.col : max), 0);
  return { rows: rows.size || 0, cols: cols || 0 };
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
  if (!room) {
    return <div className="seat-empty">Chọn phòng chiếu để xem sơ đồ ghế</div>;
  }

  if (seats.length === 0) {
    return (
      <div className="seat-empty">
        Phòng này chưa có ghế. Hiện đang phù hợp để giữ ở trạng thái bảo trì.
      </div>
    );
  }

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
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);

  const [selectedCinema, setSC] = useState("");
  const [selectedRoom,   setSR] = useState("");
  const [seats,  setSeats]      = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterType,   setFT]   = useState("all");
  const [filterStatus, setFS]   = useState("all");
  const [toast, setToast]       = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2800); };

  useEffect(() => {
    let mounted = true;
    adminCinemaService
      .getAllCinemas()
      .then((data) => {
        const list = data?.cinemas || [];
        if (!mounted) return;
        setCinemas(list);
        if (list.length > 0) setSC(String(list[0].cinemas_id));
      })
      .catch(() => {
        if (!mounted) return;
        setCinemas([]);
        setSC("");
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedCinema) return;
    let mounted = true;
    setLoadingRooms(true);
    setRooms([]);
    setSR("");
    setSeats([]);
    setSelectedIds([]);
    adminRoomService
      .getRoomsByCinema(selectedCinema)
      .then((data) => {
        if (!mounted) return;
        setRooms(data?.rooms || []);
      })
      .catch(() => {
        if (!mounted) return;
        setRooms([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingRooms(false);
      });
    return () => {
      mounted = false;
    };
  }, [selectedCinema]);

  const currentRoom = useMemo(
    () => rooms.find((r) => String(r.room_id) === String(selectedRoom)),
    [rooms, selectedRoom],
  );

  const currentRoomView = useMemo(() => {
    if (!currentRoom) return null;
    const grid = computeRoomGridFromSeats(seats);
    return {
      id: currentRoom.room_id,
      name: currentRoom.room_name,
      type: currentRoom.room_type,
      rows: grid.rows,
      cols: grid.cols,
    };
  }, [currentRoom, seats]);

  const handleSelectRoom = (roomId) => {
    setSR(roomId);
    setLoadingSeats(true);
    setSeats([]);
    setSelectedIds([]);
    adminSeatService
      .getSeatsByRoom(roomId)
      .then((data) => {
        const list = data?.seats || [];
        const mapped = list.map((s) => {
          const parsed = parseSeatCode(s.seat_code);
          return {
            id: s.seat_id,
            code: s.seat_code,
            row: parsed.row,
            col: parsed.col,
            type: s.seat_type,
            status: s.status,
            roomId: s.room_id,
          };
        });
        setSeats(mapped);
      })
      .catch(() => {
        setSeats([]);
      })
      .finally(() => setLoadingSeats(false));
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
    const roomId = selectedRoom;
    setLoadingSeats(true);
    adminSeatService
      .bulkUpdate(roomId, ids, changes)
      .then((data) => {
        showToast(`Đã cập nhật ${data?.affected ?? ids.length} ghế.`);
        setSelectedIds([]);
        return adminSeatService.getSeatsByRoom(roomId);
      })
      .then((data) => {
        const list = data?.seats || [];
        const mapped = list.map((s) => {
          const parsed = parseSeatCode(s.seat_code);
          return {
            id: s.seat_id,
            code: s.seat_code,
            row: parsed.row,
            col: parsed.col,
            type: s.seat_type,
            status: s.status,
            roomId: s.room_id,
          };
        });
        setSeats(mapped);
      })
      .catch(() => {
        showToast("Cập nhật ghế thất bại.");
      })
      .finally(() => setLoadingSeats(false));
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
            onChange={e => { setSC(e.target.value); }}>
            {cinemas.map(c => <option key={c.cinemas_id} value={c.cinemas_id}>{c.cinema_name}</option>)}
          </select>
        </div>
        <div className="seat-selector-group">
          <label>Phòng chiếu</label>
          <select className="seat-select" value={selectedRoom}
            onChange={e => handleSelectRoom(e.target.value)}
            disabled={loadingRooms || !selectedCinema}>
            <option value="">-- Chọn phòng --</option>
            {rooms.map(r => (
              <option key={r.room_id} value={r.room_id}>
                {r.room_name} ({r.total_seat ?? "?"} ghế)
              </option>
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
      {currentRoomView && (
        <div className="seat-room-bar">
          <span className="seat-room-name">{currentRoomView.name}</span>
          <span className="seat-room-type-badge"
            style={{ color: ROOM_TYPE_COLOR[currentRoomView.type], background: `${ROOM_TYPE_COLOR[currentRoomView.type]}18`, borderColor: `${ROOM_TYPE_COLOR[currentRoomView.type]}33` }}>
            {currentRoomView.type}
          </span>
          <span className="seat-room-info">
            {currentRoomView.rows} hàng × {currentRoomView.cols} cột = {totalStats.total} ghế
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
              room={currentRoomView}
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
          <p>
            {loadingRooms || loadingSeats
              ? "Đang tải dữ liệu..."
              : "Chọn rạp và phòng chiếu để xem sơ đồ ghế"}
          </p>
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
