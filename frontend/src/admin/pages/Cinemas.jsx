import { useState } from "react";

// ─── Sample Data ──────────────────────────────────────────────────────────────
const ROOM_TYPES = ["2D", "3D", "IMAX", "VIP"];
const SEAT_TYPES = ["Standard", "VIP", "Couple"];

const SAMPLE_CINEMAS = [
  {
    id: 1,
    name: "Lunexa CGV Hà Nội",
    address: "101 Láng Hạ, Đống Đa",
    city: "Hà Nội",
    phone: "024 3333 1111",
    image: "",
    status: "active",
    rooms: [
      { id: 1, name: "P01 – IMAX",  type: "IMAX", totalSeats: 200, status: "active",   seats: [{ type: "Standard", count: 140 }, { type: "VIP", count: 40 }, { type: "Couple", count: 20 }] },
      { id: 2, name: "P02 – 3D",    type: "3D",   totalSeats: 120, status: "active",   seats: [{ type: "Standard", count: 100 }, { type: "VIP", count: 20 }] },
      { id: 3, name: "P03 – 2D",    type: "2D",   totalSeats: 100, status: "active",   seats: [{ type: "Standard", count: 100 }] },
      { id: 4, name: "P04 – VIP",   type: "VIP",  totalSeats: 60,  status: "maintenance", seats: [{ type: "VIP", count: 40 }, { type: "Couple", count: 20 }] },
    ],
  },
  {
    id: 2,
    name: "Lunexa Lotte TP.HCM",
    address: "đường Nguyễn Huệ, Q.1",
    city: "TP.HCM",
    phone: "028 3333 2222",
    image: "",
    status: "active",
    rooms: [
      { id: 5, name: "P01 – IMAX",  type: "IMAX", totalSeats: 180, status: "active", seats: [{ type: "Standard", count: 130 }, { type: "VIP", count: 30 }, { type: "Couple", count: 20 }] },
      { id: 6, name: "P02 – 3D",    type: "3D",   totalSeats: 100, status: "active", seats: [{ type: "Standard", count: 80 }, { type: "VIP", count: 20 }] },
    ],
  },
  {
    id: 3,
    name: "Lunexa CGV Đà Nẵng",
    address: "235 Nguyễn Văn Linh, Q. Thanh Khê",
    city: "Đà Nẵng",
    phone: "0236 3333 333",
    image: "",
    status: "active",
    rooms: [
      { id: 7, name: "P01 – 2D",  type: "2D", totalSeats: 90,  status: "active", seats: [{ type: "Standard", count: 90 }] },
      { id: 8, name: "P02 – 3D",  type: "3D", totalSeats: 110, status: "active", seats: [{ type: "Standard", count: 90 }, { type: "VIP", count: 20 }] },
    ],
  },
  {
    id: 4,
    name: "Lunexa BHD TP.HCM",
    address: "633 Điện Biên Phủ, Bình Thạnh",
    city: "TP.HCM",
    phone: "028 3333 4444",
    image: "",
    status: "inactive",
    rooms: [
      { id: 9,  name: "P01 – VIP", type: "VIP", totalSeats: 50, status: "active", seats: [{ type: "VIP", count: 30 }, { type: "Couple", count: 20 }] },
      { id: 10, name: "P02 – 2D",  type: "2D",  totalSeats: 95, status: "active", seats: [{ type: "Standard", count: 95 }] },
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CINEMA_STATUS = {
  active:   { label: "Đang hoạt động", cls: "confirmed" },
  inactive: { label: "Tạm ngưng",      cls: "cancelled" },
};
const ROOM_STATUS = {
  active:      { label: "Hoạt động",    cls: "confirmed" },
  maintenance: { label: "Bảo trì",      cls: "pending"   },
  inactive:    { label: "Ngưng",        cls: "cancelled" },
};
const ROOM_TYPE_COLOR = { IMAX: "#7c61ff", "3D": "#5bcad4", "2D": "#4ade80", VIP: "#fbbf24" };

const EMPTY_CINEMA = { name: "", address: "", city: "", phone: "", image: "", status: "active", rooms: [] };
const EMPTY_ROOM   = { name: "", type: "2D", totalSeats: 100, status: "active", seats: [] };

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 1. Danh sách rạp */
function CinemaList({ cinemas, onView, onEdit, onDelete }) {
  const [search, setSearch]   = useState("");
  const [filterCity, setFC]   = useState("all");
  const [filterStatus, setFS] = useState("all");

  const cities   = [...new Set(cinemas.map(c => c.city))];
  const filtered = cinemas.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)) &&
      (filterCity === "all"   || c.city === filterCity) &&
      (filterStatus === "all" || c.status === filterStatus)
    );
  });

  return (
    <div className="cn-section">
      <div className="cn-toolbar">
        <input className="cn-search" placeholder="Tìm tên rạp, địa chỉ…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="cn-select" value={filterCity} onChange={e => setFC(e.target.value)}>
          <option value="all">Tất cả thành phố</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="cn-select" value={filterStatus} onChange={e => setFS(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm ngưng</option>
        </select>
        <button className="cn-btn cn-btn-add" onClick={() => onEdit(null)}>+ Thêm rạp</button>
      </div>

      <div className="cn-grid">
        {filtered.length === 0 ? (
          <div className="cn-empty">Không tìm thấy rạp nào.</div>
        ) : filtered.map(cinema => {
          const st = CINEMA_STATUS[cinema.status] || CINEMA_STATUS.active;
          const totalSeats = cinema.rooms.reduce((s, r) => s + r.totalSeats, 0);
          const activeRooms = cinema.rooms.filter(r => r.status === "active").length;
          return (
            <div className="cn-card" key={cinema.id}>
              {/* Image / placeholder */}
              <div className="cn-card-image">
                {cinema.image
                  ? <img src={cinema.image} alt={cinema.name} />
                  : <div className="cn-image-placeholder">🎭</div>
                }
                <span className={`status-pill ${st.cls} cn-status-badge`}>{st.label}</span>
              </div>

              <div className="cn-card-body">
                <h3 className="cn-card-name">{cinema.name}</h3>
                <p className="cn-card-address">📍 {cinema.address}, {cinema.city}</p>
                <p className="cn-card-phone">📞 {cinema.phone}</p>

                {/* Room type chips */}
                <div className="cn-room-types">
                  {[...new Set(cinema.rooms.map(r => r.type))].map(t => (
                    <span key={t} className="cn-type-chip" style={{ color: ROOM_TYPE_COLOR[t], background: `${ROOM_TYPE_COLOR[t]}18`, borderColor: `${ROOM_TYPE_COLOR[t]}33` }}>{t}</span>
                  ))}
                </div>

                <div className="cn-card-stats">
                  <div className="cn-card-stat"><span>Phòng chiếu</span><strong>{cinema.rooms.length}</strong></div>
                  <div className="cn-card-stat"><span>Đang hoạt động</span><strong style={{ color: "#4ade80" }}>{activeRooms}</strong></div>
                  <div className="cn-card-stat"><span>Tổng ghế</span><strong>{totalSeats.toLocaleString()}</strong></div>
                </div>

                <div className="cn-card-actions">
                  <button className="cn-btn cn-btn-view"   onClick={() => onView(cinema)}>Xem chi tiết</button>
                  <button className="cn-btn cn-btn-edit"   onClick={() => onEdit(cinema)}>Chỉnh sửa</button>
                  <button className="cn-btn cn-btn-delete" onClick={() => onDelete(cinema)}>Xóa</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="cn-footer-count">Hiển thị <strong>{filtered.length}</strong> / {cinemas.length} rạp</div>
    </div>
  );
}

/** 2. Xem chi tiết rạp (modal) */
function CinemaDetail({ cinema, onClose, onEdit }) {
  if (!cinema) return null;
  const st = CINEMA_STATUS[cinema.status] || CINEMA_STATUS.active;
  const totalSeats  = cinema.rooms.reduce((s, r) => s + r.totalSeats, 0);
  const activeRooms = cinema.rooms.filter(r => r.status === "active").length;

  return (
    <div className="cn-modal-overlay" onClick={onClose}>
      <div className="cn-modal cn-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="cn-modal-header">
          <div>
            <h2>{cinema.name}</h2>
            <span className={`status-pill ${st.cls}`}>{st.label}</span>
          </div>
          <button className="cn-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cn-modal-body">
          {/* Thông tin rạp */}
          <div className="cn-detail-info-grid">
            <div className="cn-detail-info-card">
              <h4>Thông tin cơ bản</h4>
              <div className="cn-detail-row"><span>Địa chỉ</span><strong>{cinema.address}</strong></div>
              <div className="cn-detail-row"><span>Thành phố</span><strong>{cinema.city}</strong></div>
              <div className="cn-detail-row"><span>Điện thoại</span><strong>{cinema.phone}</strong></div>
            </div>
            <div className="cn-detail-info-card">
              <h4>Tổng quan phòng chiếu</h4>
              <div className="cn-detail-row"><span>Tổng phòng</span><strong>{cinema.rooms.length}</strong></div>
              <div className="cn-detail-row"><span>Đang hoạt động</span><strong style={{ color: "#4ade80" }}>{activeRooms}</strong></div>
              <div className="cn-detail-row"><span>Tổng sức chứa</span><strong>{totalSeats.toLocaleString()} ghế</strong></div>
            </div>
          </div>

          {/* Danh sách phòng */}
          <h4 className="cn-rooms-title">Danh sách phòng chiếu ({cinema.rooms.length})</h4>
          <div className="cn-rooms-grid">
            {cinema.rooms.map(room => {
              const rst = ROOM_STATUS[room.status] || ROOM_STATUS.active;
              const rtColor = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
              return (
                <div className="cn-room-card" key={room.id}>
                  <div className="cn-room-card-header">
                    <span className="cn-room-name">{room.name}</span>
                    <span className="cn-type-chip" style={{ color: rtColor, background: `${rtColor}18`, borderColor: `${rtColor}33` }}>{room.type}</span>
                  </div>
                  <div className="cn-room-stats">
                    <div className="cn-room-stat"><span>Tổng ghế</span><strong>{room.totalSeats}</strong></div>
                    <div className="cn-room-stat"><span>Trạng thái</span><span className={`status-pill ${rst.cls}`} style={{ fontSize: 11 }}>{rst.label}</span></div>
                  </div>
                  {/* Seat breakdown */}
                  <div className="cn-seat-breakdown">
                    {room.seats.map(s => (
                      <div key={s.type} className="cn-seat-type-row">
                        <span>{s.type}</span>
                        <div className="cn-seat-bar-wrap">
                          <div className="cn-seat-bar" style={{ width: `${(s.count / room.totalSeats) * 100}%` }} />
                        </div>
                        <span className="cn-seat-count">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="cn-modal-footer">
          <button className="cn-btn cn-btn-edit cn-btn-lg" onClick={() => onEdit(cinema)}>Chỉnh sửa rạp</button>
          <button className="cn-btn cn-btn-secondary cn-btn-lg" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

/** 3. Thêm / Chỉnh sửa rạp */
function CinemaForm({ cinema, onClose, onSave }) {
  const isEdit = !!cinema;
  const [form, setForm]   = useState(cinema ? { ...cinema, rooms: cinema.rooms.map(r => ({ ...r, seats: [...r.seats] })) } : { ...EMPTY_CINEMA, rooms: [] });
  const [errors, setErrors] = useState({});
  const [editRoomIdx, setEditRoomIdx] = useState(null); // null = no room form open
  const [roomForm, setRoomForm]       = useState(null);
  const [roomErrors, setRoomErrors]   = useState({});

  const setF = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = "Vui lòng nhập tên rạp.";
    if (!form.address.trim()) e.address = "Vui lòng nhập địa chỉ.";
    if (!form.city.trim())    e.city    = "Vui lòng nhập thành phố.";
    if (!form.phone.trim())   e.phone   = "Vui lòng nhập số điện thoại.";
    return e;
  };

  // ── Room form helpers ──
  const openAddRoom = () => {
    setRoomForm({ ...EMPTY_ROOM, id: Date.now(), seats: [] });
    setEditRoomIdx("new");
    setRoomErrors({});
  };
  const openEditRoom = (idx) => {
    setRoomForm({ ...form.rooms[idx], seats: [...form.rooms[idx].seats] });
    setEditRoomIdx(idx);
    setRoomErrors({});
  };
  const deleteRoom = (idx) => setForm(p => ({ ...p, rooms: p.rooms.filter((_, i) => i !== idx) }));

  const validateRoom = () => {
    const e = {};
    if (!roomForm.name.trim())             e.name       = "Nhập tên phòng.";
    if (!roomForm.totalSeats || roomForm.totalSeats <= 0) e.totalSeats = "Số ghế phải > 0.";
    const seatTotal = roomForm.seats.reduce((s, x) => s + Number(x.count), 0);
    if (roomForm.seats.length > 0 && seatTotal !== Number(roomForm.totalSeats)) {
      e.seats = `Tổng ghế theo loại (${seatTotal}) phải bằng tổng ghế phòng (${roomForm.totalSeats}).`;
    }
    return e;
  };
  const saveRoom = () => {
    const e = validateRoom();
    if (Object.keys(e).length) { setRoomErrors(e); return; }
    if (editRoomIdx === "new") {
      setForm(p => ({ ...p, rooms: [...p.rooms, roomForm] }));
    } else {
      setForm(p => ({ ...p, rooms: p.rooms.map((r, i) => i === editRoomIdx ? roomForm : r) }));
    }
    setEditRoomIdx(null); setRoomForm(null);
  };

  const setSeatCount = (type, count) => {
    setRoomForm(p => {
      const existing = p.seats.find(s => s.type === type);
      if (Number(count) === 0) return { ...p, seats: p.seats.filter(s => s.type !== type) };
      if (existing) return { ...p, seats: p.seats.map(s => s.type === type ? { ...s, count: Number(count) } : s) };
      return { ...p, seats: [...p.seats, { type, count: Number(count) }] };
    });
    setRoomErrors(p => ({ ...p, seats: undefined }));
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: cinema?.id || Date.now() });
  };

  return (
    <div className="cn-modal-overlay" onClick={onClose}>
      <div className="cn-modal cn-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="cn-modal-header">
          <h2>{isEdit ? "Chỉnh sửa rạp chiếu" : "Thêm rạp mới"}</h2>
          <button className="cn-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cn-modal-body">
          {/* Cinema info fields */}
          <div className="cn-form-grid">
            <div className="cn-form-col">
              <div className="cn-field">
                <label>Tên rạp *</label>
                <input className={errors.name ? "error" : ""} value={form.name} onChange={e => setF("name", e.target.value)} placeholder="Lunexa CGV…" />
                {errors.name && <span className="cn-error">{errors.name}</span>}
              </div>
              <div className="cn-field">
                <label>Địa chỉ *</label>
                <input className={errors.address ? "error" : ""} value={form.address} onChange={e => setF("address", e.target.value)} placeholder="Số nhà, đường, quận…" />
                {errors.address && <span className="cn-error">{errors.address}</span>}
              </div>
              <div className="cn-field-row">
                <div className="cn-field">
                  <label>Thành phố *</label>
                  <input className={errors.city ? "error" : ""} value={form.city} onChange={e => setF("city", e.target.value)} placeholder="Hà Nội…" />
                  {errors.city && <span className="cn-error">{errors.city}</span>}
                </div>
                <div className="cn-field">
                  <label>Điện thoại *</label>
                  <input className={errors.phone ? "error" : ""} value={form.phone} onChange={e => setF("phone", e.target.value)} placeholder="024…" />
                  {errors.phone && <span className="cn-error">{errors.phone}</span>}
                </div>
              </div>
            </div>
            <div className="cn-form-col">
              <div className="cn-field">
                <label>URL hình ảnh</label>
                <input value={form.image} onChange={e => setF("image", e.target.value)} placeholder="https://…/cinema.jpg" />
                {form.image && <div className="cn-img-preview"><img src={form.image} alt="preview" onError={e => { e.target.style.display = "none"; }} /></div>}
              </div>
              <div className="cn-field">
                <label>Trạng thái</label>
                <select value={form.status} onChange={e => setF("status", e.target.value)}>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm ngưng</option>
                </select>
              </div>
            </div>
          </div>

          {/* Rooms section */}
          <div className="cn-rooms-section">
            <div className="cn-rooms-section-header">
              <span>Phòng chiếu ({form.rooms.length})</span>
              <button className="cn-btn cn-btn-add" onClick={openAddRoom}>+ Thêm phòng</button>
            </div>

            {form.rooms.length === 0 ? (
              <div className="cn-empty-rooms">Chưa có phòng chiếu nào. Nhấn "+ Thêm phòng" để thêm.</div>
            ) : (
              <div className="cn-rooms-edit-list">
                {form.rooms.map((room, idx) => {
                  const rtColor = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
                  return (
                    <div className="cn-room-edit-row" key={room.id || idx}>
                      <span className="cn-type-chip sm" style={{ color: rtColor, background: `${rtColor}18`, borderColor: `${rtColor}33` }}>{room.type}</span>
                      <span className="cn-room-edit-name">{room.name}</span>
                      <span className="cn-room-edit-seats">{room.totalSeats} ghế</span>
                      <span className={`status-pill ${ROOM_STATUS[room.status]?.cls || "confirmed"}`} style={{ fontSize: 11 }}>{ROOM_STATUS[room.status]?.label}</span>
                      <div className="cn-room-edit-actions">
                        <button className="cn-btn cn-btn-edit sm" onClick={() => openEditRoom(idx)}>Sửa</button>
                        <button className="cn-btn cn-btn-delete sm" onClick={() => deleteRoom(idx)}>Xóa</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Room sub-form */}
          {editRoomIdx !== null && roomForm && (
            <div className="cn-room-subform">
              <div className="cn-room-subform-header">
                <span>{editRoomIdx === "new" ? "Thêm phòng mới" : "Chỉnh sửa phòng"}</span>
                <button className="cn-modal-close sm" onClick={() => { setEditRoomIdx(null); setRoomForm(null); }}>✕</button>
              </div>
              <div className="cn-form-grid">
                <div className="cn-form-col">
                  <div className="cn-field">
                    <label>Tên phòng *</label>
                    <input className={roomErrors.name ? "error" : ""} value={roomForm.name} onChange={e => { setRoomForm(p => ({ ...p, name: e.target.value })); setRoomErrors(p => ({ ...p, name: undefined })); }} placeholder="P01 – IMAX…" />
                    {roomErrors.name && <span className="cn-error">{roomErrors.name}</span>}
                  </div>
                  <div className="cn-field-row">
                    <div className="cn-field">
                      <label>Loại phòng</label>
                      <select value={roomForm.type} onChange={e => setRoomForm(p => ({ ...p, type: e.target.value }))}>
                        {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="cn-field">
                      <label>Tổng ghế *</label>
                      <input type="number" min={1} className={roomErrors.totalSeats ? "error" : ""} value={roomForm.totalSeats}
                        onChange={e => { setRoomForm(p => ({ ...p, totalSeats: Number(e.target.value) })); setRoomErrors(p => ({ ...p, totalSeats: undefined })); }} />
                      {roomErrors.totalSeats && <span className="cn-error">{roomErrors.totalSeats}</span>}
                    </div>
                  </div>
                  <div className="cn-field">
                    <label>Trạng thái phòng</label>
                    <select value={roomForm.status} onChange={e => setRoomForm(p => ({ ...p, status: e.target.value }))}>
                      <option value="active">Hoạt động</option>
                      <option value="maintenance">Bảo trì</option>
                      <option value="inactive">Ngưng</option>
                    </select>
                  </div>
                </div>
                <div className="cn-form-col">
                  <div className="cn-field">
                    <label>Phân loại ghế (tùy chọn)</label>
                    {roomErrors.seats && <span className="cn-error">{roomErrors.seats}</span>}
                    {SEAT_TYPES.map(type => {
                      const existing = roomForm.seats.find(s => s.type === type);
                      return (
                        <div className="cn-seat-input-row" key={type}>
                          <span className="cn-seat-type-label">{type}</span>
                          <input type="number" min={0} placeholder="0"
                            value={existing?.count || ""}
                            onChange={e => setSeatCount(type, e.target.value)}
                            style={{ width: 80 }}
                          />
                          <span className="cn-seat-input-unit">ghế</span>
                        </div>
                      );
                    })}
                    {roomForm.seats.length > 0 && (
                      <span style={{ fontSize: 12, color: "#8fa6ff", marginTop: 4 }}>
                        Tổng đã phân: {roomForm.seats.reduce((s, x) => s + Number(x.count), 0)} / {roomForm.totalSeats}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="cn-room-subform-footer">
                <button className="cn-btn cn-btn-add cn-btn-lg" onClick={saveRoom}>Lưu phòng</button>
                <button className="cn-btn cn-btn-secondary cn-btn-lg" onClick={() => { setEditRoomIdx(null); setRoomForm(null); }}>Hủy</button>
              </div>
            </div>
          )}
        </div>

        <div className="cn-modal-footer">
          <button className="cn-btn cn-btn-add cn-btn-lg" onClick={handleSave}>
            {isEdit ? "Lưu thay đổi" : "Thêm rạp"}
          </button>
          <button className="cn-btn cn-btn-secondary cn-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/** 4. Danh mục – loại phòng & loại ghế */
function CategoryTab() {
  const [roomTypes, setRoomTypes] = useState(
    ROOM_TYPES.map((name, i) => ({ id: i + 1, name, color: Object.values(ROOM_TYPE_COLOR)[i], desc: `Phòng chiếu ${name}` }))
  );
  const [seatTypes, setSeatTypes] = useState(
    SEAT_TYPES.map((name, i) => ({ id: i + 1, name, priceMultiplier: [1, 1.5, 1.8][i], desc: `Ghế ${name}` }))
  );

  const [editItem, setEditItem]   = useState(null); // {section, item}
  const [form, setForm]           = useState({});
  const [error, setError]         = useState("");

  const openEdit = (section, item) => { setEditItem({ section, item }); setForm({ ...item }); setError(""); };
  const handleSave = () => {
    if (!form.name?.trim()) { setError("Vui lòng nhập tên."); return; }
    if (editItem.section === "room") {
      setRoomTypes(p => p.map(x => x.id === form.id ? { ...form } : x));
    } else {
      setSeatTypes(p => p.map(x => x.id === form.id ? { ...form } : x));
    }
    setEditItem(null);
  };

  return (
    <div className="cn-section">
      {/* Room types */}
      <div className="cn-cat-section">
        <div className="cn-cat-header">
          <h3>Loại phòng chiếu</h3>
          <span className="cn-cat-note">Chỉnh sửa tên hiển thị và màu sắc đặc trưng</span>
        </div>
        <div className="cn-cat-grid">
          {roomTypes.map(rt => (
            <div className="cn-cat-card" key={rt.id} style={{ "--cat-color": rt.color }}>
              <div className="cn-cat-icon" style={{ background: `${rt.color}20`, color: rt.color }}>
                {rt.name}
              </div>
              <div className="cn-cat-info">
                <strong style={{ color: rt.color }}>{rt.name}</strong>
                <span>{rt.desc}</span>
              </div>
              <button className="cn-btn cn-btn-edit sm" onClick={() => openEdit("room", rt)}>Sửa</button>
            </div>
          ))}
        </div>
      </div>

      {/* Seat types */}
      <div className="cn-cat-section">
        <div className="cn-cat-header">
          <h3>Loại ghế ngồi</h3>
          <span className="cn-cat-note">Cấu hình hệ số giá cho từng loại ghế</span>
        </div>
        <div className="cn-cat-grid">
          {seatTypes.map(st => (
            <div className="cn-cat-card" key={st.id} style={{ "--cat-color": "#7c61ff" }}>
              <div className="cn-cat-icon" style={{ background: "rgba(124,97,255,0.15)", color: "#c4b5ff", fontSize: 22 }}>
                💺
              </div>
              <div className="cn-cat-info">
                <strong style={{ color: "#c4b5ff" }}>{st.name}</strong>
                <span>Hệ số giá: <strong style={{ color: "#fbbf24" }}>×{st.priceMultiplier}</strong></span>
                <span>{st.desc}</span>
              </div>
              <button className="cn-btn cn-btn-edit sm" onClick={() => openEdit("seat", st)}>Sửa</button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit modal */}
      {editItem && (
        <div className="cn-modal-overlay" onClick={() => setEditItem(null)}>
          <div className="cn-modal cn-modal-sm" onClick={e => e.stopPropagation()}>
            <div className="cn-modal-header">
              <h2>Chỉnh sửa {editItem.section === "room" ? "loại phòng" : "loại ghế"}</h2>
              <button className="cn-modal-close" onClick={() => setEditItem(null)}>✕</button>
            </div>
            <div className="cn-modal-body">
              <div className="cn-field">
                <label>Tên *</label>
                <input value={form.name || ""} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setError(""); }} />
                {error && <span className="cn-error">{error}</span>}
              </div>
              <div className="cn-field">
                <label>Mô tả</label>
                <input value={form.desc || ""} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))} />
              </div>
              {editItem.section === "seat" && (
                <div className="cn-field">
                  <label>Hệ số giá (×)</label>
                  <input type="number" step="0.1" min="1" value={form.priceMultiplier || 1} onChange={e => setForm(p => ({ ...p, priceMultiplier: Number(e.target.value) }))} />
                </div>
              )}
              {editItem.section === "room" && (
                <div className="cn-field">
                  <label>Màu đặc trưng (hex)</label>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input value={form.color || ""} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} placeholder="#7c61ff" style={{ flex: 1 }} />
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: form.color || "#7c61ff", border: "1px solid rgba(255,255,255,0.2)" }} />
                  </div>
                </div>
              )}
            </div>
            <div className="cn-modal-footer">
              <button className="cn-btn cn-btn-add cn-btn-lg" onClick={handleSave}>Lưu</button>
              <button className="cn-btn cn-btn-secondary cn-btn-lg" onClick={() => setEditItem(null)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Confirm xóa */
function DeleteConfirm({ cinema, onClose, onConfirm }) {
  if (!cinema) return null;
  return (
    <div className="cn-modal-overlay" onClick={onClose}>
      <div className="cn-modal cn-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="cn-modal-header"><h2>Xác nhận xóa rạp</h2><button className="cn-modal-close" onClick={onClose}>✕</button></div>
        <div className="cn-modal-body">
          <div className="cn-delete-warn">
            ⚠️ Bạn có chắc muốn xóa rạp <strong>"{cinema.name}"</strong>?<br />
            Toàn bộ {cinema.rooms.length} phòng chiếu và dữ liệu liên quan sẽ bị xóa vĩnh viễn.
          </div>
        </div>
        <div className="cn-modal-footer">
          <button className="cn-btn cn-btn-delete cn-btn-lg" onClick={() => onConfirm(cinema)}>Xóa rạp</button>
          <button className="cn-btn cn-btn-secondary cn-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/** Toast */
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="cn-toast">
      {message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminCinemas() {
  const [cinemas, setCinemas]     = useState(SAMPLE_CINEMAS);
  const [activeTab, setActiveTab] = useState("list");
  const [viewCinema, setViewCinema]   = useState(null);
  const [editCinema, setEditCinema]   = useState(undefined); // undefined=closed
  const [deleteCinema, setDeleteCinema] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  const handleSave = (data) => {
    if (cinemas.find(c => c.id === data.id)) {
      setCinemas(p => p.map(c => c.id === data.id ? data : c));
      showToast(`Đã cập nhật rạp "${data.name}".`);
    } else {
      setCinemas(p => [data, ...p]);
      showToast(`Đã thêm rạp "${data.name}".`);
    }
    setEditCinema(undefined);
  };

  const handleConfirmDelete = (c) => {
    setCinemas(p => p.filter(x => x.id !== c.id));
    showToast(`Đã xóa rạp "${c.name}".`);
    setDeleteCinema(null);
  };

  const handleEdit = (c) => { setViewCinema(null); setEditCinema(c); };

  const totalRooms = cinemas.reduce((s, c) => s + c.rooms.length, 0);
  const totalSeats = cinemas.reduce((s, c) => s + c.rooms.reduce((rs, r) => rs + r.totalSeats, 0), 0);

  const stats = [
    { label: "Tổng rạp",        value: cinemas.length,                                        color: "#7c61ff" },
    { label: "Đang hoạt động",  value: cinemas.filter(c => c.status === "active").length,     color: "#4ade80" },
    { label: "Tổng phòng chiếu", value: totalRooms,                                           color: "#5bcad4" },
    { label: "Tổng sức chứa",   value: totalSeats.toLocaleString(),                           color: "#fbbf24" },
  ];

  const TABS = [
    { key: "list",     label: "Danh sách rạp"    },
    { key: "category", label: "Danh mục phòng/ghế" },
  ];

  return (
    <div className="admin-cinemas-page">
      <div className="cn-page-header">
        <h2>Quản lý rạp chiếu</h2>
        <p>Quản lý thông tin rạp, phòng chiếu, loại ghế và danh mục cấu hình</p>
      </div>

      <div className="cn-stats-row">
        {stats.map(s => (
          <div className="cn-stat-pill" key={s.label}>
            <span>{s.label}</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="cn-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`cn-tab${activeTab === t.key ? " active" : ""}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "list" && (
        <CinemaList cinemas={cinemas} onView={setViewCinema} onEdit={handleEdit} onDelete={setDeleteCinema} />
      )}
      {activeTab === "category" && <CategoryTab />}

      {viewCinema   && <CinemaDetail cinema={viewCinema}   onClose={() => setViewCinema(null)}    onEdit={handleEdit} />}
      {editCinema !== undefined && <CinemaForm cinema={editCinema} onClose={() => setEditCinema(undefined)} onSave={handleSave} />}
      {deleteCinema && <DeleteConfirm cinema={deleteCinema} onClose={() => setDeleteCinema(null)} onConfirm={handleConfirmDelete} />}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
