import { useState } from "react";
import './bookings.css';

// ─── Sample Data ──────────────────────────────────────────────────────────────
const sampleBookings = [
  {
    id: "B0087",
    orderId: "ORD001",
    user: "Nguyen Van An",
    email: "an.nguyen@email.com",
    phone: "0901234567",
    movie: "Đêm Thiên Cầu",
    cinema: "Lunexa CGV Hà Nội",
    room: "Phòng 3D - P03",
    showtime: "08/06/2026 19:30",
    seats: ["B5", "B6"],
    combo: "Combo Đôi (Bắp + 2 Nước)",
    totalAmount: 250000,
    paymentMethod: "VNPay",
    paymentStatus: "paid",
    status: "confirmed",
    bookingCode: "LNX-2026-0087",
    qrCode: "QR_LNX_0087",
    checkInTime: null,
    createdAt: "07/06/2026 14:22",
  },
  {
    id: "B0091",
    orderId: "ORD002",
    user: "Tran Thi Binh",
    email: "binh.tran@email.com",
    phone: "0912345678",
    movie: "Tiếng vọng im lặng",
    cinema: "Lunexa Lotte TP.HCM",
    room: "Phòng IMAX - P01",
    showtime: "09/06/2026 21:00",
    seats: ["D3"],
    combo: null,
    totalAmount: 120000,
    paymentMethod: "MoMo",
    paymentStatus: "pending",
    status: "pending",
    bookingCode: "LNX-2026-0091",
    qrCode: "QR_LNX_0091",
    checkInTime: null,
    createdAt: "07/06/2026 16:05",
  },
  {
    id: "B0095",
    orderId: "ORD003",
    user: "Le Minh Chi",
    email: "chi.le@email.com",
    phone: "0923456789",
    movie: "Hỗn loạn Tokyo",
    cinema: "Lunexa CGV Đà Nẵng",
    room: "Phòng 2D - P02",
    showtime: "09/06/2026 15:15",
    seats: ["A1", "A2", "A3"],
    combo: "Combo Gia Đình (2 Bắp + 4 Nước)",
    totalAmount: 390000,
    paymentMethod: "Thẻ ngân hàng",
    paymentStatus: "failed",
    status: "cancelled",
    bookingCode: "LNX-2026-0095",
    qrCode: "QR_LNX_0095",
    checkInTime: null,
    createdAt: "06/06/2026 10:30",
  },
  {
    id: "B0102",
    orderId: "ORD004",
    user: "Pham Duc Hung",
    email: "hung.pham@email.com",
    phone: "0934567890",
    movie: "Đêm Thiên Cầu",
    cinema: "Lunexa CGV Hà Nội",
    room: "Phòng VIP - P05",
    showtime: "10/06/2026 20:00",
    seats: ["G7", "G8"],
    combo: "Combo VIP (Bắp Lớn + 2 Nước)",
    totalAmount: 480000,
    paymentMethod: "VNPay",
    paymentStatus: "paid",
    status: "confirmed",
    bookingCode: "LNX-2026-0102",
    qrCode: "QR_LNX_0102",
    checkInTime: "10/06/2026 19:55",
    createdAt: "08/06/2026 09:15",
  },
  {
    id: "B0110",
    orderId: "ORD005",
    user: "Nguyen Thi Lan",
    email: "lan.nguyen@email.com",
    phone: "0945678901",
    movie: "Ánh Sao Cuối Trời",
    cinema: "Lunexa BHD TP.HCM",
    room: "Phòng 3D - P04",
    showtime: "11/06/2026 17:45",
    seats: ["C4", "C5"],
    combo: "Combo Đôi (Bắp + 2 Nước)",
    totalAmount: 280000,
    paymentMethod: "ZaloPay",
    paymentStatus: "paid",
    status: "completed",
    bookingCode: "LNX-2026-0110",
    qrCode: "QR_LNX_0110",
    checkInTime: "11/06/2026 17:40",
    createdAt: "09/06/2026 11:00",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  pending:   { label: "Đang chờ",    cls: "pending"   },
  confirmed: { label: "Đã xác nhận", cls: "confirmed" },
  completed: { label: "Hoàn thành",  cls: "completed" },
  cancelled: { label: "Đã hủy",     cls: "cancelled" },
  refunded:  { label: "Đã hoàn",    cls: "refunded"  },
};

const PAYMENT_MAP = {
  paid:    { label: "Đã thanh toán", cls: "pay-paid"    },
  pending: { label: "Chờ thanh toán", cls: "pay-pending" },
  failed:  { label: "Thất bại",      cls: "pay-failed"  },
};

function formatMoney(n) {
  return n?.toLocaleString("vi-VN") + " ₫";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Danh sách vé */
function BookingList({ bookings, onView, onRefund, onCheck }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    const matchSearch =
      b.id.toLowerCase().includes(q) ||
      b.user.toLowerCase().includes(q) ||
      b.movie.toLowerCase().includes(q) ||
      b.bookingCode.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="bk-section">
      {/* Toolbar */}
      <div className="bk-toolbar">
        <input
          className="bk-search"
          placeholder="Tìm mã vé, tên khách, phim…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="bk-filter-select"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Đang chờ</option>
          <option value="confirmed">Đã xác nhận</option>
          <option value="completed">Hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
          <option value="refunded">Đã hoàn</option>
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Mã vé</th>
              <th>Khách hàng</th>
              <th>Phim</th>
              <th>Suất chiếu</th>
              <th>Ghế</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Thanh toán</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", color: "#8fa6ff", padding: "32px" }}>
                  Không tìm thấy vé nào.
                </td>
              </tr>
            ) : (
              filtered.map((b) => {
                const st = STATUS_MAP[b.status] || { label: b.status, cls: "pending" };
                const py = PAYMENT_MAP[b.paymentStatus] || { label: b.paymentStatus, cls: "pay-pending" };
                return (
                  <tr key={b.id}>
                    <td>
                      <span className="bk-code">{b.bookingCode}</span>
                    </td>
                    <td>
                      <div className="bk-user-cell">
                        <strong>{b.user}</strong>
                        <span>{b.phone}</span>
                      </div>
                    </td>
                    <td>{b.movie}</td>
                    <td>{b.showtime}</td>
                    <td>{b.seats.join(", ")}</td>
                    <td>{formatMoney(b.totalAmount)}</td>
                    <td>
                      <span className={`status-pill ${st.cls}`}>{st.label}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${py.cls}`}>{py.label}</span>
                    </td>
                    <td>
                      <div className="bk-actions">
                        <button className="bk-btn bk-btn-view" onClick={() => onView(b)} title="Chi tiết">
                          Chi tiết
                        </button>
                        {(b.status === "confirmed" || b.status === "pending") && (
                          <button className="bk-btn bk-btn-refund" onClick={() => onRefund(b)} title="Hoàn vé">
                            Hoàn vé
                          </button>
                        )}
                        {b.status === "confirmed" && (
                          <button className="bk-btn bk-btn-check" onClick={() => onCheck(b)} title="Kiểm tra vé">
                            Kiểm tra
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="bk-footer-count">
        Hiển thị <strong>{filtered.length}</strong> / {bookings.length} vé
      </div>
    </div>
  );
}

/** Chi tiết vé */
function BookingDetail({ booking, onClose, onRefund, onCheck }) {
  if (!booking) return null;
  const st = STATUS_MAP[booking.status] || { label: booking.status, cls: "pending" };
  const py = PAYMENT_MAP[booking.paymentStatus] || { label: booking.paymentStatus, cls: "pay-pending" };

  return (
    <div className="bk-modal-overlay" onClick={onClose}>
      <div className="bk-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bk-modal-header">
          <div>
            <h2>Chi tiết vé</h2>
            <span className="bk-booking-code">{booking.bookingCode}</span>
          </div>
          <button className="bk-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bk-modal-body">
          {/* Trạng thái */}
          <div className="bk-detail-status-row">
            <span className={`status-pill ${st.cls}`} style={{ fontSize: 14, padding: "8px 16px" }}>
              {st.label}
            </span>
            <span className={`status-pill ${py.cls}`} style={{ fontSize: 14, padding: "8px 16px" }}>
              {py.label}
            </span>
            {booking.checkInTime && (
              <span className="bk-checkin-badge">✓ Check-in: {booking.checkInTime}</span>
            )}
          </div>

          <div className="bk-detail-grid">
            {/* Khách hàng */}
            <div className="bk-detail-card">
              <h4>Thông tin khách hàng</h4>
              <div className="bk-detail-row"><span>Họ tên</span><strong>{booking.user}</strong></div>
              <div className="bk-detail-row"><span>Email</span><strong>{booking.email}</strong></div>
              <div className="bk-detail-row"><span>Điện thoại</span><strong>{booking.phone}</strong></div>
            </div>

            {/* Phim & Suất chiếu */}
            <div className="bk-detail-card">
              <h4>Thông tin đặt vé</h4>
              <div className="bk-detail-row"><span>Phim</span><strong>{booking.movie}</strong></div>
              <div className="bk-detail-row"><span>Rạp</span><strong>{booking.cinema}</strong></div>
              <div className="bk-detail-row"><span>Phòng chiếu</span><strong>{booking.room}</strong></div>
              <div className="bk-detail-row"><span>Suất chiếu</span><strong>{booking.showtime}</strong></div>
              <div className="bk-detail-row"><span>Ghế ngồi</span><strong>{booking.seats.join(", ")}</strong></div>
              {booking.combo && (
                <div className="bk-detail-row"><span>Combo</span><strong>{booking.combo}</strong></div>
              )}
            </div>

            {/* Thanh toán */}
            <div className="bk-detail-card">
              <h4>Thông tin thanh toán</h4>
              <div className="bk-detail-row"><span>Phương thức</span><strong>{booking.paymentMethod}</strong></div>
              <div className="bk-detail-row"><span>Tổng tiền</span><strong className="bk-amount">{formatMoney(booking.totalAmount)}</strong></div>
              <div className="bk-detail-row"><span>Ngày đặt</span><strong>{booking.createdAt}</strong></div>
            </div>

            {/* QR Code */}
            <div className="bk-detail-card bk-qr-card">
              <h4>Mã QR vé</h4>
              <div className="bk-qr-box">
                <div className="bk-qr-mock">
                  <svg viewBox="0 0 80 80" width="120" height="120">
                    <rect width="80" height="80" fill="none"/>
                    {/* QR mock pattern */}
                    {[0,1,2,3,4,5,6].map(r =>
                      [0,1,2,3,4,5,6].map(c => {
                        const inTopLeft = r < 3 && c < 3;
                        const inTopRight = r < 3 && c > 3;
                        const inBottomLeft = r > 3 && c < 3;
                        const fill = (inTopLeft || inTopRight || inBottomLeft || ((r + c) % 2 === 0))
                          ? "rgba(200,210,255,0.9)" : "transparent";
                        return <rect key={`${r}-${c}`} x={c*11+1} y={r*11+1} width={9} height={9} fill={fill} rx={1}/>;
                      })
                    )}
                  </svg>
                </div>
                <p className="bk-qr-label">{booking.qrCode}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="bk-modal-footer">
          {(booking.status === "confirmed" || booking.status === "pending") && (
            <button className="bk-btn bk-btn-refund bk-btn-lg" onClick={() => onRefund(booking)}>
              Hoàn vé
            </button>
          )}
          {booking.status === "confirmed" && (
            <button className="bk-btn bk-btn-check bk-btn-lg" onClick={() => onCheck(booking)}>
              Kiểm tra vé
            </button>
          )}
          <button className="bk-btn bk-btn-secondary bk-btn-lg" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/** Hoàn vé */
function RefundModal({ booking, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState("original");
  const [error, setError] = useState("");

  if (!booking) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do hoàn vé.");
      return;
    }
    onConfirm({ booking, reason, refundMethod });
  };

  return (
    <div className="bk-modal-overlay" onClick={onClose}>
      <div className="bk-modal bk-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="bk-modal-header">
          <div>
            <h2>Hoàn vé</h2>
            <span className="bk-booking-code">{booking.bookingCode}</span>
          </div>
          <button className="bk-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bk-modal-body">
          <div className="bk-refund-info">
            <div className="bk-detail-row"><span>Khách hàng</span><strong>{booking.user}</strong></div>
            <div className="bk-detail-row"><span>Phim</span><strong>{booking.movie}</strong></div>
            <div className="bk-detail-row"><span>Suất chiếu</span><strong>{booking.showtime}</strong></div>
            <div className="bk-detail-row"><span>Ghế</span><strong>{booking.seats.join(", ")}</strong></div>
            <div className="bk-detail-row">
              <span>Số tiền hoàn</span>
              <strong className="bk-amount">{formatMoney(booking.totalAmount)}</strong>
            </div>
          </div>

          <div className="bk-refund-warn">
            ⚠️ Sau khi hoàn vé, hành động này không thể khôi phục. Vé sẽ bị hủy và khách hàng sẽ được hoàn tiền.
          </div>

          <div className="field-group" style={{ marginTop: 18 }}>
            <label>Lý do hoàn vé *</label>
            <textarea
              className="bk-textarea"
              rows={3}
              placeholder="Nhập lý do hoàn vé…"
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }}
            />
            {error && <span className="bk-error">{error}</span>}
          </div>

          <div className="field-group">
            <label>Phương thức hoàn tiền</label>
            <select
              className="bk-filter-select"
              style={{ width: "100%" }}
              value={refundMethod}
              onChange={(e) => setRefundMethod(e.target.value)}
            >
              <option value="original">Hoàn về {booking.paymentMethod}</option>
              <option value="wallet">Hoàn về ví Lunexa</option>
              <option value="points">Cộng điểm thưởng</option>
            </select>
          </div>
        </div>

        <div className="bk-modal-footer">
          <button className="bk-btn bk-btn-refund bk-btn-lg" onClick={handleSubmit}>
            Xác nhận hoàn vé
          </button>
          <button className="bk-btn bk-btn-secondary bk-btn-lg" onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

/** Kiểm tra vé */
function CheckModal({ booking, onClose, onConfirm }) {
  const [code, setCode] = useState("");
  const [checkResult, setCheckResult] = useState(null);

  if (!booking) return null;

  const handleVerify = () => {
    // Simulate verification against booking code or QR code
    const isValid =
      code.trim().toUpperCase() === booking.bookingCode.toUpperCase() ||
      code.trim().toUpperCase() === booking.qrCode.toUpperCase();

    setCheckResult({
      valid: isValid,
      alreadyUsed: booking.checkInTime !== null,
    });
  };

  const handleCheckIn = () => {
    onConfirm(booking);
  };

  const st = STATUS_MAP[booking.status] || { label: booking.status, cls: "pending" };

  return (
    <div className="bk-modal-overlay" onClick={onClose}>
      <div className="bk-modal bk-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="bk-modal-header">
          <div>
            <h2>Kiểm tra vé</h2>
            <span className="bk-booking-code">{booking.bookingCode}</span>
          </div>
          <button className="bk-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="bk-modal-body">
          {/* Thông tin vé */}
          <div className="bk-check-info">
            <div className="bk-detail-row"><span>Khách hàng</span><strong>{booking.user}</strong></div>
            <div className="bk-detail-row"><span>Phim</span><strong>{booking.movie}</strong></div>
            <div className="bk-detail-row"><span>Suất chiếu</span><strong>{booking.showtime}</strong></div>
            <div className="bk-detail-row"><span>Ghế</span><strong>{booking.seats.join(", ")}</strong></div>
            <div className="bk-detail-row">
              <span>Trạng thái</span>
              <span className={`status-pill ${st.cls}`}>{st.label}</span>
            </div>
            {booking.checkInTime && (
              <div className="bk-detail-row">
                <span>Đã check-in lúc</span>
                <strong className="bk-checkin-badge">{booking.checkInTime}</strong>
              </div>
            )}
          </div>

          {/* Nhập mã kiểm tra */}
          <div className="field-group" style={{ marginTop: 18 }}>
            <label>Nhập mã vé hoặc quét QR</label>
            <div className="bk-check-input-row">
              <input
                className="bk-search"
                style={{ flex: 1 }}
                placeholder="Mã vé hoặc mã QR…"
                value={code}
                onChange={(e) => { setCode(e.target.value); setCheckResult(null); }}
                onKeyDown={(e) => e.key === "Enter" && handleVerify()}
              />
              <button className="bk-btn bk-btn-view" onClick={handleVerify}>
                Xác minh
              </button>
            </div>
          </div>

          {/* Kết quả kiểm tra */}
          {checkResult && (
            <div className={`bk-check-result ${checkResult.alreadyUsed ? "used" : checkResult.valid ? "valid" : "invalid"}`}>
              {checkResult.alreadyUsed ? (
                <>⚠️ Vé này đã được sử dụng vào lúc <strong>{booking.checkInTime}</strong>.</>
              ) : checkResult.valid ? (
                <>✓ Vé hợp lệ! Có thể tiến hành check-in.</>
              ) : (
                <>✗ Mã không khớp. Vui lòng kiểm tra lại.</>
              )}
            </div>
          )}
        </div>

        <div className="bk-modal-footer">
          {checkResult?.valid && !checkResult?.alreadyUsed && (
            <button className="bk-btn bk-btn-check bk-btn-lg" onClick={handleCheckIn}>
              Xác nhận Check-in
            </button>
          )}
          <button className="bk-btn bk-btn-secondary bk-btn-lg" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/** Toast notification */
function Toast({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div className={`bk-toast bk-toast-${type}`}>
      {message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminBookings() {
  const [bookings, setBookings] = useState(sampleBookings);
  const [activeTab, setActiveTab] = useState("list"); // "list" | "detail" | "refund" | "check"
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Mở chi tiết
  const handleView = (b) => {
    setSelectedBooking(b);
    setActiveTab("detail");
  };

  // Mở hoàn vé
  const handleRefund = (b) => {
    setSelectedBooking(b);
    setActiveTab("refund");
  };

  // Mở kiểm tra vé
  const handleCheck = (b) => {
    setSelectedBooking(b);
    setActiveTab("check");
  };

  // Xác nhận hoàn vé
  const handleConfirmRefund = ({ booking, reason, refundMethod }) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id ? { ...b, status: "refunded", paymentStatus: "paid" } : b
      )
    );
    showToast(`Đã hoàn vé ${booking.bookingCode} thành công.`, "success");
    setActiveTab("list");
    setSelectedBooking(null);
  };

  // Xác nhận check-in
  const handleConfirmCheckIn = (booking) => {
    const now = new Date();
    const timeStr = now.toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
    setBookings((prev) =>
      prev.map((b) =>
        b.id === booking.id
          ? { ...b, status: "completed", checkInTime: timeStr }
          : b
      )
    );
    showToast(`Check-in vé ${booking.bookingCode} thành công!`, "success");
    setActiveTab("list");
    setSelectedBooking(null);
  };

  const handleClose = () => {
    setActiveTab("list");
    setSelectedBooking(null);
  };

  const tabs = [
    { key: "list",   label: "Danh sách vé" },
    { key: "refund", label: "Hoàn vé",      disabled: activeTab !== "refund" && activeTab !== "detail" },
    { key: "check",  label: "Kiểm tra vé",  disabled: activeTab !== "check" && activeTab !== "detail" },
  ];

  return (
    <div className="admin-bookings">
      <div className="bk-page-header">
        <h2>Quản lý đặt vé</h2>
        <p>Quản lý toàn bộ vé đặt, chi tiết, hoàn vé và kiểm tra vé</p>
      </div>

      {/* Summary stats */}
      <div className="bk-stats-row">
        {[
          { label: "Tổng vé", value: bookings.length, color: "#7c61ff" },
          { label: "Đã xác nhận", value: bookings.filter(b => b.status === "confirmed").length, color: "#4ade80" },
          { label: "Đang chờ",   value: bookings.filter(b => b.status === "pending").length,   color: "#fbbf24" },
          { label: "Đã hủy/Hoàn", value: bookings.filter(b => b.status === "cancelled" || b.status === "refunded").length, color: "#f87171" },
        ].map(s => (
          <div className="bk-stat-pill" key={s.label}>
            <span>{s.label}</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="bk-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={`bk-tab${activeTab === t.key ? " active" : ""}${t.disabled ? " disabled" : ""}`}
            onClick={() => !t.disabled && setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "list" && (
        <BookingList
          bookings={bookings}
          onView={handleView}
          onRefund={handleRefund}
          onCheck={handleCheck}
        />
      )}

      {/* Modals */}
      {activeTab === "detail" && (
        <BookingDetail
          booking={selectedBooking}
          onClose={handleClose}
          onRefund={handleRefund}
          onCheck={handleCheck}
        />
      )}

      {activeTab === "refund" && (
        <RefundModal
          booking={selectedBooking}
          onClose={handleClose}
          onConfirm={handleConfirmRefund}
        />
      )}

      {activeTab === "check" && (
        <CheckModal
          booking={selectedBooking}
          onClose={handleClose}
          onConfirm={handleConfirmCheckIn}
        />
      )}

      {/* Toast */}
      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
