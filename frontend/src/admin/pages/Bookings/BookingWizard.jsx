import { useState, useEffect, useMemo, useRef } from "react";
import {
  adminBookingService,
  adminUserService,
  adminShowtimeService,
  adminCinemaService,
  adminSeatService,
  adminComboService,
} from "../../services/adminApi.js";
import { BIRTH_DATE_ERROR, getBirthDateBounds, isValidBirthDate } from "../../../utils/birthDate.js";

const SEAT_PRICES = {
  Standard: 80000,
  Regular:  80000,
  VIP:      100000,
  Couple:   120000,
};
const getSeatPrice = (type, showtime) => {
  const normalizedType = String(type || "Standard").toLowerCase();
  const configuredPrice = normalizedType === "vip"
    ? showtime?.price_vip
    : normalizedType === "couple"
      ? showtime?.price_couple
      : showtime?.price_standard ?? showtime?.price;
  return Number(configuredPrice) > 0
    ? Number(configuredPrice)
    : Number(SEAT_PRICES[normalizedType === "regular" ? "Standard" : normalizedType[0]?.toUpperCase() + normalizedType.slice(1)] || 80000);
};

const fmtMoney = (n) => `${Number(n || 0).toLocaleString("vi-VN")} ₫`;

const normalizeCinemaList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.cinemas)) return payload.cinemas;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.cinemas)) return payload.data.cinemas;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

/** Trả về ngày theo giờ VN (UTC+7) dạng "YYYY-MM-DD" */
const toVNDateString = (date = new Date()) => {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 10);
};

// Keep the staff booking flow subject to the same seat-selection policy as customer booking.
const buildSeatSelectionMeta = (seatLayout, soldSeatCodes) => {
  const units = [];
  const soldCodes = soldSeatCodes || new Set();

  (seatLayout?.rows || []).forEach((row, rowIndex) => {
    const rowUnits = [...(row.units || [])].sort(
      (a, b) => a.columnStart - b.columnStart || a.span - b.span,
    );
    let sectionIndex = -1;
    let previousEnd = 0;

    rowUnits.forEach((unit, unitIndex) => {
      const columnStart = Number(unit.columnStart || 1);
      const span = Math.max(1, Number(unit.span || 1));
      if (unitIndex === 0 || columnStart > previousEnd + 1) sectionIndex += 1;

      units.push({
        ...unit,
        sold: unit.sold || unit.seatCodes.some((code) => soldCodes.has(String(code).toUpperCase())),
        rowIndex,
        unitIndex,
        sectionIndex,
      });
      previousEnd = columnStart + span - 1;
    });
  });

  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  const availableBySectionRow = new Map();
  units.filter((unit) => !unit.sold).forEach((unit) => {
    if (!availableBySectionRow.has(unit.sectionIndex)) {
      availableBySectionRow.set(unit.sectionIndex, new Map());
    }
    const rowMap = availableBySectionRow.get(unit.sectionIndex);
    if (!rowMap.has(unit.rowIndex)) rowMap.set(unit.rowIndex, []);
    rowMap.get(unit.rowIndex).push(unit);
  });
  availableBySectionRow.forEach((rowMap) => rowMap.forEach((rowUnits) => {
    rowUnits.sort((a, b) => a.unitIndex - b.unitIndex);
  }));

  return { unitMap, availableBySectionRow };
};

const validateSeatSelectionRules = (selectedSeatIds, selectionMeta) => {
  if (!selectedSeatIds.length) return "";
  const { unitMap, availableBySectionRow } = selectionMeta;
  const selectedUnits = selectedSeatIds.map((id) => unitMap.get(id)).filter(Boolean).sort(
    (a, b) => a.sectionIndex - b.sectionIndex || a.rowIndex - b.rowIndex || a.unitIndex - b.unitIndex,
  );
  if (selectedUnits.length !== selectedSeatIds.length) return "Không thể xác định đầy đủ ghế đã chọn. Vui lòng chọn lại.";

  const sectionIndex = selectedUnits[0].sectionIndex;
  if (selectedUnits.some((unit) => unit.sectionIndex !== sectionIndex)) {
    return "Chỉ được chọn ghế trong cùng một nhánh, không vượt qua khoảng cách giữa.";
  }

  const selectedByRow = new Map();
  selectedUnits.forEach((unit) => {
    if (!selectedByRow.has(unit.rowIndex)) selectedByRow.set(unit.rowIndex, []);
    selectedByRow.get(unit.rowIndex).push(unit);
  });
  const rowIndexes = [...selectedByRow.keys()].sort((a, b) => a - b);

  for (const rowIndex of rowIndexes) {
    const selectedRowUnits = [...selectedByRow.get(rowIndex)].sort((a, b) => a.unitIndex - b.unitIndex);
    if (selectedRowUnits.length <= 1) continue;
    const availableRowUnits = availableBySectionRow.get(sectionIndex)?.get(rowIndex) || [];
    const min = selectedRowUnits[0].unitIndex;
    const max = selectedRowUnits[selectedRowUnits.length - 1].unitIndex;
    const selectedIds = new Set(selectedRowUnits.map((unit) => unit.id));
    const skipped = availableRowUnits.find((unit) => unit.unitIndex >= min && unit.unitIndex <= max && !selectedIds.has(unit.id));
    if (skipped) {
      return `Không được bỏ trống ghế giữa các ghế đã chọn. Ghế ${skipped.label || skipped.id} còn trống và nằm giữa ghế đã chọn.`;
    }
  }

  for (let index = 1; index < rowIndexes.length; index += 1) {
    if (rowIndexes[index] !== rowIndexes[index - 1] + 1) return "Chỉ được chọn thêm ghế ở hàng trên hoặc dưới liền kề.";
  }

  const partialRows = rowIndexes.filter((rowIndex) => {
    const available = availableBySectionRow.get(sectionIndex)?.get(rowIndex) || [];
    return selectedByRow.get(rowIndex).length < available.length;
  });
  if (partialRows.length > 1) return "Hàng ngang trong nhánh hiện tại phải kín trước khi chọn sang hàng trên hoặc dưới.";
  if (partialRows.length === 1 && rowIndexes.length > 1 && partialRows[0] !== rowIndexes[0] && partialRows[0] !== rowIndexes[rowIndexes.length - 1]) {
    return "Chỉ được mở rộng sang hàng trên hoặc dưới khi các hàng ở giữa đã chọn kín.";
  }
  return "";
};

const getFoodIcon = (item) => {
  const popcornQty = Number(item?.popcorn_quantity || 0);
  const drinkQty = Number(item?.drink_quantity || 0);
  if (popcornQty > 0 && drinkQty === 0) return "🍿";
  if (drinkQty > 0 && popcornQty === 0) return "🥤";
  if (drinkQty >= 4) return "🎉";
  return "🍿🥤";
};

const getFoodSummary = (item) => {
  const contents = [];
  const popcornQty = Number(item?.popcorn_quantity || 0);
  const drinkQty = Number(item?.drink_quantity || 0);
  if (popcornQty > 0) contents.push(`${popcornQty} bắp`);
  if (drinkQty > 0) contents.push(`${drinkQty} nước`);
  return contents.join(" + ") || String(item?.description || "Tùy chọn").trim();
};

function FoodItemCard({ item, quantity, onChange }) {
  const selected = quantity > 0;
  return (
    <article className={`admin-food-card${selected ? " selected" : ""}`}>
      <div className="admin-food-icon" aria-hidden="true">{getFoodIcon(item)}</div>
      <div className="admin-food-content">
        <h4>{item.combo_name}</h4>
        <p>{getFoodSummary(item)}</p>
        <strong>{fmtMoney(item.price)}</strong>
      </div>
      <div className="admin-food-quantity" aria-label={`Số lượng ${item.combo_name}`}>
        <button type="button" onClick={() => onChange(-1)} disabled={quantity === 0} aria-label={`Giảm ${item.combo_name}`}>−</button>
        <span>{quantity}</span>
        <button type="button" onClick={() => onChange(1)} aria-label={`Tăng ${item.combo_name}`}>+</button>
      </div>
    </article>
  );
}

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
  const [selectedDate, setSelectedDate] = useState(() => toVNDateString());
  const [selectedShowtime, setSelectedShowtime] = useState(null);

  // Step 3: Seats
  const [seats, setSeats] = useState([]);
  const [seatLoading, setSeatLoading] = useState(false);
  const [soldSeatCodes, setSoldSeatCodes] = useState(new Set());
  const [roomSeatGaps, setRoomSeatGaps] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatLoadError, setSeatLoadError] = useState("");
  const [seatRuleError, setSeatRuleError] = useState("");

  // Step 4: Combos
  const [comboList, setComboList] = useState([]);
  const [comboCounts, setComboCounts] = useState({});

  // Step 5: Payment
  const [paymentMethod, setPaymentMethod] = useState("cashier");
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const debounceRef = useRef(null);
  const seatRuleTimerRef = useRef(null);

  const showSeatRuleError = (message) => {
    setSeatRuleError(message);
    if (seatRuleTimerRef.current) clearTimeout(seatRuleTimerRef.current);
    seatRuleTimerRef.current = setTimeout(() => {
      setSeatRuleError("");
      seatRuleTimerRef.current = null;
    }, 5000);
  };

  // Initial load: cinemas, combos
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const [cinemaResult, comboResult, showtimeCinemaResult] = await Promise.allSettled([
          adminCinemaService.getAllCinemas(),
          adminComboService.getAll(),
          adminShowtimeService.getCinemas(),
        ]);

        if (ignore) return;

        const listC = normalizeCinemaList(
          cinemaResult.status === "fulfilled" ? cinemaResult.value : null,
        );
        const fromShowtimeCinemas = normalizeCinemaList(
          showtimeCinemaResult.status === "fulfilled" ? showtimeCinemaResult.value : null,
        );
        const finalCinemas = listC.length > 0 ? listC : fromShowtimeCinemas;

        const comboData = comboResult.status === "fulfilled" ? comboResult.value : null;
        const listCombo = Array.isArray(comboData?.combos)
          ? comboData.combos
          : (Array.isArray(comboData) ? comboData : []);

        setCinemas(finalCinemas);
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

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => () => {
    if (seatRuleTimerRef.current) clearTimeout(seatRuleTimerRef.current);
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
          const stDate = toVNDateString(new Date(st.start_time));
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
      setSeatLoadError("");
      setSeatRuleError("");
      try {
        const roomId = selectedShowtime.room_id;
        const showtimeId = selectedShowtime.showtime_id || selectedShowtime.id;
        const cinemaId = selectedShowtime.cinema_id || selectedShowtime.cinemaId || selectedShowtime.cinemas_id;

        const [seatRes, soldRes] = await Promise.all([
          adminSeatService.getSeatsByRoom(roomId).catch(() => ({ seats: [] })),
          adminBookingService.getSoldSeats(showtimeId).catch(() => ({ soldSeats: [] })),
        ]);
        if (ignore) return;

        const seatList = Array.isArray(seatRes?.seats) ? seatRes.seats : (Array.isArray(seatRes) ? seatRes : []);
        setSeats(seatList);

        // Sold seats chính xác theo suất chiếu
        const sold = new Set(
          (Array.isArray(soldRes?.soldSeats) ? soldRes.soldSeats : [])
            .map(c => String(c).toUpperCase())
        );
        setSoldSeatCodes(sold);

        // Load room seat gaps
        try {
          if (cinemaId) {
            const cinemaRes = await adminCinemaService.getCinemaById(cinemaId).catch(() => ({}));
            const rooms = Array.isArray(cinemaRes?.cinema?.rooms) ? cinemaRes.cinema.rooms : [];
            const room = rooms.find(r => Number(r.room_id || r.id) === Number(roomId));
            setRoomSeatGaps(Array.isArray(room?.seat_gaps) ? room.seat_gaps : []);
          } else {
            setRoomSeatGaps([]);
          }
        } catch (e) {
          setRoomSeatGaps([]);
        }
      } catch (e) {
        if (!ignore) setSeatLoadError("Không thể tải ghế.");
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
    if (newCustomerForm.birthday && !isValidBirthDate(newCustomerForm.birthday)) e.birthday = BIRTH_DATE_ERROR;
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
    if (!canGoStep4()) { showSeatRuleError("Vui lòng chọn ít nhất một ghế."); return; }
    setSeatRuleError(""); setStep(4);
  };
  const goStep5 = () => setStep(5);

  const toggleSeat = (seatId) => {
    setSelectedSeats((prev) => {
      const next = prev.includes(seatId)
        ? prev.filter((id) => id !== seatId)
        : [...prev, seatId];
      const ruleMessage = validateSeatSelectionRules(next, seatSelectionMeta);
      if (ruleMessage) {
        showSeatRuleError(ruleMessage);
        return prev;
      }
      setSeatRuleError("");
      return next;
    });
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

  // Build seat layout (grid) similar to frontend user booking
  const parseSeatCode = (seatCode) => {
    const match = String(seatCode || "").trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
    if (!match) return null;
    return { row: match[1], number: Number(match[2]) };
  };

  const normalizeSeatType = (seatType) => {
    const normalized = String(seatType || "Standard").toLowerCase();
    if (normalized === "vip") return "vip";
    if (normalized === "couple") return "couple";
    return "regular";
  };

  const seatLayout = useMemo(() => {
    const parsedSeats = (seats || []).map((seat) => {
      const parsed = parseSeatCode(seat.seat_code);
      if (!parsed) return null;
      return {
        ...seat,
        row: parsed.row,
        number: parsed.number,
        normalizedType: normalizeSeatType(seat.seat_type),
      };
    }).filter(Boolean).sort((a, b) => (a.row !== b.row ? a.row.localeCompare(b.row, 'en') : a.number - b.number));

    if (parsedSeats.length === 0) return { rows: [], totalVisualColumns: 1 };

    const minSeatNumber = Math.min(...parsedSeats.map(s => s.number));
    const maxSeatNumber = Math.max(...parsedSeats.map(s => s.number));

    const gaps = (Array.isArray(roomSeatGaps) ? roomSeatGaps : [])
      .map((gap) => ({
        from: Number(gap?.gap_from ?? gap?.from ?? 0) || 0,
        to: Number(gap?.gap_to ?? gap?.to ?? 0) || 0,
        sortOrder: Number(gap?.sort_order ?? 0) || 0,
      }))
      .filter((gap) => gap.from > 0 && gap.to > gap.from)
      .sort((a, b) => a.from - b.from || a.sortOrder - b.sortOrder);

    const getGapOffset = (seatNumber) => gaps.filter((gap) => gap.to <= seatNumber).length;
    const totalGapSeats = gaps.length;

    const rowsByName = new Map();
    parsedSeats.forEach((seat) => {
      if (!rowsByName.has(seat.row)) rowsByName.set(seat.row, []);
      rowsByName.get(seat.row).push(seat);
    });

    const rows = Array.from(rowsByName.entries()).map(([rowName, rowSeats]) => {
      const units = [];
      for (let i = 0; i < rowSeats.length; i += 1) {
        const current = rowSeats[i];
        const next = rowSeats[i + 1];
        if (current.normalizedType === 'couple' && next && next.normalizedType === 'couple' && next.number === current.number + 1) {
          units.push({
            id: `${current.seat_code}_${next.seat_code}`,
            label: `${current.number}-${next.number}`,
            seatCodes: [current.seat_code, next.seat_code],
            startNumber: current.number,
            endNumber: next.number,
            type: 'couple',
            sold: current.status !== 'active' || next.status !== 'active',
            columnStart: Math.max(1, current.number - minSeatNumber + 1) + getGapOffset(current.number),
            span: 2,
          });
          i += 1;
          continue;
        }
        units.push({
          id: current.seat_code,
          label: current.seat_code,
          seatCodes: [current.seat_code],
          startNumber: current.number,
          endNumber: current.number,
          type: current.normalizedType,
          sold: current.status !== 'active',
          columnStart: Math.max(1, current.number - minSeatNumber + 1) + getGapOffset(current.number),
          span: 1,
        });
      }
      return { row: rowName, units };
    });

    return { rows, totalVisualColumns: Math.max(1, maxSeatNumber - minSeatNumber + 1 + totalGapSeats) };
  }, [seats, roomSeatGaps]);

  const seatSelectionMeta = useMemo(
    () => buildSeatSelectionMeta(seatLayout, soldSeatCodes),
    [seatLayout, soldSeatCodes],
  );
  const selectedSeatUnits = useMemo(
    () => selectedSeats.map((id) => seatSelectionMeta.unitMap.get(id)).filter(Boolean),
    [selectedSeats, seatSelectionMeta],
  );
  const seatTotal = selectedSeatUnits.reduce(
    (sum, unit) => sum + getSeatPrice(unit.type, selectedShowtime),
    0,
  );
  const comboTotal = comboList.reduce(
    (sum, c) => sum + Number(comboCounts[c.combo_id] || 0) * Number(c.price || 0),
    0,
  );
  const totalAmount = seatTotal + comboTotal;
  const singleFoodItems = useMemo(
    () => comboList.filter((item) => String(item?.category || "combo").toLowerCase() === "single"),
    [comboList],
  );
  const comboFoodItems = useMemo(
    () => comboList.filter((item) => String(item?.category || "combo").toLowerCase() !== "single"),
    [comboList],
  );
  const changeFoodQuantity = (comboId, delta) => {
    setComboCounts((previous) => ({
      ...previous,
      [comboId]: Math.max(0, Number(previous[comboId] || 0) + delta),
    }));
  };

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

      const seatUnits = selectedSeatUnits.map((unit) => ({
        id: unit.id,
        label: unit.label,
        type: unit.type,
        seatCodes: unit.seatCodes,
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
          <div className="sf-detail-row"><span>Ghế</span><strong>{(b.seats || selectedSeatUnits.flatMap((unit) => unit.seatCodes)).join(", ")}</strong></div>
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
                <div style={{ minHeight: 200, maxHeight: 340, overflowY: "auto", border: "1px solid #1e2a55", borderRadius: 10 }}>
                  {searchLoading ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff" }}>Đang tìm…</div>
                  ) : !searchQuery.trim() ? (
                    <div style={{ padding: 32, textAlign: "center", color: "#4b5563" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
                      <div style={{ fontSize: 13 }}>Nhập tên, email hoặc số điện thoại để tìm khách hàng</div>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff", fontSize: 13 }}>
                      Không tìm thấy tài khoản nào khớp với &ldquo;{searchQuery}&rdquo;
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
                        min={getBirthDateBounds().min}
                        max={getBirthDateBounds().max}
                        onChange={(e) => setNewCustomerForm(p => ({ ...p, birthday: e.target.value }))}
                      />
                      {newCustomerErrors.birthday && <span className="sf-error">{newCustomerErrors.birthday}</span>}
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
        {step === 2 && (() => {
          // Build quick date buttons: hôm nay + 6 ngày tiếp theo
          const quickDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const iso = toVNDateString(d);
            const label = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
            return { iso, label };
          });

          // Group showtimes by movie
          const grouped = showtimes.reduce((acc, st) => {
            const key = st.movie_title || `Phim #${st.movie_id}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(st);
            return acc;
          }, {});

          return (
            <div>
              <h3 style={{ marginBottom: 16 }}>Bước 2: Chọn suất chiếu</h3>

              {/* Rạp */}
              <div className="sf-field" style={{ marginBottom: 14 }}>
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

              {/* Date picker nhanh */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: "#8fa6ff", marginBottom: 8, fontWeight: 500 }}>Chọn ngày</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                  {quickDates.map(({ iso, label }) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => { setSelectedDate(iso); setSelectedShowtime(null); }}
                      className={`sf-btn sm ${selectedDate === iso ? "sf-btn-add" : "sf-btn-secondary"}`}
                      style={{ fontSize: 12, padding: "6px 12px" }}
                    >
                      {label}
                    </button>
                  ))}
                  {/* Input ngày tùy chọn */}
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedShowtime(null); }}
                    style={{
                      background: "rgba(30,42,85,0.7)", border: "1px solid rgba(124,97,255,0.3)",
                      borderRadius: 8, color: "#eef4ff", padding: "6px 10px", fontSize: 12,
                      cursor: "pointer",
                    }}
                  />
                </div>
              </div>

              {/* Danh sách suất chiếu */}
              {!selectedCinemaId ? (
                <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff", border: "1px solid #1e2a55", borderRadius: 10 }}>
                  Vui lòng chọn rạp trước.
                </div>
              ) : showtimeLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff", border: "1px solid #1e2a55", borderRadius: 10 }}>
                  Đang tải suất chiếu…
                </div>
              ) : showtimes.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff", border: "1px solid #1e2a55", borderRadius: 10 }}>
                  Không có suất chiếu vào ngày đã chọn.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(grouped).map(([movieName, sts]) => (
                    <div key={movieName}>
                      {/* Movie header */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 12px", background: "rgba(124,97,255,0.08)", borderRadius: 8 }}>
                        <span style={{ fontSize: 16 }}>🎬</span>
                        <strong style={{ color: "#c4b5fd", fontSize: 14 }}>{movieName}</strong>
                        <span style={{ fontSize: 12, color: "#7a8fc0", marginLeft: "auto" }}>{sts.length} suất</span>
                      </div>

                      {/* Showtime buttons grouped by room */}
                      {(() => {
                        const byRoom = sts.reduce((acc, st) => {
                          const rk = st.room_name || `Phòng #${st.room_id}`;
                          if (!acc[rk]) acc[rk] = [];
                          acc[rk].push(st);
                          return acc;
                        }, {});
                        return Object.entries(byRoom).map(([roomName, roomSts]) => (
                          <div key={roomName} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: "#7a8fc0", marginBottom: 6, paddingLeft: 4 }}>
                              📍 {roomName} · {roomSts[0]?.room_type || ""}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              {roomSts
                                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                                .map(st => {
                                  const isSelected = selectedShowtime?.showtime_id === st.showtime_id;
                                  const isEnded = st.status === 'ended';
                                  const timeLabel = st.start_time
                                    ? new Date(st.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
                                    : "—";
                                  return (
                                    <button
                                      key={st.showtime_id}
                                      type="button"
                                      disabled={isEnded}
                                      onClick={() => setSelectedShowtime(st)}
                                      style={{
                                        padding: "8px 14px",
                                        borderRadius: 10,
                                        border: isSelected ? "2px solid #7c61ff" : "1px solid rgba(255,255,255,0.12)",
                                        background: isSelected ? "rgba(124,97,255,0.25)" : isEnded ? "rgba(255,255,255,0.04)" : "rgba(30,42,85,0.7)",
                                        color: isEnded ? "#4b5563" : isSelected ? "#c4b5fd" : "#eef4ff",
                                        cursor: isEnded ? "not-allowed" : "pointer",
                                        fontSize: 13,
                                        fontWeight: isSelected ? 700 : 400,
                                        minWidth: 70,
                                        textAlign: "center",
                                        position: "relative",
                                      }}
                                    >
                                      <div>{timeLabel}</div>
                                      <div style={{ fontSize: 11, color: isSelected ? "#a78bfa" : "#7a8fc0", marginTop: 2 }}>
                                        {fmtMoney(st.price_standard || st.price || 80000)}
                                      </div>
                                      {st.available_seats !== undefined && (
                                        <div style={{ fontSize: 10, color: st.available_seats > 0 ? "#4ade80" : "#f87171", marginTop: 1 }}>
                                          {st.available_seats > 0 ? `${st.available_seats} ghế` : "Hết ghế"}
                                        </div>
                                      )}
                                      {isEnded && (
                                        <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>Đã chiếu</div>
                                      )}
                                      {isSelected && (
                                        <div style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, background: "#7c61ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✓</div>
                                      )}
                                    </button>
                                  );
                                })}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  ))}
                </div>
              )}

              {/* Suất đã chọn summary */}
              {selectedShowtime && (
                <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(124,97,255,0.1)", border: "1px solid rgba(124,97,255,0.25)", fontSize: 13 }}>
                  ✅ Đã chọn: <strong style={{ color: "#c4b5fd" }}>{selectedShowtime.movie_title}</strong>
                  {" · "}{selectedShowtime.room_name}
                  {" · "}<strong style={{ color: "#7c61ff" }}>
                    {new Date(selectedShowtime.start_time).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </strong>
                </div>
              )}

              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
                <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(1)}>← Quay lại</button>
                <button className="sf-btn sf-btn-add sf-btn-lg" onClick={goStep3} disabled={!canGoStep3()}>Tiếp theo →</button>
              </div>
            </div>
          );
        })()}

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
            ) : seatLoadError ? (
              <div style={{ padding: 20, textAlign: "center", color: "#f87171" }}>{seatLoadError}</div>
            ) : seatLayout.rows.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8fa6ff" }}>Không có dữ liệu ghế cho phòng này.</div>
            ) : (
              <div className="admin-seat-scroll">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "max-content", margin: "0 auto" }}>
                  <div
                    className="booking-seat-grid-map"
                    style={{
                      "--booking-grid-columns": seatLayout.totalVisualColumns,
                      "--booking-seat-size": "42px",
                      "--booking-seat-gap": "8px",
                    }}
                  >
                    {seatLayout.rows.map((row) => (
                      <div className="admin-seat-row" key={row.row}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <div style={{ width: 28, minWidth: 28, textAlign: "center", fontWeight: 700, color: "#7a8fc0", fontSize: 13 }}>{row.row}</div>
                          <div
                            className="booking-seat-grid-row"
                            style={{ "--booking-grid-columns": seatLayout.totalVisualColumns }}
                          >
                            {row.units.map((unit) => {
                              const isSold = unit.sold || unit.seatCodes.some(c => soldSeatCodes.has(String(c).toUpperCase()));
                              const isSelected = selectedSeats.includes(unit.id);
                              const t = unit.type || "regular";
                              return (
                                <button
                                  key={unit.id}
                                  type="button"
                                  disabled={isSold}
                                  onClick={() => !isSold && toggleSeat(unit.id)}
                                  title={unit.seatCodes.join(", ")}
                                  className={`booking-seat booking-seat-${t}${isSold ? " booking-seat-sold" : ""}${isSelected ? " selected" : ""}`}
                                  style={{ gridColumn: `${unit.columnStart} / span ${unit.span}` }}
                                >
                                  <span className="booking-seat-text">{unit.label}</span>
                                </button>
                              );
                            })}
                          </div>
                          <div style={{ width: 28, minWidth: 28, textAlign: "center", fontWeight: 700, color: "#7a8fc0", fontSize: 13 }}>{row.row}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 16, marginTop: 24, justifyContent: "center", flexWrap: "wrap", fontSize: 13 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(180deg,rgba(61,74,110,.92),rgba(43,54,87,.98))", border: "1px solid rgba(255,255,255,.09)", display: "inline-block" }} />
                Ghế thường (80k)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(180deg,#ffd36f,#eb9830)", display: "inline-block" }} />
                Ghế VIP (100k)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(180deg,#ff7084,#f43f5e)", display: "inline-block" }} />
                Ghế Đôi (120k)
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(135deg,#7f6bff,#6552ff)", display: "inline-block" }} />
                Đang chọn
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", display: "inline-block" }} />
                Đã bán
              </span>
            </div>
            {seatRuleError && (
              <div className="admin-seat-rule-toast" role="alert">
                <span>⚠</span>
                <span>{seatRuleError}</span>
                <button type="button" onClick={() => setSeatRuleError("")} aria-label="Đóng cảnh báo">×</button>
              </div>
            )}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>Đã chọn <strong style={{ color: "#7c61ff" }}>{selectedSeats.length}</strong> vị trí · Tổng: <strong style={{ color: "#fbbf24" }}>{fmtMoney(seatTotal)}</strong></div>
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
            <div className="admin-food-heading">
              <div>
                <h3>Bước 4: Bắp, nước &amp; combo</h3>
                <p>Chọn món lẻ hoặc combo phù hợp cho khách hàng.</p>
              </div>
              {comboTotal > 0 && <strong>Đã chọn: {fmtMoney(comboTotal)}</strong>}
            </div>

            {comboList.length === 0 ? (
              <div className="admin-food-empty">Hiện chưa có sản phẩm nào đang bán.</div>
            ) : (
              <div className="admin-food-sections">
                <section className="admin-food-section">
                  <div className="admin-food-section-title">
                    <span>🍿</span>
                    <div><h4>Bắp &amp; nước lẻ</h4><p>Thêm riêng từng phần theo nhu cầu.</p></div>
                  </div>
                  {singleFoodItems.length > 0 ? (
                    <div className="admin-food-grid">
                      {singleFoodItems.map((item) => (
                        <FoodItemCard
                          key={item.combo_id}
                          item={item}
                          quantity={Number(comboCounts[item.combo_id] || 0)}
                          onChange={(delta) => changeFoodQuantity(item.combo_id, delta)}
                        />
                      ))}
                    </div>
                  ) : <p className="admin-food-empty-section">Chưa có bắp hoặc nước lẻ.</p>}
                </section>

                <section className="admin-food-section">
                  <div className="admin-food-section-title">
                    <span>🎁</span>
                    <div><h4>Combo</h4><p>Tiết kiệm hơn khi mua theo phần.</p></div>
                  </div>
                  {comboFoodItems.length > 0 ? (
                    <div className="admin-food-grid">
                      {comboFoodItems.map((item) => (
                        <FoodItemCard
                          key={item.combo_id}
                          item={item}
                          quantity={Number(comboCounts[item.combo_id] || 0)}
                          onChange={(delta) => changeFoodQuantity(item.combo_id, delta)}
                        />
                      ))}
                    </div>
                  ) : <p className="admin-food-empty-section">Chưa có combo nào đang bán.</p>}
                </section>
              </div>
            )}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>Tạm tính đồ ăn: <strong style={{ color: "#fbbf24" }}>{fmtMoney(comboTotal)}</strong></div>
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
                <div className="sf-detail-row"><span>Ghế ({selectedSeats.length})</span><strong>{selectedSeatUnits.map((unit) => unit.label).join(", ")}</strong></div>
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
