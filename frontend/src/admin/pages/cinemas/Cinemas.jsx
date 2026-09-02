import { useEffect, useRef, useState } from "react";
import { adminCinemaService } from "../../services/adminApi";
import AdminModalPortal from "../../components/AdminModalPortal.jsx";
import "./cinemas.css";

/* ═══════════════════════════════════════════════════════════
   DATA & CONSTANTS
═══════════════════════════════════════════════════════════ */

const ROOM_TYPES = ["2D", "3D", "IMAX", "VIP"];
const SEAT_TYPES = ["Standard", "VIP", "Couple"];
const ROOM_TYPE_COLOR = {
  "2D": "#4ade80",
  "3D": "#5bcad4",
  IMAX: "#7c61ff",
  VIP: "#fbbf24",
};

// Don vi hanh chinh cap tinh hien hanh, doi chieu theo danh sach "localities"
// tren Cong TTDT Chinh phu Viet Nam.
const VIETNAM_LOCALITIES = [
  "Lai Châu",
  "Điện Biên",
  "Sơn La",
  "Phú Thọ",
  "Lào Cai",
  "Tuyên Quang",
  "Thái Nguyên",
  "Cao Bằng",
  "Lạng Sơn",
  "Quảng Ninh",
  "Bắc Ninh",
  "Hải Phòng",
  "Hà Nội",
  "Hưng Yên",
  "Ninh Bình",
  "Thanh Hóa",
  "Nghệ An",
  "Hà Tĩnh",
  "Quảng Trị",
  "Huế",
  "Đà Nẵng",
  "Quảng Ngãi",
  "Gia Lai",
  "Đắk Lắk",
  "Khánh Hòa",
  "Lâm Đồng",
  "Đồng Nai",
  "Tây Ninh",
  "TP. Hồ Chí Minh",
  "Đồng Tháp",
  "Vĩnh Long",
  "An Giang",
  "Cần Thơ",
  "Cà Mau",
];

const SAMPLE_CINEMAS = [];

const API_ORIGIN = (() => {
  const base = import.meta.env.VITE_API_URL || "/api";
  if (/^https?:\/\//i.test(base)) {
    return new URL(base).origin;
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
})();

const normalizeRoomType = (type) => (ROOM_TYPES.includes(type) ? type : "2D");

const normalizeSeatType = (type) =>
  SEAT_TYPES.includes(type) ? type : "Standard";
const VIETNAM_PHONE_REGEX = /^(03|05|07|08|09)\d{8}$/;

const removeVietnameseMarks = (value = "") =>
  String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");

const normalizeLocalityKey = (value = "") =>
  removeVietnameseMarks(value)
    .toLowerCase()
    .replace(/\b(thanh pho|tp\.?|tinh)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const LOCALITY_ALIAS_MAP = {
  "ha noi": "Hà Nội",
  hanoi: "Hà Nội",
  "hai phong": "Hải Phòng",
  haiphong: "Hải Phòng",
  "ho chi minh": "TP. Hồ Chí Minh",
  "tp ho chi minh": "TP. Hồ Chí Minh",
  "tpho chi minh": "TP. Hồ Chí Minh",
  tphcm: "TP. Hồ Chí Minh",
  "tp hcm": "TP. Hồ Chí Minh",
  hcm: "TP. Hồ Chí Minh",
  "sai gon": "TP. Hồ Chí Minh",
  saigon: "TP. Hồ Chí Minh",
  hue: "Huế",
  "thua thien hue": "Huế",
  "da nang": "Đà Nẵng",
  danang: "Đà Nẵng",
  "can tho": "Cần Thơ",
  cantho: "Cần Thơ",
};

const normalizeVietnamLocality = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalizedKey = normalizeLocalityKey(raw);
  const aliasMatch = LOCALITY_ALIAS_MAP[normalizedKey];
  if (aliasMatch) return aliasMatch;

  const matchedLocality = VIETNAM_LOCALITIES.find(
    (locality) => normalizeLocalityKey(locality) === normalizedKey,
  );

  return matchedLocality || raw;
};

const normalizeImageUrl = (image) => {
  if (!image) return "";
  if (/^(https?:\/\/|data:|blob:)/i.test(image)) return image;
  if (image.startsWith("/")) return `${API_ORIGIN}${image}`;
  return `${API_ORIGIN}/${image}`;
};

const parseSeatCode = (code = "") => {
  const match = String(code)
    .trim()
    .match(/^([A-Za-z]+)(\d+)$/);
  if (!match) return null;
  return {
    rowName: match[1].toUpperCase(),
    col: Number(match[2]),
  };
};

const getSeatRowName = (row = {}) =>
  String(row.rowName || row.row_name || "")
    .trim()
    .toUpperCase();

const getSeatRowStartNumber = (row = {}) =>
  Math.max(1, Number(row.startSeatNumber || row.startSeat || 1) || 1);

const getSeatRowEndNumber = (row = {}) => {
  const startSeatNumber = getSeatRowStartNumber(row);
  const explicitEnd = Number(row.endSeatNumber || row.endSeat || 0) || 0;
  const seatsPerRow = Math.max(
    0,
    Number(row.seatsPerRow || row.totalSeats || 0),
  );

  if (explicitEnd >= startSeatNumber) return explicitEnd;
  if (seatsPerRow <= 0) return startSeatNumber;
  return startSeatNumber + seatsPerRow - 1;
};

const buildSeatCodesForRow = (row = {}, limit) => {
  const rowName = getSeatRowName(row);
  const startSeatNumber = getSeatRowStartNumber(row);
  const endSeatNumber = getSeatRowEndNumber(row);
  const seatsPerRow = Math.max(0, endSeatNumber - startSeatNumber + 1);
  const total =
    typeof limit === "number" ? Math.min(seatsPerRow, limit) : seatsPerRow;

  if (!rowName || total <= 0) return [];

  return Array.from(
    { length: total },
    (_, index) => `${rowName}${startSeatNumber + index}`,
  );
};

const formatSeatRowRange = (row = {}) => {
  const rowName = getSeatRowName(row);
  const startSeatNumber = getSeatRowStartNumber(row);
  const endSeatNumber = getSeatRowEndNumber(row);

  if (!rowName || endSeatNumber < startSeatNumber) return "Chưa có tọa độ";

  return `${rowName}${startSeatNumber} - ${rowName}${endSeatNumber}`;
};

const sortSeatRows = (seatRows = []) =>
  [...seatRows].sort((a, b) =>
    getSeatRowName(a).localeCompare(getSeatRowName(b)),
  );

const getAlphabetRowName = (index) => {
  let current = index + 1;
  let label = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    current = Math.floor((current - 1) / 26);
  }

  return label;
};

const normalizeSeatRowsLayout = (seatRows = []) => {
  const sortedRows = sortSeatRows(seatRows);

  return sortedRows.map((row, index) => ({
    ...row,
    rowName: getAlphabetRowName(index),
  }));
};

const buildSeatRowsFromSeats = (seats = []) => {
  const grouped = seats.reduce((acc, seat) => {
    const parsed = parseSeatCode(seat.seat_code);
    if (!parsed) return acc;

    if (!acc[parsed.rowName]) {
      acc[parsed.rowName] = {
        id: `${parsed.rowName}-${seat.room_id || seat.seat_id || Date.now()}`,
        rowName: parsed.rowName,
        seatType: seat.seat_type || "Standard",
        seatsPerRow: 0,
        startSeatNumber: parsed.col,
        _minCol: parsed.col,
        _types: {},
      };
    }

    acc[parsed.rowName].seatsPerRow += 1;
    acc[parsed.rowName]._minCol = Math.min(
      acc[parsed.rowName]._minCol,
      parsed.col,
    );
    acc[parsed.rowName]._types[seat.seat_type] =
      (acc[parsed.rowName]._types[seat.seat_type] || 0) + 1;

    return acc;
  }, {});

  return Object.values(grouped)
    .map((row) => {
      const [dominantType] =
        Object.entries(row._types).sort((a, b) => b[1] - a[1])[0] || [];
      return {
        id: row.id,
        rowName: row.rowName,
        seatType: normalizeSeatType(dominantType || row.seatType),
        seatsPerRow: row.seatsPerRow,
        startSeatNumber: row._minCol || row.startSeatNumber || 1,
      };
    })
    .sort((a, b) => a.rowName.localeCompare(b.rowName));
};

const mapRoomFromApi = (room) => {
  const seats = Array.isArray(room?.seats) ? room.seats : [];
  const seatRows = buildSeatRowsFromSeats(seats);

  return {
    id: room.room_id,
    name: room.room_name || "",
    type: normalizeRoomType(room.room_type),
    status: room.status || "active",
    seatRows,
    previewGaps: normalizePreviewGaps(room.seatGaps || room.seat_gaps || []),
    totalSeats: Number(
      room.total_seat || seats.length || calcTotalSeats(seatRows),
    ),
  };
};

const mapCinemaFromApi = (cinema) => ({
  id: cinema.cinemas_id,
  name: cinema.cinema_name || "",
  address: cinema.address || "",
  city: normalizeVietnamLocality(cinema.city),
  phone: cinema.phone || "",
  image: normalizeImageUrl(cinema.image),
  imagePath: cinema.image || "",
  status: cinema.status || "active",
  rooms: Array.isArray(cinema.rooms) ? cinema.rooms.map(mapRoomFromApi) : [],
});

const toCinemaPayload = (cinema) => ({
  id: cinema.id,
  name: cinema.name.trim(),
  address: cinema.address.trim(),
  city: normalizeVietnamLocality(cinema.city),
  phone: cinema.phone.trim(),
  image: cinema.image,
  imagePath: cinema.imagePath || "",
  imageFile: cinema.imageFile || null,
  status: cinema.status || "active",
  rooms: (cinema.rooms || []).map((room) => ({
    id: room.id,
    name: room.name.trim(),
    type: normalizeRoomType(room.type),
    status: room.status || "active",
    seatGaps: normalizePreviewGaps(room.previewGaps || room.seatGaps || []).map(
      (gap) => ({
        from: Number(gap.from) || 0,
        to: Number(gap.to) || 0,
      }),
    ),
    seatRows: (room.seatRows || []).map((row) => ({
      rowName: String(row.rowName || "")
        .trim()
        .toUpperCase(),
      seatType: normalizeSeatType(row.seatType),
      seatsPerRow: Number(row.seatsPerRow) || 0,
      startSeatNumber: getSeatRowStartNumber(row),
    })),
  })),
});

const toCinemaFormData = (cinema) => {
  const payload = toCinemaPayload(cinema);
  const formData = new FormData();

  formData.append("cinema_name", payload.name);
  formData.append("address", payload.address);
  formData.append("city", payload.city);
  formData.append("phone", payload.phone);
  formData.append("status", payload.status);
  formData.append("rooms", JSON.stringify(payload.rooms));

  if (payload.imageFile instanceof File) {
    formData.append("image", payload.imageFile);
  } else {
    formData.append("image", payload.imagePath || "");
  }

  return formData;
};

const getErrorMessage = (error, fallback) => error?.message || fallback;

/* ── Helpers ── */
const CINEMA_STATUS = {
  active: { label: "Đang hoạt động", cls: "confirmed" },
  inactive: { label: "Tạm ngưng", cls: "cancelled" },
};
const ROOM_STATUS = {
  active: { label: "Hoạt động", cls: "confirmed" },
  maintenance: { label: "Bảo trì", cls: "pending" },
  inactive: { label: "Ngưng", cls: "cancelled" },
};

const calcTotalSeats = (seatRows) =>
  (seatRows || []).reduce((s, r) => s + Number(r.seatsPerRow), 0);

/* ── Toast ── */
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="cn-toast">
      {message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

/* ── Confirm ── */
function Confirm({ message, onClose, onConfirm }) {
  return (
    <AdminModalPortal>
    <div className="cn-modal-overlay" onClick={onClose}>
      <div
        className="cn-modal cn-modal-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cn-modal-header">
          <h2>Xác nhận</h2>
          <button className="cn-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="cn-modal-body">
          <div className="cn-delete-warn">⚠️ {message}</div>
        </div>
        <div className="cn-modal-footer">
          <button
            className="cn-btn cn-btn-delete cn-btn-lg"
            onClick={onConfirm}
          >
            Xóa
          </button>
          <button
            className="cn-btn cn-btn-secondary cn-btn-lg"
            onClick={onClose}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

/* ═══════════════════════════════════════════════════════════
   SEAT ROW MANAGER (inside Room form)
═══════════════════════════════════════════════════════════ */
function SeatRowManager({ seatRows, onChange }) {
  const [form, setForm] = useState({
    seatType: "Standard",
    startSeatNumber: 1,
    endSeatNumber: 10,
  });
  const [err, setErr] = useState("");
  const normalizedSeatRows = normalizeSeatRowsLayout(seatRows);
  const nextRowName = getAlphabetRowName(normalizedSeatRows.length);

  const addRow = () => {
    if (Number(form.startSeatNumber) <= 0) {
      setErr("Ghế bắt đầu phải >= 1.");
      return;
    }
    if (Number(form.endSeatNumber) < Number(form.startSeatNumber)) {
      setErr("Ghế kết thúc phải lớn hơn hoặc bằng ghế bắt đầu.");
      return;
    }

    const nextRows = normalizeSeatRowsLayout([
      ...normalizedSeatRows,
      {
        id: Date.now(),
        rowName: nextRowName,
        seatType: form.seatType,
        startSeatNumber: Number(form.startSeatNumber),
        seatsPerRow:
          Number(form.endSeatNumber) - Number(form.startSeatNumber) + 1,
      },
    ]);

    onChange(nextRows);
    setForm((p) => ({
      ...p,
      startSeatNumber: Number(form.startSeatNumber),
    }));
    setErr("");
  };

  const removeRow = (id) =>
    onChange(
      normalizeSeatRowsLayout(normalizedSeatRows.filter((r) => r.id !== id)),
    );
  const updateRowRange = (id, key, value) => {
    const numericValue = Math.max(1, Number(value) || 1);
    const nextRows = normalizedSeatRows.map((r) => {
      if (r.id !== id) return r;

      const currentStart = getSeatRowStartNumber(r);
      const currentEnd = getSeatRowEndNumber(r);
      const nextStart = key === "startSeatNumber" ? numericValue : currentStart;
      const nextEnd = key === "endSeatNumber" ? numericValue : currentEnd;

      return {
        ...r,
        startSeatNumber: nextStart,
        seatsPerRow: Math.max(1, nextEnd - nextStart + 1),
      };
    });

    onChange(normalizeSeatRowsLayout(nextRows));
  };
  const updateRow = (id, key, val) => {
    const nextRows = normalizedSeatRows.map((r) =>
      r.id === id ? { ...r, [key]: val } : r,
    );

    onChange(normalizeSeatRowsLayout(nextRows));
  };

  const totalSeats = calcTotalSeats(normalizedSeatRows);

  /* Group summary */
  const grouped = normalizedSeatRows.reduce((acc, r) => {
    acc[r.seatType] = (acc[r.seatType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="seatrow-manager">
      {/* Add row form */}
      <div className="seatrow-add-form">
        <div className="cn-field" style={{ flex: "0 0 80px" }}>
          <label>Dãy tiếp theo</label>
          <div className="seatrow-readonly-box">{nextRowName}</div>
        </div>
        <div className="cn-field" style={{ flex: 1 }}>
          <label>Loại ghế</label>
          <select
            value={form.seatType}
            onChange={(e) =>
              setForm((p) => ({ ...p, seatType: e.target.value }))
            }
          >
            {SEAT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="cn-field" style={{ flex: "0 0 110px" }}>
          <label>Ghế bắt đầu</label>
          <input
            type="number"
            min={1}
            value={form.startSeatNumber}
            onChange={(e) => {
              setForm((p) => ({ ...p, startSeatNumber: e.target.value }));
              setErr("");
            }}
          />
        </div>
        <div className="cn-field" style={{ flex: "0 0 100px" }}>
          <label>Ghế kết thúc</label>
          <input
            type="number"
            min={1}
            value={form.endSeatNumber}
            onChange={(e) => {
              setForm((p) => ({ ...p, endSeatNumber: e.target.value }));
              setErr("");
            }}
          />
        </div>
        <button
          className="cn-btn cn-btn-add"
          style={{ marginTop: 22 }}
          onClick={addRow}
        >
          + Thêm dãy
        </button>
      </div>
      {err && <span className="cn-error">{err}</span>}

      {/* Summary */}
      {seatRows.length > 0 && (
        <div className="seatrow-summary">
          <div className="seatrow-summary-total">
            Tổng: <strong>{totalSeats} ghế</strong> · {seatRows.length} dãy
          </div>
          <div className="seatrow-summary-note">
            Tên dãy tự sắp theo alphabet, còn số ghế bắt đầu chỉnh riêng từng
            dãy.
          </div>
          <div className="seatrow-summary-types">
            {Object.entries(grouped).map(([type, count]) => (
              <span key={type} className="seatrow-type-chip">
                {type}: {count} dãy
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rows table */}
      {normalizedSeatRows.length > 0 && (
        <div className="seatrow-table-wrap">
          <table className="seatrow-table">
            <thead>
              <tr>
                <th>Dãy</th>
                <th>Loại ghế</th>
                <th>Ghế bắt đầu</th>
                <th>Ghế kết thúc</th>
                <th>Tọa độ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {normalizedSeatRows.map((r) => (
                <tr key={r.id}>
                  <td className="seatrow-label-cell">{r.rowName}</td>
                  <td>
                    <select
                      className="seatrow-inline-select"
                      value={r.seatType}
                      onChange={(e) =>
                        updateRow(r.id, "seatType", e.target.value)
                      }
                    >
                      {SEAT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className="seatrow-inline-input"
                      style={{ width: 88 }}
                      value={getSeatRowStartNumber(r)}
                      onChange={(e) =>
                        updateRowRange(
                          r.id,
                          "startSeatNumber",
                          Number(e.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      className="seatrow-inline-input"
                      style={{ width: 70 }}
                      value={getSeatRowEndNumber(r)}
                      onChange={(e) =>
                        updateRowRange(
                          r.id,
                          "endSeatNumber",
                          Number(e.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <div className="seatrow-range">{formatSeatRowRange(r)}</div>
                    <div className="seatrow-preview-inline">
                      {buildSeatCodesForRow(r, 4).join(", ")}
                      {Number(r.seatsPerRow) > 4 &&
                        ` ... ${buildSeatCodesForRow(r).slice(-1)[0]}`}
                    </div>
                  </td>
                  <td>
                    <button
                      className="cn-btn cn-btn-delete sm"
                      onClick={() => removeRow(r.id)}
                    >
                      Xóa
                    </button>
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

function SeatCoordinatePreview({ seatRows, previewGaps }) {
  const rows = sortSeatRows(seatRows).map((row) => {
    const seatCodes = buildSeatCodesForRow(row);
    const seatType = normalizeSeatType(row.seatType);

    if (seatType === "Couple") {
      const units = [];
      for (let index = 0; index < seatCodes.length; index += 2) {
        const pairCodes = seatCodes.slice(index, index + 2);
        units.push({
          id: `${row.id || row.rowName}-pair-${index}`,
          type: seatType,
          codes: pairCodes,
          startNumber: parseSeatCode(pairCodes[0])?.col || 0,
          endNumber: parseSeatCode(pairCodes[pairCodes.length - 1])?.col || 0,
        });
      }
      return { ...row, previewUnits: units };
    }

    return {
      ...row,
      previewUnits: seatCodes.map((code) => ({
        id: code,
        type: seatType,
        codes: [code],
        startNumber: parseSeatCode(code)?.col || 0,
        endNumber: parseSeatCode(code)?.col || 0,
      })),
    };
  });

  if (rows.length === 0) {
    return <div className="seatcoord-empty">Chưa có dữ liệu để xem trước.</div>;
  }

  const normalizedGaps = (previewGaps || [])
    .map((gap) => ({
      from: Math.max(0, Number(gap.from) || 0),
      to: Math.max(0, Number(gap.to) || 0),
    }))
    .filter((gap) => gap.from > 0 && gap.to > gap.from)
    .sort((a, b) => a.from - b.from);
  const { minSeatNumber, maxSeatNumber } = getPreviewSeatNumberBounds(rows);
  const gapSpacerColumns = normalizedGaps.length;
  const totalSeatColumns = Math.max(1, maxSeatNumber - minSeatNumber + 1);
  const totalVisualColumns = totalSeatColumns + gapSpacerColumns;
  const getGapOffset = (seatNumber) =>
    normalizedGaps.filter((gap) => gap.to <= seatNumber).length;

  const rowsWithLayout = rows.map((row) => ({
    ...row,
    units: row.previewUnits.map((unit) => ({
      ...unit,
      span: Math.max(1, unit.endNumber - unit.startNumber + 1),
      columnStart:
        Math.max(1, unit.startNumber - minSeatNumber + 1) +
        getGapOffset(unit.startNumber),
    })),
  }));

  const maxRowWeight = Math.max(
    1,
    totalVisualColumns + Math.max(0, totalVisualColumns - 1) * 0.18,
  );

  const seatSize = Math.max(18, Math.min(34, Math.floor(540 / maxRowWeight)));
  const seatGap = Math.max(4, Math.round(seatSize * 0.22));
  const sectionGap = Math.max(12, Math.round(seatSize * 0.9));
  const labelWidth = Math.max(22, Math.round(seatSize * 0.75));
  const rowGap = Math.max(12, Math.round(seatSize * 0.45));
  const rowHeightGap = Math.max(10, Math.round(seatSize * 0.34));
  const coupleWidth = Math.round(seatSize * 2.1);
  const mapPaddingX = Math.max(12, Math.round(seatSize * 0.5));
  const mapPaddingY = Math.max(16, Math.round(seatSize * 0.6));
  const railWidth = `${Math.min(84, Math.max(58, 32 + maxRowWeight * 2.2))}%`;
  const layoutVars = {
    "--seat-size": `${seatSize}px`,
    "--seat-gap": `${seatGap}px`,
    "--seat-label-width": `${labelWidth}px`,
    "--seat-row-gap": `${rowGap}px`,
    "--seat-row-height-gap": `${rowHeightGap}px`,
    "--seat-couple-width": `${coupleWidth}px`,
    "--seat-map-padding-x": `${mapPaddingX}px`,
    "--seat-map-padding-y": `${mapPaddingY}px`,
    "--seat-rail-width": railWidth,
    "--seat-grid-columns": totalVisualColumns,
  };

  return (
    <div className="seatcoord-preview">
      <div className="seatcoord-screen-wrap">
        <div className="seatcoord-screen-glow" />
        <div className="seatcoord-screen">MÀN HÌNH</div>
        <div className="seatcoord-screen-dot" />
      </div>

      <div className="seatcoord-layout-card" style={layoutVars}>
        <div className="seatcoord-layout-rail">
          <span className="seatcoord-layout-rail-line" />
        </div>

        <div className="seatcoord-layout-map">
          {rowsWithLayout.map((row) => {
            const rowKey =
              row.id || `${getSeatRowName(row)}-${row.seatsPerRow}`;

            return (
              <div className="seatcoord-layout-row" key={rowKey}>
                <span className="seatcoord-row-label">
                  {getSeatRowName(row)}
                </span>
                <div className="seatcoord-row-sections">
                  {row.units.map((unit) => {
                    const isCouple =
                      unit.type === "Couple" && unit.codes.length >= 2;
                    const title = isCouple
                      ? `${unit.codes[0]} - ${unit.codes[unit.codes.length - 1]}`
                      : unit.codes[0];

                    return (
                      <span
                        key={unit.id}
                        className={`seatcoord-seat ${unit.type.toLowerCase()}${isCouple ? " couple" : ""}`}
                        title={title}
                        style={{
                          gridColumn: `${unit.columnStart} / span ${unit.span}`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="seatcoord-legend">
          {[
            { key: "standard", label: "Thường" },
            { key: "vip", label: "VIP" },
            { key: "couple", label: "Ghế Đôi" },
          ].map((item) => (
            <div className="seatcoord-legend-item" key={item.key}>
              <span className={`seatcoord-legend-dot ${item.key}`} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="seatcoord-summary">
          {rows.map((row) => (
            <span
              key={row.id || row.rowName}
              className="seatcoord-summary-chip"
            >
              {getSeatRowName(row)}: {formatSeatRowRange(row)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const getPreviewSeatNumberBounds = (seatRows = []) => {
  let minSeatNumber = Infinity;
  let maxSeatNumber = 0;

  seatRows.forEach((row) => {
    const startSeatNumber = getSeatRowStartNumber(row);
    const seatsPerRow = Math.max(0, Number(row.seatsPerRow || 0));
    if (seatsPerRow <= 0) return;

    minSeatNumber = Math.min(minSeatNumber, startSeatNumber);
    maxSeatNumber = Math.max(maxSeatNumber, startSeatNumber + seatsPerRow - 1);
  });

  if (!Number.isFinite(minSeatNumber) || maxSeatNumber <= 0) {
    return { minSeatNumber: 1, maxSeatNumber: 0 };
  }

  return { minSeatNumber, maxSeatNumber };
};

const createPreviewGap = () => ({
  id: `gap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  from: "",
  to: "",
});

const normalizePreviewGaps = (gaps = []) =>
  (Array.isArray(gaps) ? gaps : [])
    .map((gap, index) => {
      const from = Number(gap?.from ?? gap?.gap_from ?? 0) || 0;
      const to = Number(gap?.to ?? gap?.gap_to ?? 0) || 0;

      if (from <= 0 || to <= from) return null;

      return {
        id: gap?.id || gap?.seat_gap_id || `gap-${from}-${to}-${index}`,
        from: String(from),
        to: String(to),
      };
    })
    .filter(Boolean);

const getPreviewGapCandidates = (seatRows = []) => {
  let sharedCandidates = null;

  sortSeatRows(seatRows).forEach((row) => {
    const seatCodes = buildSeatCodesForRow(row);
    const seatType = normalizeSeatType(row.seatType);

    let units = [];

    if (seatType === "Couple") {
      for (let index = 0; index < seatCodes.length; index += 2) {
        const pairCodes = seatCodes.slice(index, index + 2);
        if (pairCodes.length === 0) continue;

        units.push({
          startNumber: parseSeatCode(pairCodes[0])?.col || 0,
          endNumber: parseSeatCode(pairCodes[pairCodes.length - 1])?.col || 0,
        });
      }
    } else {
      units = seatCodes.map((code) => ({
        startNumber: parseSeatCode(code)?.col || 0,
        endNumber: parseSeatCode(code)?.col || 0,
      }));
    }

    const rowCandidates = new Set();

    for (let index = 0; index < units.length - 1; index += 1) {
      const current = units[index];
      const next = units[index + 1];
      if (
        current.endNumber >= 2 &&
        next.startNumber === current.endNumber + 1
      ) {
        rowCandidates.add(current.endNumber);
      }
    }

    if (sharedCandidates === null) {
      sharedCandidates = rowCandidates;
      return;
    }

    sharedCandidates = new Set(
      [...sharedCandidates].filter((candidate) => rowCandidates.has(candidate)),
    );
  });

  return Array.from(sharedCandidates || []).sort((a, b) => a - b);
};

/* ═══════════════════════════════════════════════════════════
   ROOM FORM MODAL
═══════════════════════════════════════════════════════════ */
function RoomForm({ room, onClose, onSave }) {
  const isEdit = !!room;
  const modalRef = useRef(null);
  const [form, setForm] = useState(
    room
      ? {
          ...room,
          seatRows: room.seatRows.map((r) => ({ ...r })),
          previewGaps: normalizePreviewGaps(
            room.previewGaps || room.seatGaps || [],
          ),
        }
      : {
          name: "",
          type: "2D",
          status: "maintenance",
          seatRows: [],
          previewGaps: [],
        },
  );
  const [errors, setErrors] = useState({});
  const [previewGaps, setPreviewGaps] = useState(
    normalizePreviewGaps(room?.previewGaps || room?.seatGaps || []).length > 0
      ? normalizePreviewGaps(room?.previewGaps || room?.seatGaps || [])
      : [createPreviewGap()],
  );

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nhập tên phòng.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave({
      ...form,
      id: room?.id || Date.now(),
      status: form.seatRows.length === 0 ? "maintenance" : form.status,
      previewGaps: normalizePreviewGaps(previewGaps),
      totalSeats: calcTotalSeats(form.seatRows),
    });
  };

  const totalSeats = calcTotalSeats(form.seatRows);
  const rtColor = ROOM_TYPE_COLOR[form.type] || "#8fa6ff";
  const { minSeatNumber, maxSeatNumber } = getPreviewSeatNumberBounds(
    form.seatRows,
  );
  const gapFromOptions = getPreviewGapCandidates(form.seatRows);
  const updatePreviewGap = (gapId, key, value) => {
    setPreviewGaps((prev) =>
      prev.map((gap) => {
        if (gap.id !== gapId) return gap;

        if (key === "from") {
          const fromNumber = Number(value) || 0;
          const nextTo = gapFromOptions.includes(fromNumber)
            ? String(fromNumber + 1)
            : "";

          return { ...gap, from: value, to: nextTo };
        }

        return { ...gap, [key]: value };
      }),
    );
  };
  const addPreviewGap = () => {
    setPreviewGaps((prev) => [...prev, createPreviewGap()]);
  };
  const removePreviewGap = (gapId) => {
    setPreviewGaps((prev) => {
      const next = prev.filter((gap) => gap.id !== gapId);
      return next.length > 0 ? next : [createPreviewGap()];
    });
  };

  useEffect(() => {
    setPreviewGaps((prev) => {
      let changed = false;

      const next = prev.map((gap) => {
        const fromNumber = Number(gap.from) || 0;
        const nextTo = gapFromOptions.includes(fromNumber)
          ? String(fromNumber + 1)
          : "";

        const normalizedFrom =
          fromNumber === 0 || gapFromOptions.includes(fromNumber)
            ? gap.from
            : "";

        if (gap.to !== nextTo || gap.from !== normalizedFrom) {
          changed = true;
          return { ...gap, from: normalizedFrom, to: nextTo };
        }

        return gap;
      });

      return changed ? next : prev;
    });
  }, [gapFromOptions]);

  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.scrollTop = 0;
    }
  }, [room?.id, isEdit]);

  return (
    <AdminModalPortal>
    <div className="cn-modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="cn-modal cn-modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cn-modal-header">
          <h2>{isEdit ? "Chỉnh sửa phòng chiếu" : "Thêm phòng chiếu"}</h2>
          <button className="cn-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="cn-modal-body">
          {/* Room info */}
          <div className="cn-form-grid">
            <div className="cn-form-col">
              <div className="cn-field">
                <label>Tên phòng *</label>
                <input
                  className={errors.name ? "error" : ""}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="P01, P02…"
                />
                {errors.name && <span className="cn-error">{errors.name}</span>}
              </div>
              <div className="cn-field-row">
                <div className="cn-field">
                  <label>Loại phòng chiếu</label>
                  <select
                    value={form.type}
                    onChange={(e) => set("type", e.target.value)}
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="cn-field">
                  <label>Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="maintenance">Bảo trì</option>
                    <option value="inactive">Ngưng</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="cn-form-col">
              <div className="room-preview-box">
                <div
                  className="room-preview-type"
                  style={{
                    color: rtColor,
                    background: `${rtColor}18`,
                    borderColor: `${rtColor}33`,
                  }}
                >
                  {form.type}
                </div>
                <div className="room-preview-name">
                  {form.name || "Tên phòng"}
                </div>
                <div className="room-preview-seats">
                  <span>{totalSeats}</span> tổng ghế
                </div>
                <div className="room-preview-rows">
                  {form.seatRows.length} dãy ghế
                </div>
                {totalSeats === 0 && (
                  <div className="room-preview-note">
                    Phòng chưa có ghế, sẽ lưu ở trạng thái bảo trì
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seat rows */}
          <div className="cn-section-divider">
            <span>Quản lý dãy ghế</span>
          </div>
          <div className="cn-helper-text">
            Có thể để trống sơ đồ ghế. Phòng mới chưa có ghế sẽ tự chuyển sang bảo trì.
          </div>

          <SeatRowManager
            seatRows={form.seatRows}
            onChange={(rows) => setForm((p) => ({ ...p, seatRows: rows }))}
          />

          <div className="cn-section-divider">
            <span>Xem trước tọa độ ghế</span>
          </div>
          <div className="seatcoord-toolbar">
            <span className="seatcoord-toolbar-label">
              Tạo khoảng cách giữa ghế
            </span>
            <div className="seatcoord-gap-controls">
              <div className="seatcoord-gap-list">
                {previewGaps.map((gap, index) => {
                  const fromNumber = Number(gap.from) || 0;
                  const gapToOption =
                    fromNumber >= minSeatNumber && fromNumber < maxSeatNumber
                      ? String(fromNumber + 1)
                      : "";
                  const usedGapFromSet = new Set(
                    previewGaps
                      .filter((item) => item.id !== gap.id)
                      .map((item) => String(item.from || "")),
                  );
                  const availableFromOptions = gapFromOptions.filter(
                    (seatNumber) =>
                      !usedGapFromSet.has(String(seatNumber)) ||
                      String(seatNumber) === String(gap.from),
                  );

                  return (
                    <div className="seatcoord-gap-item" key={gap.id}>
                      <label className="seatcoord-gap-field">
                        <span>Từ số</span>
                        <select
                          value={gap.from}
                          onChange={(e) =>
                            updatePreviewGap(gap.id, "from", e.target.value)
                          }
                        >
                          <option value="">Chọn số</option>
                          {availableFromOptions.map((seatNumber) => (
                            <option key={seatNumber} value={seatNumber}>
                              {seatNumber}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="seatcoord-gap-field">
                        <span>Đến số</span>
                        <select value={gap.to} disabled={!gapToOption}>
                          <option value="">
                            {gap.from ? "Số kế tiếp" : "Chọn số 1 trước"}
                          </option>
                          {gapToOption ? (
                            <option value={gapToOption}>{gapToOption}</option>
                          ) : null}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="seatcoord-gap-remove"
                        onClick={() => removePreviewGap(gap.id)}
                        disabled={previewGaps.length === 1 && index === 0}
                      >
                        Xóa
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                className="seatcoord-gap-add"
                onClick={addPreviewGap}
                disabled={
                  gapFromOptions.length === 0 ||
                  previewGaps.length >= gapFromOptions.length
                }
              >
                + Thêm khoảng cách
              </button>
              <span className="seatcoord-gap-hint">
                Mỗi khoảng cách sẽ tạo một lối đi riêng. Số sau luôn là ghế liền
                kề tiếp theo.
              </span>
            </div>
          </div>
          <SeatCoordinatePreview
            seatRows={form.seatRows}
            previewGaps={previewGaps}
          />
        </div>

        <div className="cn-modal-footer">
          <button className="cn-btn cn-btn-add cn-btn-lg" onClick={handleSave}>
            {isEdit ? "Lưu thay đổi" : "Thêm phòng"}
          </button>
          <button
            className="cn-btn cn-btn-secondary cn-btn-lg"
            onClick={onClose}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

/* ═══════════════════════════════════════════════════════════
   CINEMA FORM MODAL
═══════════════════════════════════════════════════════════ */
function CinemaForm({ cinema, onClose, onSave, saving }) {
  const isEdit = !!cinema;
  const [form, setForm] = useState(
    cinema
      ? {
          ...cinema,
          rooms: cinema.rooms.map((r) => ({
            ...r,
            seatRows: r.seatRows.map((s) => ({ ...s })),
          })),
          imageFile: null,
        }
      : {
          name: "",
          address: "",
          city: "",
          phone: "",
          image: "",
          imagePath: "",
          imageFile: null,
          status: "active",
          rooms: [],
        },
  );
  const [errors, setErrors] = useState({});
  const [roomModal, setRoomModal] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [editRoomIdx, setEditRoomIdx] = useState(null);
  const [posterDrag, setPosterDrag] = useState(false);

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: undefined }));
  };

  /* Poster upload */
  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) =>
      setForm((p) => ({
        ...p,
        image: e.target.result,
        imageFile: file,
      }));
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nhập tên rạp.";
    if (!form.address.trim()) e.address = "Nhập địa chỉ.";
    if (!form.city.trim()) e.city = "Chọn tỉnh/thành.";
    if (!form.phone.trim()) e.phone = "Nhập số điện thoại.";
    else if (!VIETNAM_PHONE_REGEX.test(form.phone.trim())) {
      e.phone =
        "Số điện thoại phải gồm 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.";
    }
    return e;
  };

  const handleSaveRoom = (roomData) => {
    if (editRoomIdx === null) {
      setForm((p) => ({ ...p, rooms: [...p.rooms, roomData] }));
    } else {
      setForm((p) => ({
        ...p,
        rooms: p.rooms.map((r, i) => (i === editRoomIdx ? roomData : r)),
      }));
    }
    setRoomModal(undefined);
    setEditRoomIdx(null);
  };

  const deleteRoom = (idx) =>
    setForm((p) => ({ ...p, rooms: p.rooms.filter((_, i) => i !== idx) }));

  const openEditRoom = (idx) => {
    setEditRoomIdx(idx);
    setRoomModal(form.rooms[idx]);
  };
  const openAddRoom = () => {
    setEditRoomIdx(null);
    setRoomModal(null);
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave({
      ...form,
      id: cinema?.id,
      status: form.rooms.length === 0 ? "inactive" : form.status,
    });
  };

  return (
    <>
      <AdminModalPortal>
      <div className="cn-modal-overlay" onClick={onClose}>
        <div
          className="cn-modal cn-modal-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="cn-modal-header">
            <h2>{isEdit ? "Chỉnh sửa rạp chiếu" : "Thêm rạp mới"}</h2>
            <button className="cn-modal-close" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="cn-modal-body">
            <div className="cn-form-grid">
              {/* Col 1 – thông tin rạp */}
              <div className="cn-form-col">
                <div className="cn-field">
                  <label>Tên rạp *</label>
                  <input
                    className={errors.name ? "error" : ""}
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="Sweetstar CGV…"
                  />
                  {errors.name && (
                    <span className="cn-error">{errors.name}</span>
                  )}
                </div>
                <div className="cn-field">
                  <label>Địa chỉ *</label>
                  <input
                    className={errors.address ? "error" : ""}
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="Số nhà, đường, quận…"
                  />
                  {errors.address && (
                    <span className="cn-error">{errors.address}</span>
                  )}
                </div>
                <div className="cn-field-row">
                  <div className="cn-field">
                    <label>Thành phố *</label>
                    <select
                      className={errors.city ? "error" : ""}
                      value={form.city}
                      onChange={(e) => set("city", e.target.value)}
                    >
                      <option value="">Chọn tỉnh/thành</option>
                      {VIETNAM_LOCALITIES.map((locality) => (
                        <option key={locality} value={locality}>
                          {locality}
                        </option>
                      ))}
                    </select>
                    {errors.city && (
                      <span className="cn-error">{errors.city}</span>
                    )}
                  </div>
                  <div className="cn-field">
                    <label>Số điện thoại *</label>
                    <input
                      className={errors.phone ? "error" : ""}
                      value={form.phone}
                      onChange={(e) =>
                        set(
                          "phone",
                          e.target.value.replace(/\D/g, "").slice(0, 10),
                        )
                      }
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="03xxxxxxxx"
                    />
                    {errors.phone && (
                      <span className="cn-error">{errors.phone}</span>
                    )}
                  </div>
                </div>
                <div className="cn-field">
                  <label>Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
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
                    onDragOver={(e) => {
                      e.preventDefault();
                      setPosterDrag(true);
                    }}
                    onDragLeave={() => setPosterDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setPosterDrag(false);
                      handleImageFile(e.dataTransfer.files?.[0]);
                    }}
                    onClick={() =>
                      document.getElementById("cinema-img-input").click()
                    }
                  >
                    {form.image ? (
                      <>
                        <img
                          src={form.image}
                          alt="preview"
                          className="img-upload-preview"
                        />
                        <button
                          className="img-upload-remove"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            setForm((p) => ({
                              ...p,
                              image: "",
                              imagePath: "",
                              imageFile: null,
                            }));
                          }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <div className="img-upload-placeholder">
                        <span className="img-upload-icon">🖼</span>
                        <span>
                          Kéo thả hoặc <strong>chọn ảnh</strong>
                        </span>
                        <span className="img-upload-hint">
                          JPG, PNG – tối đa 5MB
                        </span>
                      </div>
                    )}
                  </div>
                  <input
                    id="cinema-img-input"
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => handleImageFile(e.target.files?.[0])}
                  />
                </div>
              </div>
            </div>

            {/* Rooms section */}
            <div className="cn-section-divider">
              <span>Phòng chiếu ({form.rooms.length})</span>
              <button className="cn-btn cn-btn-add sm" onClick={openAddRoom}>
                + Thêm phòng
              </button>
            </div>

            {form.rooms.length === 0 ? (
              <div className="cn-empty-rooms">
                Chưa có phòng chiếu. Nhấn "+ Thêm phòng" để thêm.
              </div>
            ) : (
              <div className="cn-rooms-edit-list">
                {form.rooms.map((room, idx) => {
                  const rtColor = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
                  const total = calcTotalSeats(room.seatRows);
                  return (
                    <div className="cn-room-edit-row" key={room.id || idx}>
                      <span
                        className="cn-type-chip sm"
                        style={{
                          color: rtColor,
                          background: `${rtColor}18`,
                          borderColor: `${rtColor}33`,
                        }}
                      >
                        {room.type}
                      </span>
                      <span className="cn-room-edit-name">{room.name}</span>
                      <span className="cn-room-edit-seats">
                        {room.seatRows.length} dãy · {total} ghế
                      </span>
                      <span
                        className={`status-pill ${ROOM_STATUS[room.status]?.cls || "confirmed"}`}
                        style={{ fontSize: 11 }}
                      >
                        {ROOM_STATUS[room.status]?.label}
                      </span>
                      <div className="cn-room-edit-actions">
                        <button
                          className="cn-btn cn-btn-edit sm"
                          onClick={() => openEditRoom(idx)}
                        >
                          Sửa
                        </button>
                        <button
                          className="cn-btn cn-btn-delete sm"
                          onClick={() => deleteRoom(idx)}
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {form.rooms.length === 0 && (
              <div className="cn-helper-text">
                Rạp chưa có phòng sẽ tự lưu ở trạng thái tạm ngưng.
              </div>
            )}
          </div>

          <div className="cn-modal-footer">
            <button
              className="cn-btn cn-btn-add cn-btn-lg"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm rạp"}
            </button>
            <button
              className="cn-btn cn-btn-secondary cn-btn-lg"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </button>
          </div>
        </div>
      </div>
      </AdminModalPortal>

      {/* Room sub-modal */}
      {roomModal !== undefined && (
        <RoomForm
          room={roomModal}
          onClose={() => {
            setRoomModal(undefined);
            setEditRoomIdx(null);
          }}
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
  const rtColor = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
  const rst = ROOM_STATUS[room.status] || ROOM_STATUS.active;
  const total = calcTotalSeats(room.seatRows);

  const grouped = room.seatRows.reduce((acc, r) => {
    if (!acc[r.seatType]) acc[r.seatType] = { rows: 0, seats: 0 };
    acc[r.seatType].rows += 1;
    acc[r.seatType].seats += Number(r.seatsPerRow);
    return acc;
  }, {});

  return (
    <div className="room-detail-card">
      <div className="room-detail-header" onClick={() => setOpen((o) => !o)}>
        <div className="room-detail-left">
          <span
            className="cn-type-chip"
            style={{
              color: rtColor,
              background: `${rtColor}18`,
              borderColor: `${rtColor}33`,
            }}
          >
            {room.type}
          </span>
          <span className="room-detail-name">{room.name}</span>
          <span className={`status-pill ${rst.cls}`} style={{ fontSize: 11 }}>
            {rst.label}
          </span>
        </div>
        <div className="room-detail-right">
          <span className="room-detail-stat">{room.seatRows.length} dãy</span>
          <span className="room-detail-stat">
            <strong>{total}</strong> ghế
          </span>
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
                <span className="rst-info">
                  {info.rows} dãy · {info.seats} ghế
                </span>
              </div>
            ))}
          </div>

          {/* Row table */}
          <table className="seatrow-table" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>Dãy</th>
                <th>Loại ghế</th>
                <th>Ghế/dãy</th>
                <th>Tên ghế</th>
              </tr>
            </thead>
            <tbody>
              {room.seatRows.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: "#d4c8ff" }}>
                    {r.rowName}
                  </td>
                  <td>
                    <span className="seatrow-type-chip">{r.seatType}</span>
                  </td>
                  <td style={{ color: "#a8baff" }}>{r.seatsPerRow} ghế</td>
                  <td style={{ color: "#7a8fc0", fontSize: 12 }}>
                    {buildSeatCodesForRow(r, 5).join(", ")}
                    {Number(r.seatsPerRow) > 5 &&
                      ` … ${buildSeatCodesForRow(r).slice(-1)[0]}`}
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
  const st = CINEMA_STATUS[cinema.status] || CINEMA_STATUS.active;
  const totalRooms = cinema.rooms.length;
  const totalSeats = cinema.rooms.reduce(
    (s, r) => s + calcTotalSeats(r.seatRows),
    0,
  );
  const activeRooms = cinema.rooms.filter((r) => r.status === "active").length;

  return (
    <AdminModalPortal>
    <div className="cn-modal-overlay" onClick={onClose}>
      <div
        className="cn-modal cn-modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cn-modal-header">
          <div>
            <h2>{cinema.name}</h2>
            <span className={`status-pill ${st.cls}`}>{st.label}</span>
          </div>
          <button className="cn-modal-close" onClick={onClose}>
            ✕
          </button>
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
              <div className="cn-detail-row">
                <span>Địa chỉ</span>
                <strong>{cinema.address}</strong>
              </div>
              <div className="cn-detail-row">
                <span>Thành phố</span>
                <strong>{cinema.city}</strong>
              </div>
              <div className="cn-detail-row">
                <span>Điện thoại</span>
                <strong>{cinema.phone}</strong>
              </div>
            </div>
            <div className="cn-detail-info-card">
              <h4>Tổng quan</h4>
              <div className="cn-detail-row">
                <span>Tổng phòng</span>
                <strong>{totalRooms}</strong>
              </div>
              <div className="cn-detail-row">
                <span>Đang hoạt động</span>
                <strong style={{ color: "#4ade80" }}>{activeRooms}</strong>
              </div>
              <div className="cn-detail-row">
                <span>Tổng sức chứa</span>
                <strong>{totalSeats.toLocaleString()} ghế</strong>
              </div>
              {/* Room type chips */}
              <div className="cn-room-types" style={{ marginTop: 12 }}>
                {[...new Set(cinema.rooms.map((r) => r.type))].map((t) => (
                  <span
                    key={t}
                    className="cn-type-chip sm"
                    style={{
                      color: ROOM_TYPE_COLOR[t],
                      background: `${ROOM_TYPE_COLOR[t]}18`,
                      borderColor: `${ROOM_TYPE_COLOR[t]}33`,
                    }}
                  >
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
            {cinema.rooms.map((room) => (
              <RoomDetailCard key={room.id} room={room} />
            ))}
          </div>
        </div>

        <div className="cn-modal-footer">
          <button
            className="cn-btn cn-btn-edit cn-btn-lg"
            onClick={() => onEdit(cinema)}
          >
            Chỉnh sửa rạp
          </button>
          <button
            className="cn-btn cn-btn-secondary cn-btn-lg"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

/* ═══════════════════════════════════════════════════════════
   CINEMA LIST
═══════════════════════════════════════════════════════════ */
function CinemaList({ cinemas, onView, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [filterCity, setFC] = useState("all");
  const [filterStatus, setFS] = useState("all");

  const cities = [...new Set(cinemas.map((c) => c.city))];
  const filtered = cinemas.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q)) &&
      (filterCity === "all" || c.city === filterCity) &&
      (filterStatus === "all" || c.status === filterStatus)
    );
  });

  return (
    <div className="cn-section">
      <div className="cn-toolbar">
        <input
          className="cn-search"
          placeholder="Tìm tên rạp, địa chỉ…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="cn-select"
          value={filterCity}
          onChange={(e) => setFC(e.target.value)}
        >
          <option value="all">Tất cả thành phố</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="cn-select"
          value={filterStatus}
          onChange={(e) => setFS(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm ngưng</option>
        </select>
        <button className="cn-btn cn-btn-add" onClick={() => onEdit(null)}>
          + Thêm rạp
        </button>
      </div>

      <div className="cn-grid">
        {filtered.length === 0 ? (
          <div className="cn-empty">Không tìm thấy rạp nào.</div>
        ) : (
          filtered.map((cinema) => {
            const st = CINEMA_STATUS[cinema.status] || CINEMA_STATUS.active;
            const totalSeats = cinema.rooms.reduce(
              (s, r) => s + calcTotalSeats(r.seatRows),
              0,
            );
            const activeRooms = cinema.rooms.filter(
              (r) => r.status === "active",
            ).length;
            return (
              <div className="cn-card" key={cinema.id}>
                <div className="cn-card-image">
                  {cinema.image ? (
                    <img src={cinema.image} alt={cinema.name} />
                  ) : (
                    <div className="cn-image-placeholder">🎭</div>
                  )}
                  <span className={`status-pill ${st.cls} cn-status-badge`}>
                    {st.label}
                  </span>
                </div>

                <div className="cn-card-body">
                  <h3 className="cn-card-name">{cinema.name}</h3>
                  <p className="cn-card-address">📍 {cinema.address}</p>
                  <p className="cn-card-phone">📞 {cinema.phone}</p>

                  <div className="cn-room-types">
                    {[...new Set(cinema.rooms.map((r) => r.type))].map((t) => (
                      <span
                        key={t}
                        className="cn-type-chip"
                        style={{
                          color: ROOM_TYPE_COLOR[t],
                          background: `${ROOM_TYPE_COLOR[t]}18`,
                          borderColor: `${ROOM_TYPE_COLOR[t]}33`,
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="cn-card-stats">
                    <div className="cn-card-stat">
                      <span>Phòng chiếu</span>
                      <strong>{cinema.rooms.length}</strong>
                    </div>
                    <div className="cn-card-stat">
                      <span>Hoạt động</span>
                      <strong style={{ color: "#4ade80" }}>
                        {activeRooms}
                      </strong>
                    </div>
                    <div className="cn-card-stat">
                      <span>Tổng ghế</span>
                      <strong>{totalSeats.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="cn-card-actions">
                    <button
                      className="cn-btn cn-btn-view"
                      onClick={() => onView(cinema)}
                    >
                      Xem chi tiết
                    </button>
                    <button
                      className="cn-btn cn-btn-edit"
                      onClick={() => onEdit(cinema)}
                    >
                      Chỉnh sửa
                    </button>
                    <button
                      className="cn-btn cn-btn-delete"
                      onClick={() => onDelete(cinema)}
                    >
                      Xóa
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="cn-footer-count">
        Hiển thị <strong>{filtered.length}</strong> / {cinemas.length} rạp
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOM OVERVIEW TAB (toàn bộ phòng của hệ thống)
═══════════════════════════════════════════════════════════ */
function RoomOverview({ cinemas, onManage }) {
  const [filterCinema, setFC] = useState("all");
  const [filterType, setFT] = useState("all");
  const [filterStatus, setFS] = useState("all");

  const allRooms = cinemas.flatMap((c) =>
    c.rooms.map((r) => ({
      ...r,
      cinemaName: c.name,
      cinemaId: c.id,
      totalSeats: calcTotalSeats(r.seatRows),
    })),
  );
  const filtered = allRooms.filter((r) => {
    const matchC =
      filterCinema === "all" || String(r.cinemaId) === filterCinema;
    const matchT = filterType === "all" || r.type === filterType;
    const matchS = filterStatus === "all" || r.status === filterStatus;
    return matchC && matchT && matchS;
  });

  return (
    <div className="cn-section">
      <div className="cn-toolbar">
        <select
          className="cn-select"
          value={filterCinema}
          onChange={(e) => setFC(e.target.value)}
        >
          <option value="all">Tất cả rạp</option>
          {cinemas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="cn-select"
          value={filterType}
          onChange={(e) => setFT(e.target.value)}
        >
          <option value="all">Tất cả loại phòng</option>
          {ROOM_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="cn-select"
          value={filterStatus}
          onChange={(e) => setFS(e.target.value)}
        >
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
              <tr>
                <td
                  colSpan={7}
                  style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}
                >
                  Không có phòng chiếu nào.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const rtColor = ROOM_TYPE_COLOR[r.type] || "#8fa6ff";
                const rst = ROOM_STATUS[r.status] || ROOM_STATUS.active;
                return (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: "#eef4ff" }}>
                      {r.name}
                    </td>
                    <td style={{ color: "#c0d0ff", fontSize: 13 }}>
                      {r.cinemaName}
                    </td>
                    <td>
                      <span
                        className="cn-type-chip"
                        style={{
                          color: rtColor,
                          background: `${rtColor}18`,
                          borderColor: `${rtColor}33`,
                        }}
                      >
                        {r.type}
                      </span>
                    </td>
                    <td style={{ color: "#a8baff" }}>
                      {r.seatRows.length} dãy
                    </td>
                    <td style={{ color: "#fbbf24", fontWeight: 700 }}>
                      {r.totalSeats} ghế
                    </td>
                    <td>
                      <span className={`status-pill ${rst.cls}`}>
                        {rst.label}
                      </span>
                    </td>
                    <td>
                      <button
                        className="cn-btn cn-btn-view"
                        onClick={() => onManage(r.cinemaId)}
                      >
                        Xem rạp
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="cn-footer-count">
        Hiển thị <strong>{filtered.length}</strong> / {allRooms.length} phòng
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SEAT OVERVIEW TAB
═══════════════════════════════════════════════════════════ */
function SeatOverview({ cinemas }) {
  const [filterCinema, setFC] = useState("all");
  const [filterRoom, setFR] = useState("all");

  const allRooms = cinemas.flatMap((c) =>
    c.rooms.map((r) => ({ ...r, cinemaName: c.name, cinemaId: c.id })),
  );
  const cinemaSel = cinemas.find((c) => String(c.id) === filterCinema);
  const roomOptions = cinemaSel ? cinemaSel.rooms : allRooms;

  const displayRooms = allRooms.filter((r) => {
    const matchC =
      filterCinema === "all" || String(r.cinemaId) === filterCinema;
    const matchR = filterRoom === "all" || String(r.id) === filterRoom;
    return matchC && matchR;
  });

  return (
    <div className="cn-section">
      <div className="cn-toolbar">
        <select
          className="cn-select"
          value={filterCinema}
          onChange={(e) => {
            setFC(e.target.value);
            setFR("all");
          }}
        >
          <option value="all">Tất cả rạp</option>
          {cinemas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="cn-select"
          value={filterRoom}
          onChange={(e) => setFR(e.target.value)}
        >
          <option value="all">Tất cả phòng</option>
          {roomOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.type})
            </option>
          ))}
        </select>
      </div>

      {displayRooms.map((room) => {
        const rtColor = ROOM_TYPE_COLOR[room.type] || "#8fa6ff";
        const total = calcTotalSeats(room.seatRows);
        const grouped = room.seatRows.reduce((acc, r) => {
          if (!acc[r.seatType]) acc[r.seatType] = { rows: 0, seats: 0 };
          acc[r.seatType].rows += 1;
          acc[r.seatType].seats += Number(r.seatsPerRow);
          return acc;
        }, {});

        return (
          <div key={room.id} className="seat-overview-block">
            <div className="seat-overview-header">
              <div className="seat-overview-title">
                <span
                  className="cn-type-chip"
                  style={{
                    color: rtColor,
                    background: `${rtColor}18`,
                    borderColor: `${rtColor}33`,
                  }}
                >
                  {room.type}
                </span>
                <strong>
                  {room.cinemaName} – {room.name}
                </strong>
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
                    <div
                      className="stb-bar"
                      style={{ width: `${(info.seats / total) * 100}%` }}
                    />
                  </div>
                  <span className="stb-info">
                    {info.rows} dãy · {info.seats} ghế (
                    {Math.round((info.seats / total) * 100)}%)
                  </span>
                </div>
              ))}
            </div>

            {/* Row table */}
            <div className="seatrow-table-wrap">
              <table className="seatrow-table">
                <thead>
                  <tr>
                    <th>Dãy</th>
                    <th>Loại ghế</th>
                    <th>Số ghế/dãy</th>
                    <th>Tên ghế trong dãy</th>
                  </tr>
                </thead>
                <tbody>
                  {room.seatRows.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, color: "#d4c8ff" }}>
                        {r.rowName}
                      </td>
                      <td>
                        <span className="seatrow-type-chip">{r.seatType}</span>
                      </td>
                      <td style={{ color: "#a8baff" }}>{r.seatsPerRow}</td>
                      <td style={{ color: "#7a8fc0", fontSize: 12 }}>
                        {buildSeatCodesForRow(r).join("  ")}
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
  const [cinemas, setCinemas] = useState(SAMPLE_CINEMAS);
  const [activeTab, setActiveTab] = useState("cinemas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [viewCinema, setViewCinema] = useState(null);
  const [editCinema, setEditCinema] = useState(undefined); // undefined=closed
  const [deleteCinema, setDeleteCinema] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const loadCinemas = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await adminCinemaService.getAllCinemas();
      setCinemas((data?.cinemas || []).map(mapCinemaFromApi));
    } catch (err) {
      setCinemas([]);
      setError(getErrorMessage(err, "Không thể tải danh sách rạp."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCinemas();
  }, []);

  const handleSave = async (data) => {
    try {
      setSaving(true);
      const payload = toCinemaFormData(data);

      if (data.id) {
        await adminCinemaService.updateCinema(data.id, payload);
        showToast(`Đã cập nhật rạp "${data.name}".`);
      } else {
        await adminCinemaService.createCinema(payload);
        showToast(`Đã thêm rạp "${data.name}".`);
      }

      setEditCinema(undefined);
      await loadCinemas();
    } catch (err) {
      showToast(getErrorMessage(err, "Không thể lưu rạp."));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async (c) => {
    try {
      setSaving(true);
      await adminCinemaService.deleteCinema(c.id);
      setDeleteCinema(null);
      setViewCinema((current) => (current?.id === c.id ? null : current));
      setCinemas((p) => p.filter((x) => x.id !== c.id));
      showToast(`Đã xóa rạp "${c.name}".`);
    } catch (err) {
      showToast(getErrorMessage(err, "Không thể xóa rạp."));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c) => {
    setViewCinema(null);
    setEditCinema(c);
  };

  const navigateToCinema = (cinemaId) => {
    setActiveTab("cinemas");
    const c = cinemas.find((x) => x.id === cinemaId);
    if (c) setViewCinema(c);
  };

  const totalRooms = cinemas.reduce((s, c) => s + c.rooms.length, 0);
  const totalSeats = cinemas.reduce(
    (s, c) => s + c.rooms.reduce((rs, r) => rs + calcTotalSeats(r.seatRows), 0),
    0,
  );

  const stats = [
    { label: "Tổng rạp", value: cinemas.length, color: "#7c61ff" },
    {
      label: "Đang hoạt động",
      value: cinemas.filter((c) => c.status === "active").length,
      color: "#4ade80",
    },
    { label: "Tổng phòng chiếu", value: totalRooms, color: "#5bcad4" },
    {
      label: "Tổng sức chứa",
      value: totalSeats.toLocaleString(),
      color: "#fbbf24",
    },
  ];

  const TABS = [
    { key: "cinemas", label: "🎭 Danh sách rạp" },
    { key: "rooms", label: "🎬 Quản lý phòng" },
    { key: "seats", label: "💺 Quản lý ghế" },
  ];

  return (
    <div className="admin-cinemas-page">
      <div className="cn-page-header">
        <div>
          <h2>Quản lý rạp chiếu</h2>
          <p>Quản lý thông tin rạp, phòng chiếu và sơ đồ ghế ngồi</p>
        </div>
        <button
          className="cn-btn cn-btn-add cn-btn-lg"
          onClick={() => setEditCinema(null)}
        >
          + Thêm rạp mới
        </button>
      </div>

      <div className="cn-stats-row">
        {stats.map((s) => (
          <div className="cn-stat-pill" key={s.label}>
            <span>{s.label}</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="cn-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`cn-tab${activeTab === t.key ? " active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="cn-section">
          <div className="cn-empty">{error}</div>
        </div>
      )}

      {loading ? (
        <div className="cn-section">
          <div className="cn-empty">Đang tải dữ liệu rạp...</div>
        </div>
      ) : (
        <>
          {activeTab === "cinemas" && (
            <CinemaList
              cinemas={cinemas}
              onView={setViewCinema}
              onEdit={handleEdit}
              onDelete={setDeleteCinema}
            />
          )}
          {activeTab === "rooms" && (
            <RoomOverview cinemas={cinemas} onManage={navigateToCinema} />
          )}
          {activeTab === "seats" && <SeatOverview cinemas={cinemas} />}
        </>
      )}

      {viewCinema && (
        <CinemaDetail
          cinema={viewCinema}
          onClose={() => setViewCinema(null)}
          onEdit={handleEdit}
        />
      )}
      {editCinema !== undefined && (
        <CinemaForm
          cinema={editCinema}
          onClose={() => setEditCinema(undefined)}
          onSave={handleSave}
          saving={saving}
        />
      )}
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
