import { useState } from "react";

/* ═══════════════════════════════════════════════════════════
   DATA & CONSTANTS
═══════════════════════════════════════════════════════════ */

const ROOM_TYPES  = ["2D", "3D", "IMAX", "4DX", "VIP"];
const SEAT_TYPES  = ["Standard", "VIP", "Couple", "Deluxe"];
const ROOM_TYPE_COLOR = { "2D": "#4ade80", "3D": "#5bcad4", IMAX: "#7c61ff", "4DX": "#f2917a", VIP: "#fbbf24" };

const SAMPLE_CINEMAS = [
  {
    id: 1,
    name: "Lunexa CGV Hà Nội",
    address: "101 Láng Hạ, Đống Đa, Hà Nội",
    city: "Hà Nội",
    phone: "024 3333 1111",
    image: "",
    status: "active",
    rooms: [
      {
        id: 1, name: "P01", type: "IMAX", status: "active",
        seatRows: [
          { id: 1, rowName: "A", seatType: "Standard", seatsPerRow: 14 },
          { id: 2, rowName: "B", seatType: "Standard", seatsPerRow: 14 },
          { id: 3, rowName: "C", seatType: "Standard", seatsPerRow: 14 },
          { id: 4, rowName: "D", seatType: "VIP",      seatsPerRow: 12 },
          { id: 5, rowName: "E", seatType: "VIP",      seatsPerRow: 12 },
          { id: 6, rowName: "F", seatType: "Couple",   seatsPerRow: 10 },
        ],
      },
      {
        id: 2, name: "P02", type: "3D", status: "active",
        seatRows: [
          { id: 7,  rowName: "A", seatType: "Standard", seatsPerRow: 12 },
          { id: 8,  rowName: "B", seatType: "Standard", seatsPerRow: 12 },
          { id: 9,  rowName: "C", seatType: "VIP",      seatsPerRow: 10 },
        ],
      },
      {
        id: 3, name: "P03", type: "2D", status: "maintenance",
        seatRows: [
          { id: 10, rowName: "A", seatType: "Standard", seatsPerRow: 15 },
          { id: 11, rowName: "B", seatType: "Standard", seatsPerRow: 15 },
          { id: 12, rowName: "C", seatType: "Standard", seatsPerRow: 15 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: "Lunexa Lotte TP.HCM",
    address: "đường Nguyễn Huệ, Q.1, TP.HCM",
    city: "TP.HCM",
    phone: "028 3333 2222",
    image: "",
    status: "active",
    rooms: [
      {
        id: 4, name: "P01", type: "IMAX", status: "active",
        seatRows: [
          { id: 13, rowName: "A", seatType: "Standard", seatsPerRow: 16 },
          { id: 14, rowName: "B", seatType: "Standard", seatsPerRow: 16 },
          { id: 15, rowName: "C", seatType: "VIP",      seatsPerRow: 12 },
          { id: 16, rowName: "D", seatType: "Couple",   seatsPerRow: 8  },
        ],
      },
      {
        id: 5, name: "P02", type: "3D", status: "active",
        seatRows: [
          { id: 17, rowName: "A", seatType: "Standard", seatsPerRow: 12 },
          { id: 18, rowName: "B", seatType: "Standard", seatsPerRow: 12 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: "Lunexa CGV Đà Nẵng",
    address: "235 Nguyễn Văn Linh, Q. Thanh Khê, Đà Nẵng",
    city: "Đà Nẵng",
    phone: "0236 3333 333",
    image: "",
    status: "active",
    rooms: [
      {
        id: 6, name: "P01", type: "2D", status: "active",
        seatRows: [
          { id: 19, rowName: "A", seatType: "Standard", seatsPerRow: 10 },
          { id: 20, rowName: "B", seatType: "Standard", seatsPerRow: 10 },
          { id: 21, rowName: "C", seatType: "Standard", seatsPerRow: 10 },
        ],
      },
      {
        id: 7, name: "P02", type: "3D", status: "active",
        seatRows: [
          { id: 22, rowName: "A", seatType: "Standard", seatsPerRow: 12 },
          { id: 23, rowName: "B", seatType: "VIP",      seatsPerRow: 10 },
        ],
      },
    ],
  },
  {
    id: 4,
    name: "Lunexa BHD TP.HCM",
    address: "633 Điện Biên Phủ, Bình Thạnh, TP.HCM",
    city: "TP.HCM",
    phone: "028 3333 4444",
    image: "",
    status: "inactive",
    rooms: [
      {
        id: 8, name: "P01", type: "VIP", status: "active",
        seatRows: [
          { id: 24, rowName: "A", seatType: "VIP",    seatsPerRow: 8 },
          { id: 25, rowName: "B", seatType: "Couple", seatsPerRow: 6 },
        ],
      },
    ],
  },
];

/* ── Helpers ── */
const CINEMA_STATUS = {
  active:   { label: "Đang hoạt động", cls: "confirmed" },
  inactive: { label: "Tạm ngưng",      cls: "cancelled" },
};
const ROOM_STATUS = {
  active:      { label: "Hoạt động", cls: "confirmed" },
  maintenance: { label: "Bảo trì",   cls: "pending"   },
  inactive:    { label: "Ngưng",     cls: "cancelled" },
};

const calcTotalSeats = (seatRows) =>
  (seatRows || []).reduce((s, r) => s + Number(r.seatsPerRow), 0);

/* ── Toast ── */
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="cn-toast">{message}<button onClick={onClose}>✕</button></div>
  );
}

/* ── Confirm ── */
function Confirm({ message, onClose, onConfirm }) {
  return (
    <div className="cn-modal-overlay" onClick={onClose}>
      <div className="cn-modal cn-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="cn-modal-header"><h2>Xác nhận</h2><button className="cn-modal-close" onClick={onClose}>✕</button></div>
        <div className="cn-modal-body"><div className="cn-delete-warn">⚠️ {message}</div></div>
        <div className="cn-modal-footer">
          <button className="cn-btn cn-btn-delete cn-btn-lg" onClick={onConfirm}>Xóa</button>
          <button className="cn-btn cn-btn-secondary cn-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SEAT ROW MANAGER (inside Room form)
═══════════════════════════════════════════════════════════ */
function SeatRowManager({ seatRows, onChange }) {
  const [form, setForm] = useState({ rowName: "", seatType: "Standard", seatsPerRow: 10 });
  const [err,  setErr]  = useState("");

  const addRow = () => {
    if (!form.rowName.trim())    { setErr("Nhập tên dãy ghế."); return; }
    if (form.seatsPerRow <= 0)   { setErr("Số ghế phải > 0.");  return; }
    if (seatRows.find(r => r.rowName.toUpperCase() === form.rowName.trim().toUpperCase())) {
      setErr("Tên dãy đã tồn tại."); return;
    }
    onChange([...seatRows, { id: Date.now(), rowName: form.rowName.trim().toUpperCase(), seatType: form.seatType, seatsPerRow: Number(form.seatsPerRow) }]);
    setForm(p => ({ ...p, rowName: "" }));
    setErr("");
  };

  const removeRow = (id) => onChange(seatRows.filter(r => r.id !== id));
  const updateRow = (id, key, val) => onChange(seatRows.map(r => r.id === id ? { ...r, [key]: val } : r));

  const totalSeats = calcTotalSeats(seatRows);

  /* Group summary */
  const grouped = seatRows.reduce((acc, r) => {
    acc[r.seatType] = (acc[r.seatType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="seatrow-manager">
      {/* Add row form */}
      <div className="seatrow-add-form">
        <div className="cn-field" style={{ flex: "0 0 80px" }}>
          <label>Tên dãy</label>
          <input maxLength={3} value={form.rowName}
            onChange={e => { setForm(p => ({ ...p, rowName: e.target.value })); setErr(""); }}
            placeholder="A, B…" />
        </div>
        <div className="cn-field" style={{ flex: 1 }}>
          <label>Loại ghế</label>
          <select value={form.seatType} onChange={e => setForm(p => ({ ...p, seatType: e.target.value }))}>
            {SEAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="cn-field" style={{ flex: "0 0 100px" }}>
          <label>Số ghế/dãy</label>
          <input type="number" min={1} value={form.seatsPerRow}
            onChange={e => { setForm(p => ({ ...p, seatsPerRow: e.target.value })); setErr(""); }} />
        </div>
        <button className="cn-btn cn-btn-add" style={{ marginTop: 22 }} onClick={addRow}>+ Thêm dãy</button>
      </div>
      {err && <span className="cn-error">{err}</span>}

      {/* Summary */}
      {seatRows.length > 0 && (
        <div className="seatrow-summary">
          <div className="seatrow-summary-total">
            Tổng: <strong>{totalSeats} ghế</strong> · {seatRows.length} dãy
          </div>
          <div className="seatrow-summary-types">
            {Object.entries(grouped).map(([type, count]) => (
              <span key={type} className="seatrow-type-chip">{type}: {count} dãy</span>
            ))}
          </div>
        </div>
      )}

      {/* Rows table */}
      {seatRows.length > 0 && (
        <div className="seatrow-table-wrap">
          <table className="seatrow-table">
            <thead>
              <tr><th>Dãy</th><th>Loại ghế</th><th>Số ghế/dãy</th><th>Tổng ghế dãy</th><th></th></tr>
            </thead>
            <tbody>
              {seatRows.map(r => (
                <tr key={r.id}>
                  <td>
                    <input className="seatrow-inline-input" value={r.rowName} maxLength={3}
                      onChange={e => updateRow(r.id, "rowName", e.target.value.toUpperCase())} />
                  </td>
                  <td>
                    <select className="seatrow-inline-select" value={r.seatType}
                      onChange={e => updateRow(r.id, "seatType", e.target.value)}>
                      {SEAT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td>
                    <input type="number" min={1} className="seatrow-inline-input" style={{ width: 70 }}
                      value={r.seatsPerRow}
                      onChange={e => updateRow(r.id, "seatsPerRow", Number(e.target.value))} />
                  </td>
                  <td style={{ color: "#a8baff", fontWeight: 600 }}>{r.seatsPerRow} ghế</td>
                  <td>
                    <button className="cn-btn cn-btn-delete sm" onClick={() => removeRow(r.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOM FORM MODAL
═══════════════════════════════════════════════════════════ */
function RoomForm({ room, onClose, onSave }) {
  const isEdit = !!room;
  const [form, setForm] = useState(room
    ? { ...room, seatRows: room.seatRows.map(r => ({ ...r })) }
    : { name: "", type: "2D", status: "active", seatRows: [] }
  );
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nhập tên phòng.";
    if (form.seatRows.length === 0) e.seatRows = "Thêm ít nhất một dãy ghế.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: room?.id || Date.now(), totalSeats: calcTotalSeats(form.seatRows) });
  };

  const totalSeats = calcTotalSeats(form.seatRows);
  const rtColor    = ROOM_TYPE_COLOR[form.type] || "#8fa6ff";

  return (
    <div className="cn-modal-overlay" onClick={onClose}>
      <div className="cn-modal cn-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="cn-modal-header">
          <h2>{isEdit ? "Chỉnh sửa phòng chiếu" : "Thêm phòng chiếu"}</h2>
          <button className="cn-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="cn-modal-body">
          {/* Room info */}
          <div className="cn-form-grid">
            <div className="cn-form-col">
              <div className="cn-field">
                <label>Tên phòng *</label>
                <input className={errors.name ? "error" : ""} value={form.name}
                  onChange={e => set("name", e.target.value)} placeholder="P01, P02…" />
                {errors.name && <span className="cn-error">{errors.name}</span>}
              </div>
              <div className="cn-field-row">
                <div className="cn-field">
                  <label>Loại phòng chiếu</label>
                  <select value={form.type} onChange={e => set("type", e.target.value)}>
                    {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="cn-field">
                  <label>Trạng thái</label>
                  <select value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="active">Hoạt động</option>
                    <option value="maintenance">Bảo trì</option>
                    <option value="inactive">Ngưng</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="cn-form-col">
              <div className="room-preview-box">
                <div className="room-preview-type" style={{ color: rtColor, background: `${rtColor}18`, borderColor: `${rtColor}33` }}>
                  {form.type}
                </div>
                <div className="room-preview-name">{form.name || "Tên phòng"}</div>
                <div className="room-preview-seats">
                  <span>{totalSeats}</span> tổng ghế
                </div>
                <div className="room-preview-rows">{form.seatRows.length} dãy ghế</div>
              </div>
            </div>
          </div>

          {/* Seat rows */}
          <div className="cn-section-divider">
            <span>Quản lý dãy ghế</span>
            {errors.seatRows && <span className="cn-error">{errors.seatRows}</span>}
          </div>

          <SeatRowManager
            seatRows={form.seatRows}
            onChange={rows => setForm(p => ({ ...p, seatRows: rows }))}
          />
        </div>

        <div className="cn-modal-footer">
          <button className="cn-btn cn-btn-add cn-btn-lg" onClick={handleSave}>
            {isEdit ? "Lưu thay đổi" : "Thêm phòng"}
          </button>
          <button className="cn-btn cn-btn-secondary cn-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CINEMA FORM MODAL
═══════════════════════════════════════════════════════════ */
function CinemaForm({ cinema, onClose, onSave }) {
  const isEdit = !!cinema;
  const [form, setForm] = useState(
    cinema
      ? { ...cinema, rooms: cinema.rooms.map(r => ({ ...r, seatRows: r.seatRows.map(s => ({ ...s })) })) }
      : { name: "", address: "", city: "", phone: "", image: "", status: "active", rooms: [] }
  );
  const [errors, setErrors]       = useState({});
  const [roomModal, setRoomModal] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [editRoomIdx, setEditRoomIdx] = useState(null);
  const [posterDrag, setPosterDrag]   = useState(false);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

  /* Poster upload */
  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = e => set("image", e.target.result);
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = "Nhập tên rạp.";
    if (!form.address.trim()) e.address = "Nhập địa chỉ.";
    if (!form.city.trim())    e.city    = "Nhập thành phố.";
    if (!form.phone.trim())   e.phone   = "Nhập số điện thoại.";
    return e;
  };

  const handleSaveRoom = (roomData) => {
    if (editRoomIdx === null) {
      setForm(p => ({ ...p, rooms: [...p.rooms, roomData] }));
    } else {
      setForm(p => ({ ...p, rooms: p.rooms.map((r, i) => i === editRoomIdx ? roomData : r) }));
    }
    setRoomModal(undefined);
    setEditRoomIdx(null);
  };

  const deleteRoom = (idx) => setForm(p => ({ ...p, rooms: p.rooms.filter((_, i) => i !== idx) }));

  const openEditRoom = (idx) => { setEditRoomIdx(idx); setRoomModal(form.rooms[idx]); };
  const openAddRoom  = ()    => { setEditRoomIdx(null); setRoomModal(null); };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: cinema?.id || Date.now() });
  };

  return (
    <>
      <div className="cn-modal-overlay" onClick={onClose}>
        <div className="cn-modal cn-modal-lg" onClick={e => e.stopPropagation()}>
          <div className="cn-modal-header">
            <h2>{isEdit ? "Chỉnh sửa rạp chiếu" : "Thêm rạp mới"}</h2>
            <button className="cn-modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="cn-modal-body">
            <div className="cn-form-grid">
              {/* Col 1 – thông tin rạp */}
              <div className="cn-form-col">
                <div className="cn-field">
                  <label>Tên rạp *</label>
                  <input className={errors.name ? "error" : ""} value={form.name}
                    onChange={e => set("name", e.target.value)} placeholder="Lunexa CGV…" />
                  {errors.name && <span className="cn-error">{errors.name}</span>}
                </div>
                <div className="cn-field">
                  <label>Địa chỉ *</label>
                  <input className={errors.address ? "error" : ""} value={form.address}
                    onChange={e => set("address", e.target.value)} placeholder="Số nhà, đường, quận…" />
                  {errors.address && <span className="cn-error">{errors.address}</span>}
                </div>
                <div className="cn-field-row">
                  <div className="cn-field">
                    <label>Thành phố *</label>
                    <input className={errors.city ? "error" : ""} value={form.city}
                      onChange={e => set("city", e.target.value)} placeholder="Hà Nội…" />
                    {errors.city && <span className="cn-error">{errors.city}</span>}
                  </div>
                  <div className="cn-field">
                    <label>Số điện thoại *</label>
                    <input className={errors.phone ? "error" : ""} value={form.phone}
                      onChange={e => set("phone", e.target.value)} placeholder="024…" />
                    {errors.phone && <span className="cn-error">{errors.phone}</span>}
                  </div>
                </div>
                <div className="cn-field">
                  <label>Trạng thái</label>
                  <select value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="active">Đang hoạt động</option>
                    <option value="inactive">Tạm ngưng</option>
                  </select>
                </div>
              </div>

              {/* Col 2 – hình ảnh */}
              <div className="cn-form-col">
                <div className="cn-field">
                  <label>Hình ảnh rạp</label>
                  <div
                    className={`img-upload-zone${posterDrag ? " drag-over" : ""}${form.image ? " has-image" : ""}`}
                    onDragOver={e => { e.preventDefault(); setPosterDrag(true); }}
                    onDragLeave={() => setPosterDrag(false)}
                    onDrop={e => { e.preventDefault(); setPosterDrag(false); handleImageFile(e.dataTransfer.files?.[0]); }}
                    onClick={() => document.getElementById("cinema-img-input").click()}
                  >
                    {form.image ? (
                      <>
                        <img src={form.image} alt="preview" className="img-upload-preview" />
                        <button className="img-upload-remove"
                          onClick={ev => { ev.stopPropagation(); set("image", ""); }}>✕</button>
                      </>
                    ) : (
                      <div className="img-upload-placeholder">
                        <span className="img-upload-icon">🖼</span>
                        <span>Kéo thả hoặc <strong>chọn ảnh</strong></span>
                        <span className="img-upload-hint">JPG, PNG – tối đa 5MB</span>
                      </div>
                    )}
                  </div>
                  <input id="cinema-img-input" type="file" accept="image/*" style={{ display: "none" }}
                    onChange={e => handleImageFile(e.target.files?.[0])} />
                </div>
              </div>
            </div>

            {/* Rooms section */}
            <div className="cn-section-divider">
              <span>Phòng chiếu ({form.rooms.length})</span>
              <button className="cn-btn cn-btn-add sm" onClick={openAddRoom}>+ Thêm phòng</button>
            </div>

            {form.rooms.length === 0 ? (
              <div className="cn-empty-rooms">Chưa có phòng chiếu. Nhấn "+ Thêm phòng" để thêm.</div>
            ) : (
              <div className="cn-rooms-edit-list">
                {form.rooms.map((room, idx) => {
                  const rtColor = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
                  const total   = calcTotalSeats(room.seatRows);
                  return (
                    <div className="cn-room-edit-row" key={room.id || idx}>
                      <span className="cn-type-chip sm" style={{ color: rtColor, background: `${rtColor}18`, borderColor: `${rtColor}33` }}>{room.type}</span>
                      <span className="cn-room-edit-name">{room.name}</span>
                      <span className="cn-room-edit-seats">{room.seatRows.length} dãy · {total} ghế</span>
                      <span className={`status-pill ${ROOM_STATUS[room.status]?.cls || "confirmed"}`} style={{ fontSize: 11 }}>
                        {ROOM_STATUS[room.status]?.label}
                      </span>
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

          <div className="cn-modal-footer">
            <button className="cn-btn cn-btn-add cn-btn-lg" onClick={handleSave}>
              {isEdit ? "Lưu thay đổi" : "Thêm rạp"}
            </button>
            <button className="cn-btn cn-btn-secondary cn-btn-lg" onClick={onClose}>Hủy</button>
          </div>
        </div>
      </div>

      {/* Room sub-modal */}
      {roomModal !== undefined && (
        <RoomForm
          room={roomModal}
          onClose={() => { setRoomModal(undefined); setEditRoomIdx(null); }}
          onSave={handleSaveRoom}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOM DETAIL VIEW (inside Cinema Detail)
═══════════════════════════════════════════════════════════ */
function RoomDetailCard({ room }) {
  const [open, setOpen] = useState(false);
  const rtColor  = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
  const rst      = ROOM_STATUS[room.status]   || ROOM_STATUS.active;
  const total    = calcTotalSeats(room.seatRows);

  const grouped = room.seatRows.reduce((acc, r) => {
    if (!acc[r.seatType]) acc[r.seatType] = { rows: 0, seats: 0 };
    acc[r.seatType].rows  += 1;
    acc[r.seatType].seats += Number(r.seatsPerRow);
    return acc;
  }, {});

  return (
    <div className="room-detail-card">
      <div className="room-detail-header" onClick={() => setOpen(o => !o)}>
        <div className="room-detail-left">
          <span className="cn-type-chip" style={{ color: rtColor, background: `${rtColor}18`, borderColor: `${rtColor}33` }}>{room.type}</span>
          <span className="room-detail-name">{room.name}</span>
          <span className={`status-pill ${rst.cls}`} style={{ fontSize: 11 }}>{rst.label}</span>
        </div>
        <div className="room-detail-right">
          <span className="room-detail-stat">{room.seatRows.length} dãy</span>
          <span className="room-detail-stat"><strong>{total}</strong> ghế</span>
          <span className="room-detail-toggle">{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {open && (
        <div className="room-detail-body">
          {/* Seat type summary */}
          <div className="room-seat-type-summary">
            {Object.entries(grouped).map(([type, info]) => (
              <div key={type} className="room-seat-type-chip">
                <span className="rst-type">{type}</span>
                <span className="rst-info">{info.rows} dãy · {info.seats} ghế</span>
              </div>
            ))}
          </div>

          {/* Row table */}
          <table className="seatrow-table" style={{ marginTop: 10 }}>
            <thead>
              <tr><th>Dãy</th><th>Loại ghế</th><th>Ghế/dãy</th><th>Tên ghế</th></tr>
            </thead>
            <tbody>
              {room.seatRows.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: "#d4c8ff" }}>{r.rowName}</td>
                  <td>
                    <span className="seatrow-type-chip">{r.seatType}</span>
                  </td>
                  <td style={{ color: "#a8baff" }}>{r.seatsPerRow} ghế</td>
                  <td style={{ color: "#7a8fc0", fontSize: 12 }}>
                    {Array.from({ length: Math.min(r.seatsPerRow, 5) }, (_, i) => `${r.rowName}${i + 1}`).join(", ")}
                    {r.seatsPerRow > 5 && ` … ${r.rowName}${r.seatsPerRow}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   CINEMA DETAIL MODAL
═══════════════════════════════════════════════════════════ */
function CinemaDetail({ cinema, onClose, onEdit }) {
  if (!cinema) return null;
  const st         = CINEMA_STATUS[cinema.status] || CINEMA_STATUS.active;
  const totalRooms = cinema.rooms.length;
  const totalSeats = cinema.rooms.reduce((s, r) => s + calcTotalSeats(r.seatRows), 0);
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
          <div className="cn-detail-info-grid">
            {/* Hình ảnh + thông tin */}
            <div className="cn-detail-info-card">
              {cinema.image && (
                <div className="cn-cinema-img-preview">
                  <img src={cinema.image} alt={cinema.name} />
                </div>
              )}
              <h4>Thông tin cơ bản</h4>
              <div className="cn-detail-row"><span>Địa chỉ</span><strong>{cinema.address}</strong></div>
              <div className="cn-detail-row"><span>Thành phố</span><strong>{cinema.city}</strong></div>
              <div className="cn-detail-row"><span>Điện thoại</span><strong>{cinema.phone}</strong></div>
            </div>
            <div className="cn-detail-info-card">
              <h4>Tổng quan</h4>
              <div className="cn-detail-row"><span>Tổng phòng</span><strong>{totalRooms}</strong></div>
              <div className="cn-detail-row"><span>Đang hoạt động</span><strong style={{ color: "#4ade80" }}>{activeRooms}</strong></div>
              <div className="cn-detail-row"><span>Tổng sức chứa</span><strong>{totalSeats.toLocaleString()} ghế</strong></div>
              {/* Room type chips */}
              <div className="cn-room-types" style={{ marginTop: 12 }}>
                {[...new Set(cinema.rooms.map(r => r.type))].map(t => (
                  <span key={t} className="cn-type-chip sm"
                    style={{ color: ROOM_TYPE_COLOR[t], background: `${ROOM_TYPE_COLOR[t]}18`, borderColor: `${ROOM_TYPE_COLOR[t]}33` }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Rooms */}
          <div className="cn-section-divider">
            <span>Phòng chiếu ({cinema.rooms.length})</span>
          </div>
          <div className="cn-rooms-detail-list">
            {cinema.rooms.map(room => (
              <RoomDetailCard key={room.id} room={room} />
            ))}
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

/* ═══════════════════════════════════════════════════════════
   CINEMA LIST
═══════════════════════════════════════════════════════════ */
function CinemaList({ cinemas, onView, onEdit, onDelete }) {
  const [search,       setSearch] = useState("");
  const [filterCity,   setFC]     = useState("all");
  const [filterStatus, setFS]     = useState("all");

  const cities   = [...new Set(cinemas.map(c => c.city))];
  const filtered = cinemas.filter(c => {
    const q = search.toLowerCase();
    return (
      (c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)) &&
      (filterCity   === "all" || c.city   === filterCity) &&
      (filterStatus === "all" || c.status === filterStatus)
    );
  });

  return (
    <div className="cn-section">
      <div className="cn-toolbar">
        <input className="cn-search" placeholder="Tìm tên rạp, địa chỉ…"
          value={search} onChange={e => setSearch(e.target.value)} />
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
          const st         = CINEMA_STATUS[cinema.status] || CINEMA_STATUS.active;
          const totalSeats = cinema.rooms.reduce((s, r) => s + calcTotalSeats(r.seatRows), 0);
          const activeRooms = cinema.rooms.filter(r => r.status === "active").length;
          return (
            <div className="cn-card" key={cinema.id}>
              <div className="cn-card-image">
                {cinema.image
                  ? <img src={cinema.image} alt={cinema.name} />
                  : <div className="cn-image-placeholder">🎭</div>
                }
                <span className={`status-pill ${st.cls} cn-status-badge`}>{st.label}</span>
              </div>

              <div className="cn-card-body">
                <h3 className="cn-card-name">{cinema.name}</h3>
                <p className="cn-card-address">📍 {cinema.address}</p>
                <p className="cn-card-phone">📞 {cinema.phone}</p>

                <div className="cn-room-types">
                  {[...new Set(cinema.rooms.map(r => r.type))].map(t => (
                    <span key={t} className="cn-type-chip"
                      style={{ color: ROOM_TYPE_COLOR[t], background: `${ROOM_TYPE_COLOR[t]}18`, borderColor: `${ROOM_TYPE_COLOR[t]}33` }}>
                      {t}
                    </span>
                  ))}
                </div>

                <div className="cn-card-stats">
                  <div className="cn-card-stat"><span>Phòng chiếu</span><strong>{cinema.rooms.length}</strong></div>
                  <div className="cn-card-stat"><span>Hoạt động</span><strong style={{ color: "#4ade80" }}>{activeRooms}</strong></div>
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

/* ═══════════════════════════════════════════════════════════
   ROOM OVERVIEW TAB (toàn bộ phòng của hệ thống)
═══════════════════════════════════════════════════════════ */
function RoomOverview({ cinemas, onManage }) {
  const [filterCinema, setFC] = useState("all");
  const [filterType,   setFT] = useState("all");
  const [filterStatus, setFS] = useState("all");

  const allRooms = cinemas.flatMap(c =>
    c.rooms.map(r => ({ ...r, cinemaName: c.name, cinemaId: c.id, totalSeats: calcTotalSeats(r.seatRows) }))
  );
  const filtered = allRooms.filter(r => {
    const matchC = filterCinema === "all" || String(r.cinemaId) === filterCinema;
    const matchT = filterType   === "all" || r.type   === filterType;
    const matchS = filterStatus === "all" || r.status === filterStatus;
    return matchC && matchT && matchS;
  });

  return (
    <div className="cn-section">
      <div className="cn-toolbar">
        <select className="cn-select" value={filterCinema} onChange={e => setFC(e.target.value)}>
          <option value="all">Tất cả rạp</option>
          {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="cn-select" value={filterType} onChange={e => setFT(e.target.value)}>
          <option value="all">Tất cả loại phòng</option>
          {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="cn-select" value={filterStatus} onChange={e => setFS(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="maintenance">Bảo trì</option>
          <option value="inactive">Ngưng</option>
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Tên phòng</th>
              <th>Rạp</th>
              <th>Loại phòng</th>
              <th>Số dãy ghế</th>
              <th>Tổng ghế</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}>Không có phòng chiếu nào.</td></tr>
            ) : filtered.map(r => {
              const rtColor = ROOM_TYPE_COLOR[r.type] || "#8fa6ff";
              const rst     = ROOM_STATUS[r.status]   || ROOM_STATUS.active;
              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: "#eef4ff" }}>{r.name}</td>
                  <td style={{ color: "#c0d0ff", fontSize: 13 }}>{r.cinemaName}</td>
                  <td>
                    <span className="cn-type-chip"
                      style={{ color: rtColor, background: `${rtColor}18`, borderColor: `${rtColor}33` }}>
                      {r.type}
                    </span>
                  </td>
                  <td style={{ color: "#a8baff" }}>{r.seatRows.length} dãy</td>
                  <td style={{ color: "#fbbf24", fontWeight: 700 }}>{r.totalSeats} ghế</td>
                  <td><span className={`status-pill ${rst.cls}`}>{rst.label}</span></td>
                  <td>
                    <button className="cn-btn cn-btn-view" onClick={() => onManage(r.cinemaId)}>
                      Xem rạp
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cn-footer-count">Hiển thị <strong>{filtered.length}</strong> / {allRooms.length} phòng</div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SEAT OVERVIEW TAB
═══════════════════════════════════════════════════════════ */
function SeatOverview({ cinemas }) {
  const [filterCinema, setFC] = useState("all");
  const [filterRoom,   setFR] = useState("all");

  const allRooms = cinemas.flatMap(c =>
    c.rooms.map(r => ({ ...r, cinemaName: c.name, cinemaId: c.id }))
  );
  const cinemaSel   = cinemas.find(c => String(c.id) === filterCinema);
  const roomOptions = cinemaSel ? cinemaSel.rooms : allRooms;

  const displayRooms = allRooms.filter(r => {
    const matchC = filterCinema === "all" || String(r.cinemaId) === filterCinema;
    const matchR = filterRoom   === "all" || String(r.id)       === filterRoom;
    return matchC && matchR;
  });

  return (
    <div className="cn-section">
      <div className="cn-toolbar">
        <select className="cn-select" value={filterCinema}
          onChange={e => { setFC(e.target.value); setFR("all"); }}>
          <option value="all">Tất cả rạp</option>
          {cinemas.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="cn-select" value={filterRoom} onChange={e => setFR(e.target.value)}>
          <option value="all">Tất cả phòng</option>
          {roomOptions.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
        </select>
      </div>

      {displayRooms.map(room => {
        const rtColor = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
        const total   = calcTotalSeats(room.seatRows);
        const grouped = room.seatRows.reduce((acc, r) => {
          if (!acc[r.seatType]) acc[r.seatType] = { rows: 0, seats: 0 };
          acc[r.seatType].rows  += 1;
          acc[r.seatType].seats += Number(r.seatsPerRow);
          return acc;
        }, {});

        return (
          <div key={room.id} className="seat-overview-block">
            <div className="seat-overview-header">
              <div className="seat-overview-title">
                <span className="cn-type-chip"
                  style={{ color: rtColor, background: `${rtColor}18`, borderColor: `${rtColor}33` }}>
                  {room.type}
                </span>
                <strong>{room.cinemaName} – {room.name}</strong>
              </div>
              <div className="seat-overview-meta">
                <span>{room.seatRows.length} dãy</span>
                <span>·</span>
                <strong style={{ color: "#fbbf24" }}>{total} ghế</strong>
              </div>
            </div>

            {/* Seat type breakdown */}
            <div className="seat-type-breakdown">
              {Object.entries(grouped).map(([type, info]) => (
                <div key={type} className="seat-type-bar-row">
                  <span className="stb-type">{type}</span>
                  <div className="stb-bar-wrap">
                    <div className="stb-bar" style={{ width: `${(info.seats / total) * 100}%` }} />
                  </div>
                  <span className="stb-info">{info.rows} dãy · {info.seats} ghế ({Math.round((info.seats / total) * 100)}%)</span>
                </div>
              ))}
            </div>

            {/* Row table */}
            <div className="seatrow-table-wrap">
              <table className="seatrow-table">
                <thead>
                  <tr><th>Dãy</th><th>Loại ghế</th><th>Số ghế/dãy</th><th>Tên ghế trong dãy</th></tr>
                </thead>
                <tbody>
                  {room.seatRows.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: "#d4c8ff" }}>{r.rowName}</td>
                      <td><span className="seatrow-type-chip">{r.seatType}</span></td>
                      <td style={{ color: "#a8baff" }}>{r.seatsPerRow}</td>
                      <td style={{ color: "#7a8fc0", fontSize: 12 }}>
                        {Array.from({ length: r.seatsPerRow }, (_, i) => `${r.rowName}${i + 1}`).join("  ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {displayRooms.length === 0 && (
        <div className="cn-empty">Không có dữ liệu ghế.</div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════ */
export default function AdminCinemas() {
  const [cinemas,    setCinemas]    = useState(SAMPLE_CINEMAS);
  const [activeTab,  setActiveTab]  = useState("cinemas");

  const [viewCinema,   setViewCinema]   = useState(null);
  const [editCinema,   setEditCinema]   = useState(undefined); // undefined=closed
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

  const navigateToCinema = (cinemaId) => {
    setActiveTab("cinemas");
    const c = cinemas.find(x => x.id === cinemaId);
    if (c) setViewCinema(c);
  };

  const totalRooms = cinemas.reduce((s, c) => s + c.rooms.length, 0);
  const totalSeats = cinemas.reduce((s, c) => s + c.rooms.reduce((rs, r) => rs + calcTotalSeats(r.seatRows), 0), 0);

  const stats = [
    { label: "Tổng rạp",         value: cinemas.length,                                     color: "#7c61ff" },
    { label: "Đang hoạt động",   value: cinemas.filter(c => c.status === "active").length,   color: "#4ade80" },
    { label: "Tổng phòng chiếu", value: totalRooms,                                          color: "#5bcad4" },
    { label: "Tổng sức chứa",    value: totalSeats.toLocaleString(),                         color: "#fbbf24" },
  ];

  const TABS = [
    { key: "cinemas", label: "🎭 Danh sách rạp"   },
    { key: "rooms",   label: "🎬 Quản lý phòng"   },
    { key: "seats",   label: "💺 Quản lý ghế"     },
  ];

  return (
    <div className="admin-cinemas-page">
      <div className="cn-page-header">
        <div>
          <h2>Quản lý rạp chiếu</h2>
          <p>Quản lý thông tin rạp, phòng chiếu và sơ đồ ghế ngồi</p>
        </div>
        <button className="cn-btn cn-btn-add cn-btn-lg" onClick={() => setEditCinema(null)}>
          + Thêm rạp mới
        </button>
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

      {activeTab === "cinemas" && (
        <CinemaList cinemas={cinemas} onView={setViewCinema} onEdit={handleEdit} onDelete={setDeleteCinema} />
      )}
      {activeTab === "rooms" && (
        <RoomOverview cinemas={cinemas} onManage={navigateToCinema} />
      )}
      {activeTab === "seats" && (
        <SeatOverview cinemas={cinemas} />
      )}

      {viewCinema   && <CinemaDetail cinema={viewCinema} onClose={() => setViewCinema(null)} onEdit={handleEdit} />}
      {editCinema  !== undefined && <CinemaForm cinema={editCinema} onClose={() => setEditCinema(undefined)} onSave={handleSave} />}
      {deleteCinema && (
        <Confirm
          message={`Bạn có chắc muốn xóa rạp "${deleteCinema.name}"? Toàn bộ ${deleteCinema.rooms.length} phòng chiếu sẽ bị xóa.`}
          onClose={() => setDeleteCinema(null)}
          onConfirm={() => handleConfirmDelete(deleteCinema)}
        />
      )}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
