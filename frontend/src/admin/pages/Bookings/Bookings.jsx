import { useEffect, useState } from "react";
import './bookings.css';
import BookingWizard from "./BookingWizard.jsx";
import { adminBookingService } from "../../services/adminApi";

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

function mapBookingFromApi(item) {
  const seatCodes = Array.isArray(item?.seats)
    ? item.seats
    : (item?.seat_codes ? String(item.seat_codes).split(",").map((s) => s.trim()).filter(Boolean) : []);

  return {
    id: String(item?.booking_id || item?.id || `B${Date.now()}`),
    orderId: String(item?.booking_id || item?.order_id || item?.id || ""),
    user: item?.full_name || item?.user || "Khách hàng",
    email: item?.email || "",
    phone: item?.phone || item?.phone_number || "",
    movie: item?.movie_title || item?.movie || "",
    cinema: item?.cinema_name || item?.cinema || "",
    room: item?.room_name || item?.room || "",
    showtime: item?.start_time ? new Date(item.start_time).toLocaleString("vi-VN") : "",
    seats: seatCodes,
    combo: item?.combo_name || item?.combo || null,
    totalAmount: Number(item?.total_price || item?.total_amount || 0),
    paymentMethod: item?.payment_method || "",
    paymentStatus: item?.payment_status || "pending",
    status: item?.status || "pending",
    bookingCode: item?.booking_code || "",
    qrCode: item?.primary_qr_code || item?.booking_code || "",
    checkInTime: item?.check_in_time ? new Date(item.check_in_time).toLocaleString("vi-VN") : null,
    createdAt: item?.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Danh sách vé */
function BookingList({ bookings, onView, onCheck }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = bookings.filter((b) => {
    const q = String(search || "").toLowerCase();
    const searchableText = [
      b.id,
      b.user,
      b.movie,
      b.bookingCode,
      b.phone,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const matchSearch = searchableText.includes(q);
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
function BookingDetail({ booking, onClose, onCheck }) {
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
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list"); // "list" | "detail" | "refund" | "check"
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const res = await adminBookingService.getAllBookings();
        const list = Array.isArray(res?.bookings) ? res.bookings : [];
        setBookings(list.map(mapBookingFromApi));
      } catch (error) {
        console.error("Failed to load admin bookings", error);
        showToast(error.message || "Không thể tải danh sách vé", "error");
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Mở chi tiết
  const handleView = (b) => {
    setSelectedBooking(b);
    setActiveTab("detail");
  };

  // Mở kiểm tra vé
  const handleCheck = (b) => {
    setSelectedBooking(b);
    setActiveTab("check");
  };

  // Xác nhận check-in
  const handleConfirmCheckIn = async (booking) => {
    try {
      const res = await adminBookingService.checkInBooking(booking.orderId || booking.id);
      const updatedBooking = res?.booking ? mapBookingFromApi(res.booking) : {
        ...booking,
        status: "completed",
        checkInTime: new Date().toLocaleString("vi-VN"),
      };
      setBookings((prev) =>
        prev.map((b) =>
          (b.id === booking.id || b.orderId === booking.orderId)
            ? updatedBooking
            : b
        )
      );
      showToast(`Check-in vé ${booking.bookingCode} thành công!`, "success");
      setActiveTab("list");
      setSelectedBooking(null);
    } catch (error) {
      console.error("Check-in failed", error);
      showToast(error.message || "Không thể check-in vé", "error");
    }
  };

  const handleClose = () => {
    setActiveTab("list");
    setSelectedBooking(null);
  };

  const tabs = [
    { key: "list",  label: "Danh sách vé" },
    { key: "create", label: "➕ Đặt vé nhanh" },
    { key: "check", label: "Kiểm tra vé", disabled: activeTab !== "check" && activeTab !== "detail" },
  ];

  return (
    <div className="admin-bookings">
      <div className="bk-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2>Quản lý đặt vé</h2>
          <p>Quản lý toàn bộ vé đặt, chi tiết và kiểm tra vé</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="bk-modal-footer-btn-primary"
            onClick={() => setActiveTab("create")}
            style={{ padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
          >
            🎟️ Đặt vé nhanh (cho khách hàng)
          </button>
        </div>
      </div>

      {/* Summary stats */}
      {activeTab !== "create" && (
        <div className="bk-stats-row">
          {[
            { label: "Tổng vé",     value: bookings.length,                                                      color: "#7c61ff" },
            { label: "Đã xác nhận", value: bookings.filter(b => b.status === "confirmed").length,               color: "#4ade80" },
            { label: "Đang chờ",    value: bookings.filter(b => b.status === "pending").length,                 color: "#fbbf24" },
            { label: "Đã hủy",      value: bookings.filter(b => b.status === "cancelled").length,               color: "#f87171" },
          ].map(s => (
            <div className="bk-stat-pill" key={s.label}>
              <span>{s.label}</span>
              <strong style={{ color: s.color }}>{s.value}</strong>
            </div>
          ))}
        </div>
      )}

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
        loading ? (
          <div className="table-card" style={{ padding: 24, textAlign: "center", color: "#8fa6ff" }}>
            Đang tải danh sách vé...
          </div>
        ) : (
          <BookingList
            bookings={bookings}
            onView={handleView}
            onCheck={handleCheck}
          />
        )
      )}

      {activeTab === "create" && (
        <BookingWizard
          onToast={showToast}
          onBookingSuccess={(r) => {
            const b = r?.booking || {};
            const seatCodes = Array.isArray(b.seats) ? b.seats.join(", ") : (b.seat_codes || "");
            const newItem = {
              id: `B${Date.now()}`,
              orderId: `ORD_${Date.now()}`,
              user: b.full_name || (r?.new_user?.full_name) || "Khách hàng",
              email: b.email || r?.new_user?.email || "",
              phone: b.phone || r?.new_user?.phone || "",
              movie: b.movie_title || "",
              cinema: b.cinema_name || "",
              room: b.room_name || "",
              showtime: b.start_time ? new Date(b.start_time).toLocaleString("vi-VN") : "",
              seats: Array.isArray(b.seats) ? b.seats : (seatCodes ? seatCodes.split(",").map(s => s.trim()) : []),
              combo: null,
              totalAmount: Number(b.total_price || 0),
              paymentMethod: b.payment_method || b.paymentMethod || "",
              paymentStatus: b.status === "cancelled" ? "failed" : "paid",
              status: b.status || "confirmed",
              bookingCode: b.booking_code || "",
              qrCode: b.booking_code ? `QR_${b.booking_code}` : "",
              checkInTime: null,
              createdAt: new Date().toLocaleString("vi-VN"),
            };
            setBookings(prev => [newItem, ...prev]);
          }}
        />
      )}

      {/* Modals */}
      {activeTab === "detail" && (
        <BookingDetail
          booking={selectedBooking}
          onClose={handleClose}
          onCheck={handleCheck}
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
