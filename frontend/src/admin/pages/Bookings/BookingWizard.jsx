import { useState, useEffect, useMemo, useRef } from "react";
import {
  adminBookingService,
  adminUserService,
  adminShowtimeService,
  adminCinemaService,
  adminSeatService,
  adminComboService,
} from "../../services/adminApi.js";

const SEAT_PRICES = {
  Standard: 80000,
  Regular:  80000,
  VIP:      100000,
  Couple:   120000,
};
const getSeatPrice = (type) =>
  Number(SEAT_PRICES[String(type || "Standard")] || 80000);

const fmtMoney = (n) => `${Number(n || 0).toLocaleString("vi-VN")} ₫`;

export default function BookingWizard({ onToast, onBookingSuccess }) {
  const [step, setStep] = useState(1);
  // Step 1: Customer
  const [customerMode, setCustomerMode] = useState("existing_user");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomerForm, setNewCustomerForm] = useState({
    full_name: "", email: "", phone: "", birthday: "", sex: "male",
  });
  const [newCustomerErrors, setNewCustomerErrors] = useState({});

  // Step 2: Showtime
  const [cinemas, setCinemas] = useState([]);
  const [selectedCinemaId, setSelectedCinemaId] = useState("");
  const [showtimes, setShowtimes] = useState([]);
  const [showtimeLoading, setShowtimeLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  // Step 3: Seats
  const [seats, setSeats] = useState([]);
  const [seatLoading, setSeatLoading] = useState(false);
  const [soldSeatCodes, setSoldSeatCodes] = useState(new Set());
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatError, setSeatError] = useState("");

  // Step 4: Combos
  const [comboList, setComboList] = useState([]);
  const [comboCounts, setComboCounts] = useState({});

  // Step 5: Payment
  const [paymentMethod, setPaymentMethod] = useState("cashier");
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const debounceRef = useRef(null);

  // Initial load: cinemas, combos
  useEffect(() => {
    (async () => {
      try {
        const [cinemaData, comboData] = await Promise.all([
          adminCinemaService.getAllCinemas().catch(() => ({ cinemas: [] })),
          adminComboService.getAll().catch(() => ({ combos: [] })),
        ]);
        const listC = Array.isArray(cinemaData?.cinemas) ? cinemaData.cinemas : (Array.isArray(cinemaData) ? cinemaData : []);
        const listCombo = Array.isArray(comboData?.combos) ? comboData.combos : (Array.isArray(comboData) ? comboData : []);
        setCinemas(listC);
        setComboList(listCombo);
        setComboCounts(
          listCombo.reduce((acc, c) => {
            acc[c.combo_id] = 0;
            return acc;
          }, {})
        );
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Search user (debounced)
  useEffect(() => {
    if (customerMode !== "existing_user") return undefined;
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      return undefined;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await adminUserService.searchUsers(q);
        setSearchResults(Array.isArray(res?.users) ? res.users : []);
      } catch (e) {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, customerMode]);

  // Load showtimes when cinema/date change
  useEffect(() => {
    if (!selectedCinemaId || !selectedDate) {
      setShowtimes([]);
      return undefined;
    }
    let ignore = false;
    (async () => {
      setShowtimeLoading(true);
      try {
        const res = await adminShowtimeService.getAll({
          cinemaId: selectedCinemaId,
          date: selectedDate,
        });
        if (ignore) return;
        const list = Array.isArray(res?.showtimes) ? res.showtimes : (Array.isArray(res) ? res : []);
        const filtered = list.filter(st => {
          if (!st?.start_time) return true;
          const stDate = new Date(st.start_time).toISOString().slice(0, 10);
          return stDate === selectedDate;
        });
        setShowtimes(filtered);
      } catch (e) {
        if (!ignore) setShowtimes([]);
      } finally {
        if (!ignore) setShowtimeLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [selectedCinemaId, selectedDate]);

  // Load rooms & seats when showtime is selected
  useEffect(() => {
    if (!selectedShowtime) {
      setSeats([]);
      setSoldSeatCodes(new Set());
      setSelectedSeats([]);
      return undefined;
    }
    let ignore = false;
    (async () => {
      setSeatLoading(true);
      setSeatError("");
      try {
        const roomId = selectedShowtime.room_id;
        const [seatRes, bookingRes] = await Promise.all([
          adminSeatService.getSeatsByRoom(roomId).catch(() => ({ seats: [] })),
          adminBookingService.getAllBookings({ status: "confirmed" }).catch(() => ({ bookings: [] })),
        ]);
        if (ignore) return;
        const seatList = Array.isArray(seatRes?.seats) ? seatRes.seats : (Array.isArray(seatRes) ? seatRes : []);
        setSeats(seatList);

        const sold = new Set();
        (Array.isArray(bookingRes?.bookings) ? bookingRes.bookings : []).forEach(b => {
          if (!b?.seat_codes) return;
          String(b.seat_codes).split(",").map(s => s.trim()).filter(Boolean).forEach(c => sold.add(c.toUpperCase()));
        });
        setSoldSeatCodes(sold);
      } catch (e) {
        if (!ignore) setSeatError("Không thể tải ghế.");
      } finally {
        if (!ignore) setSeatLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [selectedShowtime]);

  const validateNewCustomer = () => {
    const e = {};
    if (!newCustomerForm.full_name.trim()) e.full_name = "Nhập họ tên.";
    if (!newCustomerForm.email.trim()) e.email = "Nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newCustomerForm.email))
      e.email = "Email không hợp lệ.";
    if (!newCustomerForm.phone.trim()) e.phone = "Nhập số điện thoại.";
    return e;
  };

  const canGoStep2 = () => {
    if (customerMode === "existing_user") return !!selectedCustomer;
    const e = validateNewCustomer();
    setNewCustomerErrors(e);
    return Object.keys(e).length === 0;
  };

  const goStep2 = () => { if (canGoStep2()) setStep(2); };
  const canGoStep3 = () => !!selectedShowtime;
  const goStep3 = () => { if (canGoStep3()) setStep(3); };
  const canGoStep4 = () => selectedSeats.length > 0;
  const goStep4 = () => {
    if (!canGoStep4()) { setSeatError("Vui lòng chọn ít nhất một ghế."); return; }
    setSeatError(""); setStep(4);
  };
  const goStep5 = () => setStep(5);

  const seatTotal = selectedSeats.reduce((sum, s) => sum + getSeatPrice(s.seat_type), 0);
  const comboTotal = comboList.reduce(
    (sum, c) => sum + Number(comboCounts[c.combo_id] || 0) * Number(c.price || 0),
    0,
  );
  const totalAmount = seatTotal + comboTotal;

  const toggleSeat = (seat) => {
    if (soldSeatCodes.has(String(seat.seat_code || "").toUpperCase())) return;
    setSelectedSeats((prev) => {
      const idx = prev.findIndex(s => s.seat_id === seat.seat_id);
      if (idx >= 0) return prev.filter((_, i) => i !== idx);
      return [...prev, seat];
    });
    setSeatError("");
  };

  const seatsByRow = useMemo(() => {
    const map = new Map();
    seats.forEach(s => {
      const m = /^([A-Z]+)(\d+)$/i.exec(String(s.seat_code || ""));
      const row = m ? m[1].toUpperCase() : "?";
      if (!map.has(row)) map.set(row, []);
      map.get(row).push({ ...s, num: m ? Number(m[2]) : 0 });
    });
    Array.from(map.values()).forEach(arr => arr.sort((a, b) => a.num - b.num));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "en"));
  }, [seats]);

  const handleSubmit = async () => {
    if (!canGoStep2()) return;
    setSubmitting(true);
    try {
      const customerPayload = customerMode === "existing_user"
        ? { user_id: selectedCustomer.user_id }
        : {
            mode: "new_user",
            new_user: { ...newCustomerForm, phone: newCustomerForm.phone.trim() },
          };

      const seatUnits = selectedSeats.map(s => ({
        id: s.seat_code,
        label: s.seat_code,
        type: String(s.seat_type || "Standard").toLowerCase(),
        seatCodes: [s.seat_code],
      }));

      const foodItems = comboList
        .map(c => ({
          comboId: c.combo_id,
          comboName: c.combo_name,
          quantity: Number(comboCounts[c.combo_id] || 0),
        }))
        .filter(c => c.quantity > 0);

      const payload = {
        ...(customerMode === "new_user" ? { mode: "new_user" } : {}),
        user_id: customerPayload.user_id,
        new_user: customerPayload.new_user,
        showtimeId: selectedShowtime?.showtime_id || selectedShowtime?.id,
        seatUnits,
        foodItems,
        paymentMethod,
      };

      const res = await adminBookingService.staffCreateBooking(payload);
      setBookingResult(res);
      onToast?.(`Đặt vé thành công! Mã: ${res?.booking?.booking_code || ""}`);
      onBookingSuccess?.(res);
    } catch (err) {
      onToast?.(`Lỗi: ${err?.message || "Đặt vé không thành công."}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setSelectedCustomer(null);
    setSearchQuery("");
    setSearchResults([]);
    setNewCustomerForm({ full_name: "", email: "", phone: "", birthday: "", sex: "male" });
    setSelectedCinemaId("");
    setSelectedShowtime(null);
    setSelectedSeats([]);
    setComboCounts(comboList.reduce((acc, c) => ({ ...acc, [c.combo_id]: 0 }), {}));
    setBookingResult(null);
    setPaymentMethod("cashier");
  };

  // Result screen
  if (bookingResult) {
    const b = bookingResult.booking || {};
    const nu = bookingResult.new_user;
    return (
      <div className="sf-section">
        <div className="sf-detail-card" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
            <div style={{ fontSize: 48 }}>🎟️</div>
            <h3 style={{ color: "#4ade80", marginTop: 8 }}>Đặt vé thành công!</h3>
          </div>
          <div className="sf-detail-row"><span>Mã đặt vé</span><strong style={{ color: "#7c61ff", fontSize: 18 }}>{b.booking_code || "—"}</strong></div>
          <div className="sf-detail-row"><span>Khách hàng</span><strong>{b.full_name || selectedCustomer?.full_name || newCustomerForm.full_name}</strong></div>
          <div className="sf-detail-row"><span>Phim</span><strong>{b.movie_title || selectedShowtime?.movie_title || selectedShowtime?.title || "—"}</strong></div>
          <div className="sf-detail-row"><span>Suất</span><strong>
            {b.start_time ? new Date(b.start_time).toLocaleString("vi-VN") : (selectedShowtime?.start_time ? new Date(selectedShowtime.start_time).toLocaleString("vi-VN") : "—")}
          </strong></div>
          <div className="sf-detail-row"><span>Ghế</span><strong>{(b.seats || selectedSeats.map(s => s.seat_code)).join(", ")}</strong></div>
          <div className="sf-detail-row"><span>Tổng tiền</span><strong style={{ color: "#fbbf24", fontSize: 18 }}>{fmtMoney(b.total_price || totalAmount)}</strong></div>
          {nu && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: "rgba(251,191,36,0.12)", border: "1px dashed #fbbf24" }}>
              <strong style={{ color: "#fbbf24" }}>⚠ Tài khoản mới đã được tạo:</strong>
              <div className="sf-detail-row" style={{ marginTop: 8 }}><span>Email</span><strong>{nu.email}</strong></div>
              <div className="sf-detail-row"><span>Mật khẩu tạm</span><strong style={{ color: "#fbbf24" }}>{nu.temporary_password}</strong></div>
              <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>Khách hàng nên đổi mật khẩu sau khi đăng nhập.</div>
            </div>
          )}
          <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={resetForm}>Đặt vé khác</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-section">
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { n: 1, label: "Khách hàng" },
          { n: 2, label: "Suất chiếu" },
          { n: 3, label: "Chọn ghế" },
          { n: 4, label: "Combo" },
          { n: 5, label: "Xác nhận" },
        ].map(s => (
          <button
            key={s.n}
            onClick={() => setStep(s.n)}
            className={`sf-btn ${step === s.n ? "sf-btn-add" : "sf-btn-secondary"} sm`}
            style={{ opacity: step >= s.n ? 1 : 0.55 }}
          >
            Bước {s.n}: {s.label}
          </button>
        ))}
      </div>

      <div className="table-card" style={{ padding: 20 }}>
        {/* STEP 1: Customer */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Bước 1: Chọn khách hàng</h3>
            <div style={{ display: "flex", gap: 16, marginBottom: 18 }}>
              <label className={`sf-role-chip ${customerMode === "existing_user" ? " checked" : ""}`}
                style={{ cursor: "pointer", padding: "10px 14px" }}>
                <input type="radio" checked={customerMode === "existing_user"} onChange={() => { setCustomerMode("existing_user"); setSelectedCustomer(null); }} style={{ marginRight: 6 }} />
                ✅ Đã có tài khoản
              </label>
              <label className={`sf-role-chip ${customerMode === "new_user" ? " checked" : ""}`}
                style={{ cursor: "pointer", padding: "10px 14px" }}>
                <input type="radio" checked={customerMode === "new_user"} onChange={() => { setCustomerMode("new_user"); setSelectedCustomer(null); }} style={{ marginRight: 6 }} />
                ➕ Chưa có tài khoản (tạo mới)
              </label>
            </div>

            {customerMode === "existing_user" ? (
              <div>
                <input
                  className="sf-search"
                  style={{ width: "100%", marginBottom: 12 }}
                  placeholder="Tìm theo tên, email, số điện thoại…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div style={{ minHeight: 280, maxHeight: 340, overflowY: "auto", border: "1px solid #1e2a55", borderRadius: 10 }}>
                  {searchLoading ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff" }}>Đang tìm…</div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff" }}>
                      {searchQuery ? "Không tìm thấy tài khoản nào." : "Nhập từ khóa để tìm khách hàng."}
                    </div>
                  ) : (
                    searchResults.map(u => (
                      <div
                        key={u.user_id}
                        onClick={() => setSelectedCustomer(u)}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid #182047",
                          background: selectedCustomer?.user_id === u.user_id ? "rgba(124,97,255,0.15)" : "transparent",
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                        }}
                      >
                        <div>
                          <strong>{u.full_name}</strong>
                          <div style={{ fontSize: 12, color: "#7a8fc0" }}>
                            {u.email} · {u.phone_number || "—"} · {u.status} · {u.points || 0} điểm
                          </div>
                        </div>
                        {selectedCustomer?.user_id === u.user_id && (
                          <span style={{ color: "#4ade80", fontWeight: 700 }}>✓ Đã chọn</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="sf-form-grid">
                <div className="sf-form-col">
                  <div className="sf-field-row">
                    <div className="sf-field">
                      <label>Họ và tên *</label>
                      <input
                        className={newCustomerErrors.full_name ? "error" : ""}
                        value={newCustomerForm.full_name}
                        onChange={(e) => setNewCustomerForm(p => ({ ...p, full_name: e.target.value }))}
                        placeholder="Nguyễn Thị A"
                      />
                      {newCustomerErrors.full_name && <span className="sf-error">{newCustomerErrors.full_name}</span>}
                    </div>
                    <div className="sf-field">
                      <label>Email *</label>
                      <input
                        type="email"
                        className={newCustomerErrors.email ? "error" : ""}
                        value={newCustomerForm.email}
                        onChange={(e) => setNewCustomerForm(p => ({ ...p, email: e.target.value }))}
                        placeholder="khach@email.com"
                      />
                      {newCustomerErrors.email && <span className="sf-error">{newCustomerErrors.email}</span>}
                    </div>
                  </div>
                  <div className="sf-field-row">
                    <div className="sf-field">
                      <label>Số điện thoại *</label>
                      <input
                        className={newCustomerErrors.phone ? "error" : ""}
                        value={newCustomerForm.phone}
                        onChange={(e) => setNewCustomerForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="09xxxxxxxx"
                      />
                      {newCustomerErrors.phone && <span className="sf-error">{newCustomerErrors.phone}</span>}
                    </div>
                    <div className="sf-field">
                      <label>Ngày sinh</label>
                      <input
                        type="date"
                        value={newCustomerForm.birthday}
                        onChange={(e) => setNewCustomerForm(p => ({ ...p, birthday: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="sf-field">
                    <label>Giới tính</label>
                    <select
                      value={newCustomerForm.sex}
                      onChange={(e) => setNewCustomerForm(p => ({ ...p, sex: e.target.value }))}
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  </div>
                  <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 8, padding: 10, borderRadius: 8, background: "rgba(147,197,253,0.12)" }}>
                    ℹ️ Hệ thống sẽ tự tạo mật khẩu tạm thời cho khách hàng. Khách có thể đổi sau.
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button className="sf-btn sf-btn-add sf-btn-lg" onClick={goStep2}>Tiếp theo →</button>
            </div>
          </div>
        )}

        {/* STEP 2: Showtime */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Bước 2: Chọn suất chiếu</h3>
            <div className="sf-field-row">
              <div className="sf-field">
                <label>Rạp chiếu</label>
                <select value={selectedCinemaId} onChange={(e) => { setSelectedCinemaId(e.target.value); setSelectedShowtime(null); }}>
                  <option value="">-- Chọn rạp --</option>
                  {cinemas.map(c => (
                    <option key={c.cinemas_id || c.id || c.cinema_id} value={c.cinemas_id || c.id || c.cinema_id}>
                      {c.cinema_name || c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sf-field">
                <label>Ngày</label>
                <input type="date" value={selectedDate} onChange={(e) => { setSelectedDate(e.target.value); setSelectedShowtime(null); }} />
              </div>
            </div>

            <div style={{ minHeight: 280, maxHeight: 360, overflowY: "auto", marginTop: 16, border: "1px solid #1e2a55", borderRadius: 10 }}>
              {showtimeLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff" }}>Đang tải suất…</div>
              ) : showtimes.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff" }}>
                  {selectedCinemaId ? "Không có suất chiếu vào ngày đã chọn." : "Vui lòng chọn rạp và ngày."}
                </div>
              ) : (
                showtimes.map(st => {
                  const isSelected = selectedShowtime?.showtime_id === st.showtime_id || selectedShowtime?.id === st.id;
                  return (
                    <div
                      key={st.showtime_id || st.id}
                      onClick={() => setSelectedShowtime(st)}
                      style={{
                        padding: "14px 16px", cursor: "pointer",
                        borderBottom: "1px solid #182047",
                        background: isSelected ? "rgba(124,97,255,0.18)" : "transparent",
                        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <strong style={{ color: "#eef4ff" }}>🎬 {st.movie_title || st.title || `Phim #${st.movie_id}`}</strong>
                        <div style={{ fontSize: 12, color: "#7a8fc0", marginTop: 4 }}>
                          {st.room_name || `Phòng #${st.room_id}`}
                          {st.cinema_name ? ` · ${st.cinema_name}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, color: "#7c61ff" }}>
                          {st.start_time ? new Date(st.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                        </div>
                        <div style={{ fontSize: 12, color: "#93c5fd" }}>
                          {fmtMoney(st.price || st.price_standard || 80000)}
                        </div>
                      </div>
                      {isSelected && <span style={{ color: "#4ade80", fontWeight: 700 }}>✓</span>}
                    </div>
                  );
                })
              )}
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
              <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(1)}>← Quay lại</button>
              <button className="sf-btn sf-btn-add sf-btn-lg" onClick={goStep3} disabled={!canGoStep3()}>Tiếp theo →</button>
            </div>
          </div>
        )}

        {/* STEP 3: Seats */}
        {step === 3 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Bước 3: Chọn ghế</h3>
            <div style={{ textAlign: "center", marginBottom: 10, fontSize: 13, color: "#7a8fc0" }}>
              🎥 Màn hình chiếu phim 🎥
            </div>
            <div style={{
              height: 8, width: "70%", margin: "0 auto 24px", borderRadius: "0 0 50% 50%",
              background: "linear-gradient(180deg, #7c61ff, #1e2a55)"
            }} />
            {seatLoading ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8fa6ff" }}>Đang tải ghế…</div>
            ) : seatError ? (
              <div style={{ padding: 20, textAlign: "center", color: "#f87171" }}>{seatError}</div>
            ) : seatsByRow.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8fa6ff" }}>Không có dữ liệu ghế cho phòng này.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "center" }}>
                {seatsByRow.map(([rowName, rowSeats]) => (
                  <div key={rowName} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 28, textAlign: "center", fontWeight: 700, color: "#7a8fc0" }}>{rowName}</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {rowSeats.map(seat => {
                        const code = String(seat.seat_code || "").toUpperCase();
                        const sold = soldSeatCodes.has(code);
                        const selected = selectedSeats.some(s => s.seat_id === seat.seat_id);
                        const t = String(seat.seat_type || "Standard").toLowerCase();
                        const bg = sold
                          ? "#3f3f46"
                          : selected
                            ? (t === "vip" ? "#fbbf24" : t === "couple" ? "#ec4899" : "#7c61ff")
                            : (t === "vip" ? "#7d6608" : t === "couple" ? "#831843" : "#1e2a55");
                        const w = t === "couple" ? 64 : 32;
                        return (
                          <button
                            key={seat.seat_id}
                            type="button"
                            disabled={sold}
                            onClick={() => toggleSeat(seat)}
                            title={`${code} · ${seat.seat_type} · ${fmtMoney(getSeatPrice(seat.seat_type))}`}
                            style={{
                              width: w, height: 28, fontSize: 11, border: "none", borderRadius: 6,
                              color: (sold || selected) ? "#0b1020" : "#eef4ff",
                              background: bg,
                              cursor: sold ? "not-allowed" : "pointer",
                              opacity: sold ? 0.6 : 1,
                              fontWeight: 600,
                            }}
                          >{seat.num}</button>
                        );
                      })}
                    </div>
                    <div style={{ width: 28, textAlign: "center", fontWeight: 700, color: "#7a8fc0" }}>{rowName}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 20, justifyContent: "center", flexWrap: "wrap", fontSize: 13 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 14, background: "#1e2a55", borderRadius: 4 }}></span> Ghế thường (80k)</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 14, background: "#7d6608", borderRadius: 4 }}></span> Ghế VIP (100k)</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 14, background: "#831843", borderRadius: 4 }}></span> Ghế Couple (120k)</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 14, height: 14, background: "#3f3f46", borderRadius: 4 }}></span> Đã bán</span>
            </div>
            {seatError && <p style={{ color: "#f87171", marginTop: 12, textAlign: "center" }}>{seatError}</p>}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>Đã chọn <strong style={{ color: "#7c61ff" }}>{selectedSeats.length}</strong> ghế · Tổng: <strong style={{ color: "#fbbf24" }}>{fmtMoney(seatTotal)}</strong></div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(2)}>← Quay lại</button>
                <button className="sf-btn sf-btn-add sf-btn-lg" onClick={goStep4}>Tiếp theo →</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Combos */}
        {step === 4 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Bước 4: Chọn đồ ăn / Combo (tùy chọn)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
              {comboList.length === 0 ? (
                <div style={{ padding: 30, textAlign: "center", color: "#8fa6ff", gridColumn: "1 / -1" }}>Hiện chưa có combo nào.</div>
              ) : comboList.map(c => {
                const qty = Number(comboCounts[c.combo_id] || 0);
                return (
                  <div key={c.combo_id} className="sf-detail-card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ fontSize: 34 }}>
                      {String(c.combo_name || "").includes("4 Người") ? "👨‍👩‍👧‍👦" : "🎁"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 14 }}>{c.combo_name}</strong>
                      <div style={{ fontSize: 12, color: "#7a8fc0" }}>{fmtMoney(c.price)}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        className="sf-btn sf-btn-secondary sm"
                        onClick={() => setComboCounts(p => ({ ...p, [c.combo_id]: Math.max(0, qty - 1) }))}
                      >-</button>
                      <strong style={{ minWidth: 20, textAlign: "center" }}>{qty}</strong>
                      <button
                        className="sf-btn sf-btn-add sm"
                        onClick={() => setComboCounts(p => ({ ...p, [c.combo_id]: qty + 1 }))}
                      >+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>Tạm tính combo: <strong style={{ color: "#fbbf24" }}>{fmtMoney(comboTotal)}</strong></div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(3)}>← Quay lại</button>
                <button className="sf-btn sf-btn-add sf-btn-lg" onClick={goStep5}>Tiếp theo →</button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Confirm */}
        {step === 5 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Bước 5: Xác nhận đặt vé</h3>
            <div className="sf-detail-grid">
              <div className="sf-detail-card">
                <h4>Khách hàng</h4>
                {customerMode === "existing_user" && selectedCustomer ? (
                  <>
                    <div className="sf-detail-row"><span>Tên</span><strong>{selectedCustomer.full_name}</strong></div>
                    <div className="sf-detail-row"><span>Email</span><strong>{selectedCustomer.email}</strong></div>
                    <div className="sf-detail-row"><span>Điện thoại</span><strong>{selectedCustomer.phone_number || "—"}</strong></div>
                    <div className="sf-detail-row"><span>Điểm</span><strong>{selectedCustomer.points || 0}</strong></div>
                  </>
                ) : (
                  <>
                    <div className="sf-detail-row"><span>Tên</span><strong>{newCustomerForm.full_name}</strong></div>
                    <div className="sf-detail-row"><span>Email</span><strong>{newCustomerForm.email}</strong></div>
                    <div className="sf-detail-row"><span>Điện thoại</span><strong>{newCustomerForm.phone}</strong></div>
                    <div className="sf-detail-row"><span>Ghi chú</span><strong style={{ color: "#fbbf24", fontSize: 12 }}>Sẽ tạo tài khoản mới + mật khẩu tạm</strong></div>
                  </>
                )}
              </div>
              <div className="sf-detail-card">
                <h4>Suất chiếu</h4>
                <div className="sf-detail-row"><span>Phim</span><strong>{selectedShowtime?.movie_title || selectedShowtime?.title || "—"}</strong></div>
                <div className="sf-detail-row"><span>Giờ chiếu</span><strong>
                  {selectedShowtime?.start_time ? new Date(selectedShowtime.start_time).toLocaleString("vi-VN") : "—"}
                </strong></div>
                <div className="sf-detail-row"><span>Phòng</span><strong>{selectedShowtime?.room_name || `#${selectedShowtime?.room_id}`}</strong></div>
                <div className="sf-detail-row"><span>Ghế ({selectedSeats.length})</span><strong>{selectedSeats.map(s => s.seat_code).join(", ")}</strong></div>
              </div>
            </div>
            <div className="sf-detail-card" style={{ marginTop: 14 }}>
              <h4>Thanh toán</h4>
              <div className="sf-detail-row"><span>Giá ghế</span><strong>{fmtMoney(seatTotal)}</strong></div>
              {comboTotal > 0 && <div className="sf-detail-row"><span>Combo</span><strong>{fmtMoney(comboTotal)}</strong></div>}
              <div className="sf-detail-row"><span style={{ fontSize: 16 }}><strong>Tổng cộng</strong></span>
                <strong style={{ color: "#fbbf24", fontSize: 22 }}>{fmtMoney(totalAmount)}</strong>
              </div>
              <div className="sf-field" style={{ marginTop: 10 }}>
                <label>Hình thức thanh toán</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  <option value="cashier">Tại quầy (tiền mặt)</option>
                  <option value="cash">Tiền mặt</option>
                  <option value="banking">Chuyển khoản</option>
                  <option value="card">Thẻ (Visa/Master)</option>
                  <option value="momo">Ví MoMo</option>
                  <option value="vnpay">VNPay</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
              <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(4)}>← Quay lại</button>
              <button
                className="sf-btn sf-btn-add sf-btn-lg"
                disabled={submitting}
                onClick={handleSubmit}
                style={{ paddingLeft: 30, paddingRight: 30 }}
              >
                {submitting ? "Đang đặt vé…" : "✅ Xác nhận & Đặt vé"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
