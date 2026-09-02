import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import './bookings.css';
import BookingWizard from "./BookingWizard.jsx";
import { adminBookingService, adminEmployeeService } from "../../services/adminApi";
import AdminPagination, { useAdminPagination } from "../../components/AdminPagination.jsx";
import AdminModalPortal from "../../components/AdminModalPortal.jsx";
import { printTicketPdf } from "../../../utils/ticketPrint.js";
import { PAYMENT_BANKS } from "../../../utils/paymentConfig.js";

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

function formatPaymentMethod(method) {
  const value = String(method || "").trim();
  if (value === "cash" || value === "cashier") return "Tiền mặt tại quầy";
  if (value === "card_nfc" || value.startsWith("card_nfc:")) return "Thẻ qua NFC/POS";
  if (value === "card") return "Thẻ tín dụng / Ghi nợ";
  if (value.startsWith("banking:")) return `Chuyển khoản · ${value.split(":")[1]}`;
  if (value === "banking") return "Chuyển khoản ngân hàng";
  if (value === "zalopay") return "Ví ZaloPay";
  if (value === "momo") return "Ví MoMo";
  if (value === "vnpay") return "VNPay";
  return value || "—";
}

function stopCameraStream(videoElement) {
  const stream = videoElement?.srcObject;
  if (stream && typeof stream.getTracks === "function") {
    stream.getTracks().forEach((track) => track.stop());
  }
  if (videoElement) videoElement.srcObject = null;
}

function getCameraErrorMessage(error) {
  const errorName = String(error?.name || "");
  if (errorName === "NotAllowedError" || errorName === "SecurityError") {
    return "Không thể mở camera. Vui lòng cấp quyền camera cho trang web rồi thử lại.";
  }
  if (errorName === "NotFoundError" || errorName === "OverconstrainedError") {
    return "Không tìm thấy camera phù hợp trên thiết bị này.";
  }
  if (errorName === "NotReadableError") {
    return "Camera đang được ứng dụng khác sử dụng. Vui lòng đóng ứng dụng đó rồi thử lại.";
  }
  return "Không thể khởi động camera. Hãy kiểm tra quyền camera và kết nối HTTPS.";
}

function mapBookingFromApi(item) {
  const seatCodes = Array.isArray(item?.seats)
    ? item.seats
    : (item?.seat_codes ? String(item.seat_codes).split(",").map((s) => s.trim()).filter(Boolean) : []);

  return {
    id: String(item?.booking_id || item?.id || `B${Date.now()}`),
    orderId: String(item?.booking_id || item?.order_id || item?.id || ""),
    user: item?.full_name || item?.user || "Khách hàng",
    customerType: item?.customer_type || item?.customerType || "account",
    email: item?.email || "",
    phone: item?.phone || item?.phone_number || "",
    movie: item?.movie_title || item?.movie || "",
    cinemaId: item?.cinema_id || item?.cinemaId || null,
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
    qrCode: "",
    qrCodes: Array.isArray(item?.qr_codes) ? item.qr_codes.filter(Boolean) : [],
    combos: Array.isArray(item?.combos) ? item.combos : [],
    checkInTime: item?.check_in_time ? new Date(item.check_in_time).toLocaleString("vi-VN") : null,
    createdAt: item?.created_at ? new Date(item.created_at).toLocaleString("vi-VN") : "",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Danh sách vé */
function BookingList({ bookings, onView, onCheck, onPay }) {
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
  const { page, setPage, totalPages, pageItems } = useAdminPagination(filtered);

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
              pageItems.map((b) => {
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
                        <span>{b.phone}{b.customerType === "guest" ? " · Khách vãng lai" : ""}</span>
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
                        {b.paymentStatus === "pending" && b.status !== "cancelled" && (
                          <button className="bk-btn bk-btn-pay" onClick={() => onPay(b)} title="Thanh toán vé">
                            Thanh toán
                          </button>
                        )}
                        <button className="bk-btn bk-btn-view" onClick={() => onView(b)} title="Chi tiết">
                          Chi tiết
                        </button>
                        {b.status === "confirmed" && (
                          <button className="bk-btn bk-btn-check" onClick={() => onCheck(b)} title={b.customerType === "guest" ? "Hoàn thành vé" : "Kiểm tra vé"}>
                            {b.customerType === "guest" ? "Hoàn thành" : "Kiểm tra"}
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
      <AdminPagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={10} onPageChange={setPage} />

      <div className="bk-footer-count">
        Hiển thị <strong>{filtered.length}</strong> / {bookings.length} vé
      </div>
    </div>
  );
}

/** Chi tiết vé */
function BookingDetail({ booking, onClose, onCheck, onPay }) {
  if (!booking) return null;
  const st = STATUS_MAP[booking.status] || { label: booking.status, cls: "pending" };
  const py = PAYMENT_MAP[booking.paymentStatus] || { label: booking.paymentStatus, cls: "pay-pending" };

  return (
    <AdminModalPortal>
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
              <div className="bk-detail-row"><span>Loại khách</span><strong>{booking.customerType === "guest" ? "Khách vãng lai" : "Có tài khoản"}</strong></div>
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
              <div className="bk-detail-row"><span>Phương thức</span><strong>{formatPaymentMethod(booking.paymentMethod)}</strong></div>
              <div className="bk-detail-row"><span>Tổng tiền</span><strong className="bk-amount">{formatMoney(booking.totalAmount)}</strong></div>
              <div className="bk-detail-row"><span>Ngày đặt</span><strong>{booking.createdAt}</strong></div>
            </div>

          </div>
        </div>

        {/* Actions */}
        <div className="bk-modal-footer">
          {booking.paymentStatus === "pending" && booking.status !== "cancelled" && (
            <button className="bk-btn bk-btn-pay bk-btn-lg" onClick={() => onPay(booking)}>
              Thanh toán
            </button>
          )}
          {booking.status === "confirmed" && (
            <button className="bk-btn bk-btn-check bk-btn-lg" onClick={() => onCheck(booking)}>
              {booking.customerType === "guest" ? "Đánh dấu hoàn thành" : "Kiểm tra vé"}
            </button>
          )}
          {(booking.checkInTime || booking.customerType === "guest" || booking.status === "completed") && (
            <button className="bk-btn bk-btn-view bk-btn-lg" onClick={() => printTicketPdf(booking)}>
              In vé / Lưu PDF
            </button>
          )}
          <button className="bk-btn bk-btn-secondary bk-btn-lg" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

/** Xác nhận thanh toán cho vé đang chờ. */
function PaymentModal({ booking, onClose, onConfirm }) {
  const currentMethod = String(booking?.paymentMethod || "").toLowerCase();
  const initialMethod = currentMethod.startsWith("banking")
    ? "banking"
    : currentMethod === "zalopay"
      ? "zalopay"
    : currentMethod.startsWith("card_nfc") || currentMethod === "card"
      ? "card_nfc"
      : "cashier";
  const initialBank = currentMethod.startsWith("banking:")
    ? currentMethod.split(":")[1]
    : "VCB";
  const [method, setMethod] = useState(initialMethod);
  const [bank, setBank] = useState(initialBank);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!booking) return null;
  const needsReference = method !== "cashier";

  const submit = async () => {
    const normalizedReference = reference.trim();
    if (needsReference && normalizedReference.length < 4) {
      setError("Vui lòng nhập mã giao dịch thanh toán thành công.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await onConfirm({
        paymentMethod: method === "banking" ? `banking:${bank}` : method,
        paymentReference: normalizedReference,
      });
    } catch (submitError) {
      setError(submitError?.message || "Không thể xác nhận thanh toán.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminModalPortal>
      <div className="bk-modal-overlay" onClick={onClose}>
        <div className="bk-modal bk-payment-modal" onClick={(event) => event.stopPropagation()}>
          <div className="bk-modal-header">
            <div>
              <h2>Thanh toán vé</h2>
              <span className="bk-booking-code">{booking.bookingCode}</span>
            </div>
            <button className="bk-modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="bk-modal-body">
            <div className="bk-payment-summary">
              <div><span>Khách hàng</span><strong>{booking.user}</strong></div>
              <div><span>Phim · Ghế</span><strong>{booking.movie} · {booking.seats.join(", ")}</strong></div>
              <div><span>Số tiền cần thanh toán</span><strong>{formatMoney(booking.totalAmount)}</strong></div>
            </div>

            <div className="bk-payment-method-grid">
              <button type="button" className={method === "cashier" ? "selected" : ""} onClick={() => { setMethod("cashier"); setError(""); }}>
                <span>💵</span><strong>Tiền mặt</strong><small>Thu tiền trực tiếp tại quầy</small>
              </button>
              <button type="button" className={method === "banking" ? "selected" : ""} onClick={() => { setMethod("banking"); setError(""); }}>
                <span>🏦</span><strong>Chuyển khoản</strong><small>Xác nhận giao dịch ngân hàng</small>
              </button>
              <button type="button" className={method === "card_nfc" ? "selected" : ""} onClick={() => { setMethod("card_nfc"); setError(""); }}>
                <span>💳</span><strong>Thẻ NFC/POS</strong><small>Xác nhận mã từ máy POS</small>
              </button>
              <button type="button" className={method === "zalopay" ? "selected" : ""} onClick={() => { setMethod("zalopay"); setError(""); }}>
                <span className="bk-zalopay-mark">Z</span><strong>Ví ZaloPay</strong><small>Xác nhận mã giao dịch ZaloPay</small>
              </button>
            </div>

            {method === "banking" && (
              <label className="bk-payment-field">
                <span>Ngân hàng</span>
                <select value={bank} onChange={(event) => setBank(event.target.value)}>
                  {PAYMENT_BANKS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              </label>
            )}

            {needsReference && (
              <label className="bk-payment-field">
                <span>{method === "card_nfc" ? "Mã giao dịch trên máy POS" : method === "zalopay" ? "Mã giao dịch ZaloPay" : "Mã giao dịch chuyển khoản"}</span>
                <input
                  value={reference}
                  onChange={(event) => { setReference(event.target.value); setError(""); }}
                  placeholder={method === "card_nfc" ? "Ví dụ: POS123456" : method === "zalopay" ? "Ví dụ: 240902_123456789" : "Ví dụ: FT2430012345"}
                  maxLength={100}
                  autoFocus
                />
                <small>Chỉ xác nhận sau khi ngân hàng, máy POS hoặc ZaloPay báo giao dịch thành công.</small>
              </label>
            )}

            {error && <div className="bk-payment-error">⚠️ {error}</div>}
          </div>

          <div className="bk-modal-footer">
            <button type="button" className="bk-btn bk-btn-pay bk-btn-lg" disabled={submitting} onClick={submit}>
              {submitting ? "Đang xác nhận…" : `Xác nhận đã thanh toán ${formatMoney(booking.totalAmount)}`}
            </button>
            <button type="button" className="bk-btn bk-btn-secondary bk-btn-lg" disabled={submitting} onClick={onClose}>Hủy</button>
          </div>
        </div>
      </div>
    </AdminModalPortal>
  );
}

/** Kiểm tra vé */
function CheckModal({ booking, onClose, onConfirm }) {
  const [code, setCode] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const videoRef = useRef(null);
  const scannerControlsRef = useRef(null);
  const scanResolvedRef = useRef(false);
  const scanCancelledRef = useRef(false);

  useEffect(() => () => {
    scanCancelledRef.current = true;
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    stopCameraStream(videoRef.current);
  }, []);

  if (!booking) return null;

  const verifyCode = async (value) => {
    const normalizedCode = String(value || "").trim().toUpperCase();
    if (!normalizedCode) return;
    try {
      const response = await adminBookingService.verifyCode(normalizedCode);
      const verifiedBooking = response?.booking || response;
      const isValid = String(verifiedBooking?.booking_id || verifiedBooking?.order_id) === String(booking.orderId || booking.id);
      setCheckResult({ valid: isValid, alreadyUsed: Boolean(verifiedBooking?.check_in_time || booking.checkInTime) });
    } catch {
      setCheckResult({ valid: false, alreadyUsed: false });
    }
  };

  const stopScanner = () => {
    scanCancelledRef.current = true;
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;
    stopCameraStream(videoRef.current);
    setScanning(false);
  };

  const handleStartScanner = async () => {
    if (scanning) return;

    setScanError("");
    setCheckResult(null);
    scanResolvedRef.current = false;
    scanCancelledRef.current = false;

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setScanError("Trình duyệt không hỗ trợ camera hoặc trang chưa chạy qua HTTPS.");
      return;
    }

    setScanning(true);
    await new Promise((resolve) => window.requestAnimationFrame(resolve));

    try {
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      if (scanCancelledRef.current) return;

      const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 150 });
      const controls = await reader.decodeFromConstraints(
        {
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },
        videoRef.current,
        (result, _error, activeControls) => {
          scannerControlsRef.current = activeControls;
          if (scanCancelledRef.current) {
            activeControls.stop();
            return;
          }
          if (!result || scanResolvedRef.current) return;

          const scannedCode = String(result.getText?.() || "").trim();
          if (!scannedCode) return;

          scanResolvedRef.current = true;
          setCode(scannedCode);
          void verifyCode(scannedCode);
          activeControls.stop();
          scannerControlsRef.current = null;
          stopCameraStream(videoRef.current);
          setScanning(false);
        },
      );

      if (scanCancelledRef.current || scanResolvedRef.current) {
        controls.stop();
      } else {
        scannerControlsRef.current = controls;
      }
    } catch (error) {
      if (scanCancelledRef.current) return;
      stopScanner();
      setScanError(getCameraErrorMessage(error));
    }
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const handleCheckIn = () => {
    onConfirm({ ...booking, scannedQrToken: code, qrCode: code, qrCodes: [code] });
  };

  const handleGuestDirectCheckIn = () => {
    onConfirm({ ...booking, scannedQrToken: "", qrCode: "", qrCodes: [] });
  };

  const st = STATUS_MAP[booking.status] || { label: booking.status, cls: "pending" };
  const isCheckedIn = Boolean(booking.checkInTime);
  const isGuestBooking = booking.customerType === "guest";

  return (
    <AdminModalPortal>
    <div className="bk-modal-overlay" onClick={handleClose}>
      <div className="bk-modal bk-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="bk-modal-header">
          <div>
            <h2>{isGuestBooking ? "Hoàn thành vé khách vãng lai" : "Kiểm tra vé"}</h2>
          </div>
          <button className="bk-modal-close" onClick={handleClose}>✕</button>
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

          {/* Riêng khách vãng lai */}
          {isGuestBooking && !isCheckedIn && (
            <div className="bk-check-result valid" style={{ marginTop: 20 }}>
              ℹ️ Vé khách vãng lai: không cần quét QR. Nhấn nút bên dưới để hoàn thành.
            </div>
          )}

          {/* Chỉ quét QR để kiểm tra (tài khoản thường) */}
          {!isGuestBooking && !isCheckedIn && (
            <div className="field-group" style={{ marginTop: 18 }}>
              <label>Quét mã QR vé</label>
              <div className="bk-check-input-row">
                <button
                  type="button"
                  className="bk-btn bk-btn-scan"
                  onClick={handleStartScanner}
                  disabled={scanning}
                >
                  {scanning ? "Đang quét…" : "📷 Quét mã QR"}
                </button>
              </div>

              <div className={`bk-qr-scanner${scanning ? " is-active" : ""}`} aria-hidden={!scanning}>
                <video ref={videoRef} autoPlay muted playsInline />
                <div className="bk-qr-scan-frame" aria-hidden="true" />
                <div className="bk-qr-scan-status">Đưa mã QR vào giữa khung hình</div>
                <button type="button" className="bk-qr-scan-stop" onClick={stopScanner}>Dừng quét</button>
              </div>
              {scanError && <div className="bk-camera-error">⚠️ {scanError}</div>}
            </div>
          )}

          {/* Kết quả kiểm tra */}
          {isCheckedIn ? (
            <div className="bk-check-result valid">
              <>✓ Check-in thành công! Có thể in vé.</>
            </div>
          ) : checkResult && (
            <div className={`bk-check-result ${checkResult.alreadyUsed ? "used" : checkResult.valid ? "valid" : "invalid"}`}>
              {checkResult.alreadyUsed ? (
                <>⚠️ Vé này đã được sử dụng vào lúc <strong>{booking.checkInTime}</strong>.</>
              ) : checkResult.valid ? (
                <>✓ QR hợp lệ: <strong>{code}</strong>. Có thể tiến hành check-in.</>
              ) : (
                <>✗ Mã không khớp. Vui lòng kiểm tra lại.</>
              )}
            </div>
          )}
        </div>

        <div className="bk-modal-footer">
          {isGuestBooking && !isCheckedIn && (
            <button className="bk-btn bk-btn-check bk-btn-lg" onClick={handleGuestDirectCheckIn}>
              Xác nhận hoàn thành vé
            </button>
          )}
          {!isGuestBooking && checkResult?.valid && !checkResult?.alreadyUsed && !isCheckedIn && (
            <button className="bk-btn bk-btn-check bk-btn-lg" onClick={handleCheckIn}>
              Xác nhận Check-in
            </button>
          )}
          {isCheckedIn && (
            <button className="bk-btn bk-btn-view bk-btn-lg" onClick={() => printTicketPdf(booking)}>
              In vé / Lưu PDF
            </button>
          )}
          <button className="bk-btn bk-btn-secondary bk-btn-lg" onClick={handleClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
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
  const reduxProfile = useSelector((state) => state.user.profile);
  const profile = { ...(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })(), ...(reduxProfile || {}) };
  const role = String(profile.role || "").toLowerCase();
  const isManager = role === "manager" || (role === "employee" && /quản lý|quan ly|manager/i.test(String(profile.employee_position || profile.position || "")));
  const isCinemaScopedStaff = role === "employee" || role === "manager";
  const currentUserId = profile.id || profile.userId || profile.user_id;
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("list"); // "list" | "detail" | "refund" | "check"
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentBooking, setPaymentBooking] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const [bookingResult, employeeResult] = await Promise.all([
          adminBookingService.getAllBookings(),
          isCinemaScopedStaff ? adminEmployeeService.getAll() : Promise.resolve(null),
        ]);
        const list = Array.isArray(bookingResult?.bookings) ? bookingResult.bookings : [];
        const staffCinemaId = isCinemaScopedStaff
          ? (employeeResult?.employees || []).find((employee) => Number(employee.userId || employee.user_id) === Number(currentUserId))?.cinemaId
            || (employeeResult?.employees || []).find((employee) => Number(employee.userId || employee.user_id) === Number(currentUserId))?.cinema_id
          : null;
        setBookings(list
          .filter((booking) => !isCinemaScopedStaff || Number(booking.cinema_id || booking.cinemaId) === Number(staffCinemaId))
          .map(mapBookingFromApi));
      } catch (error) {
        console.error("Failed to load admin bookings", error);
        showToast(error.message || "Không thể tải danh sách vé", "error");
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [currentUserId, isCinemaScopedStaff]);

  // Mở chi tiết
  const handleView = async (b) => {
    try {
      const data = await adminBookingService.getBookingDetail(b.orderId || b.id);
      setSelectedBooking(mapBookingFromApi(data?.booking || data || b));
    } catch (error) {
      console.error("Failed to load booking detail", error);
      setSelectedBooking(b);
      showToast("Không thể tải đầy đủ chi tiết vé; đang dùng dữ liệu hiện có.", "error");
    }
    setActiveTab("detail");
  };

  // Mở kiểm tra vé
  const handleCheck = (b) => {
    setSelectedBooking(b);
    setActiveTab("check");
  };

  const handleOpenPayment = (booking) => {
    setPaymentBooking(booking);
  };

  const handleConfirmPayment = async (payload) => {
    const currentBooking = paymentBooking;
    if (!currentBooking) return;

    const response = await adminBookingService.confirmPayment(
      currentBooking.orderId || currentBooking.id,
      payload,
    );
    const updatedBooking = mapBookingFromApi(response?.booking || response);

    setBookings((previous) => previous.map((booking) => (
      booking.orderId === currentBooking.orderId || booking.id === currentBooking.id
        ? updatedBooking
        : booking
    )));
    setSelectedBooking((previous) => (
      previous && (previous.orderId === currentBooking.orderId || previous.id === currentBooking.id)
        ? updatedBooking
        : previous
    ));
    setPaymentBooking(null);
    showToast("Xác nhận thanh toán thành công!", "success");
  };

  // Xác nhận check-in
  const handleConfirmCheckIn = async (booking) => {
    try {
      const res = await adminBookingService.checkInBooking(booking.orderId || booking.id, { qrToken: booking.scannedQrToken });
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
      showToast("Check-in vé thành công!", "success");
      setSelectedBooking(updatedBooking);
    } catch (error) {
      console.error("Check-in failed", error);
      showToast(error.message || "Không thể check-in vé", "error");
    }
  };

  const handleClose = () => {
    setActiveTab("list");
    setSelectedBooking(null);
    setPaymentBooking(null);
  };

  const tabs = [
    { key: "list",  label: "Danh sách vé" },
    { key: "create", label: "➕ Đặt vé" },
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
            🎟️ Đặt vé (cho khách hàng)
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
            onPay={handleOpenPayment}
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
              id: String(b.booking_id || b.order_id || `B${Date.now()}`),
              orderId: String(b.booking_id || b.order_id || ""),
              user: b.full_name || r?.new_user?.full_name || r?.guest_customer?.full_name || "Khách hàng",
              customerType: b.customer_type || (r?.guest_customer ? "guest" : "account"),
              email: b.email || r?.new_user?.email || r?.guest_customer?.email || "",
              phone: b.phone || b.phone_number || r?.new_user?.phone || r?.guest_customer?.phone || "",
              movie: b.movie_title || "",
              cinema: b.cinema_name || "",
              room: b.room_name || "",
              showtime: b.start_time ? new Date(b.start_time).toLocaleString("vi-VN") : "",
              seats: Array.isArray(b.seats) ? b.seats : (seatCodes ? seatCodes.split(",").map(s => s.trim()) : []),
              combo: null,
              totalAmount: Number(b.total_price || 0),
              paymentMethod: b.payment_method || b.paymentMethod || "",
              paymentStatus: b.payment_status || (b.status === "cancelled" ? "failed" : "pending"),
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
          onPay={handleOpenPayment}
        />
      )}

      {paymentBooking && (
        <PaymentModal
          booking={paymentBooking}
          onClose={() => setPaymentBooking(null)}
          onConfirm={handleConfirmPayment}
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
