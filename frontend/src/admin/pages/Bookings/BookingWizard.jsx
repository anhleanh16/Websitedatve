import { useState, useEffect, useMemo, useRef } from "react";
import { FaCheckCircle, FaCreditCard, FaMobileAlt, FaMoneyBillWave, FaSearch, FaUniversity, FaWifi } from "react-icons/fa";
import {
  adminBookingService,
  adminUserService,
  adminShowtimeService,
  adminCinemaService,
  adminSeatService,
  adminComboService,
  adminMovieService,
} from "../../services/adminApi.js";
import { BIRTH_DATE_ERROR, getBirthDateBounds, isValidBirthDate } from "../../../utils/birthDate.js";
import { toAbsoluteAssetUrl } from "../../../utils/api.js";
import { printTicketPdf } from "../../../utils/ticketPrint.js";
import { PAYMENT_BANKS, PAYMENT_BANK_INFO, getPaymentBankLogo } from "../../../utils/paymentConfig.js";
import { buildVietQROnlyImageUrl } from "../../../user/utils/vietqr.js";

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
const BANK_BIN_MAP = Object.fromEntries(PAYMENT_BANKS.map((bank) => [bank.id, bank.bin]));

const toTransferText = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/gi, "d")
  .replace(/[^a-zA-Z0-9\s]/g, "")
  .trim()
  .replace(/\s+/g, " ");

const BOOKING_PHONE_REGEX = /^0\d{9,}$/;
const sanitizeBookingPhone = (value) => String(value || "").replace(/\D/g, "");
const MOVIE_STATUS_GROUPS = [
  { value: "now_showing", label: "Đang chiếu", icon: "▶", className: "showing" },
  { value: "coming_soon", label: "Sắp chiếu", icon: "◷", className: "coming" },
  { value: "ended", label: "Kết thúc", icon: "■", className: "ended" },
];

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
  const comboImage = item?.image ? toAbsoluteAssetUrl(item.image) : "";

  return (
    <article className={`admin-food-card${selected ? " selected" : ""}`}>
      <div className="admin-food-icon" aria-hidden="true">
        {comboImage ? (
          <img src={comboImage} alt={item.combo_name} className="admin-food-image" onError={(event) => { event.target.style.display = "none"; }} />
        ) : (
          getFoodIcon(item)
        )}
      </div>
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
  const [guestCustomerForm, setGuestCustomerForm] = useState({
    full_name: "", phone: "", email: "",
  });
  const [guestCustomerErrors, setGuestCustomerErrors] = useState({});

  // Step 2: Movie
  const [movieList, setMovieList] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [movieStatusFilter, setMovieStatusFilter] = useState("now_showing");

  // Step 3: Showtime
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
  const [selectedBank, setSelectedBank] = useState("VCB");
  const [bankSearch, setBankSearch] = useState("");
  const [nfcStatus, setNfcStatus] = useState("idle");
  const [nfcMessage, setNfcMessage] = useState("");
  const [nfcReference, setNfcReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState(null);

  const debounceRef = useRef(null);
  const seatRuleTimerRef = useRef(null);
  const nfcAbortRef = useRef(null);

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
        const [movieResult, cinemaResult, comboResult, showtimeCinemaResult] = await Promise.allSettled([
          adminMovieService.getAllMovies(false),
          adminCinemaService.getAllCinemas(),
          adminComboService.getAll(),
          adminShowtimeService.getCinemas(),
        ]);

        if (ignore) return;

        const movieData = movieResult.status === "fulfilled" ? movieResult.value : null;
        const normalizedMovies = Array.isArray(movieData?.movies)
          ? movieData.movies
          : (Array.isArray(movieData) ? movieData : []);
        setMovieList(normalizedMovies.filter((movie) => String(movie?.status || "").toLowerCase() !== "hidden"));

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
    nfcAbortRef.current?.abort();
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

  // Load showtimes when cinema/date/movie change
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
          const matchesDate = stDate === selectedDate;
          const matchesMovie = !selectedMovieId || String(st.movie_id) === String(selectedMovieId) || String(st.movieId) === String(selectedMovieId);
          return matchesDate && matchesMovie;
        });
        setShowtimes(filtered);
      } catch (e) {
        if (!ignore) setShowtimes([]);
      } finally {
        if (!ignore) setShowtimeLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [selectedCinemaId, selectedDate, selectedMovieId]);

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
    else if (!BOOKING_PHONE_REGEX.test(newCustomerForm.phone.trim())) {
      e.phone = "Số điện thoại phải bắt đầu bằng 0 và có ít nhất 10 chữ số.";
    }
    if (newCustomerForm.birthday && !isValidBirthDate(newCustomerForm.birthday)) e.birthday = BIRTH_DATE_ERROR;
    return e;
  };

  const validateGuestCustomer = () => {
    const e = {};
    if (!guestCustomerForm.full_name.trim()) e.full_name = "Nhập họ tên.";
    if (!guestCustomerForm.phone.trim()) e.phone = "Nhập số điện thoại.";
    else if (!BOOKING_PHONE_REGEX.test(guestCustomerForm.phone.trim())) {
      e.phone = "Số điện thoại phải bắt đầu bằng 0 và có ít nhất 10 chữ số.";
    }
    if (
      guestCustomerForm.email.trim()
      && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestCustomerForm.email.trim())
    ) {
      e.email = "Email không hợp lệ.";
    }
    return e;
  };

  const canGoStep2 = () => {
    if (customerMode === "existing_user") return !!selectedCustomer;
    if (customerMode === "guest") {
      const e = validateGuestCustomer();
      setGuestCustomerErrors(e);
      return Object.keys(e).length === 0;
    }
    const e = validateNewCustomer();
    setNewCustomerErrors(e);
    return Object.keys(e).length === 0;
  };

  const goStep2 = () => { if (canGoStep2()) setStep(2); };
  const canGoStep3 = () => !!selectedMovieId;
  const goStep3 = () => { if (canGoStep3()) setStep(3); };
  const canGoStep4 = () => !!selectedShowtime;
  const goStep4 = () => { if (canGoStep4()) setStep(4); };
  const canGoStep5 = () => selectedSeats.length > 0;
  const goStep5 = () => {
    if (!canGoStep5()) { showSeatRuleError("Vui lòng chọn ít nhất một ghế."); return; }
    setSeatRuleError(""); setStep(5);
  };
  const goStep6 = () => setStep(6);

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
  const subtotalAmount = seatTotal + comboTotal;
  const membershipPercent = customerMode === "existing_user"
    ? Number(selectedCustomer?.membership_discount || 0)
    : 0;
  const membershipDiscount = Math.round(subtotalAmount * membershipPercent / 100);
  const amountAfterMembership = Math.max(0, subtotalAmount - membershipDiscount);
  const serviceFee = Math.round(amountAfterMembership * 0.08);
  const totalAmount = amountAfterMembership + serviceFee;
  const selectedMovie = useMemo(
    () => movieList.find((movie) => String(movie.movie_id) === String(selectedMovieId)) || null,
    [movieList, selectedMovieId],
  );
  const movieStatusCounts = useMemo(() => MOVIE_STATUS_GROUPS.reduce((counts, group) => ({
    ...counts,
    [group.value]: movieList.filter((movie) => String(movie?.status || "now_showing") === group.value).length,
  }), {}), [movieList]);
  const filteredMovieList = useMemo(
    () => movieList.filter((movie) => String(movie?.status || "now_showing") === movieStatusFilter),
    [movieList, movieStatusFilter],
  );
  const transferNote = useMemo(() => [
    PAYMENT_BANK_INFO.prefix,
    customerMode === "existing_user"
      ? selectedCustomer?.full_name
      : customerMode === "guest"
        ? guestCustomerForm.full_name
        : newCustomerForm.full_name,
    selectedMovie?.title || selectedShowtime?.movie_title,
    selectedSeatUnits.flatMap((unit) => unit.seatCodes).join(" "),
  ].map(toTransferText).filter(Boolean).join("_").slice(0, 150), [
    customerMode,
    guestCustomerForm.full_name,
    newCustomerForm.full_name,
    selectedCustomer?.full_name,
    selectedMovie?.title,
    selectedSeatUnits,
    selectedShowtime?.movie_title,
  ]);
  const selectedPaymentBank = PAYMENT_BANKS.find((bank) => bank.id === selectedBank) || PAYMENT_BANKS[0];
  const bankQrUrl = useMemo(() => buildVietQROnlyImageUrl({
    bankBin: BANK_BIN_MAP[selectedBank] || BANK_BIN_MAP.VCB,
    accountNumber: PAYMENT_BANK_INFO.accountNumber,
    amount: totalAmount,
    addInfo: transferNote,
    accountName: PAYMENT_BANK_INFO.accountName,
  }), [selectedBank, totalAmount, transferNote]);
  const filteredPaymentBanks = useMemo(() => PAYMENT_BANKS.filter((bank) => (
    !bankSearch || bank.label.toLowerCase().includes(bankSearch.toLowerCase())
  )), [bankSearch]);
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

  const choosePaymentMethod = (method) => {
    setPaymentMethod(method);
    if (method !== "card_nfc") {
      nfcAbortRef.current?.abort();
      nfcAbortRef.current = null;
      setNfcStatus("idle");
      setNfcMessage("");
      setNfcReference("");
    }
  };

  const finishNfcScan = () => {
    const reference = `NFC-${Date.now().toString(36).toUpperCase()}`;
    nfcAbortRef.current?.abort();
    nfcAbortRef.current = null;
    setNfcReference(reference);
    setNfcStatus("scanned");
    setNfcMessage("Đã nhận tín hiệu từ đầu đọc NFC/POS. Hãy kiểm tra trạng thái giao dịch trên máy POS trước khi tạo vé.");
  };

  const startNfcScan = async () => {
    nfcAbortRef.current?.abort();
    const controller = new AbortController();
    nfcAbortRef.current = controller;
    setNfcStatus("scanning");
    setNfcMessage(
      typeof window !== "undefined" && "NDEFReader" in window
        ? "Đang chờ thẻ hoặc thiết bị chạm vào đầu đọc NFC…"
        : "Đang chờ tín hiệu từ đầu đọc NFC/POS USB… Hãy chạm thẻ rồi chờ thiết bị gửi mã.",
    );
    setNfcReference("");

    // Desktop POS/NFC readers commonly work as a USB keyboard. The key stream
    // is handled by the effect below, so Web NFC support is not required.
    if (typeof window === "undefined" || !("NDEFReader" in window)) return;

    try {
      const reader = new window.NDEFReader();
      reader.onreading = finishNfcScan;
      reader.onreadingerror = () => {
        setNfcStatus("error");
        setNfcMessage("Không đọc được NFC. Giữ thẻ sát đầu đọc và thử lại.");
      };
      await reader.scan({ signal: controller.signal });
    } catch (error) {
      if (error?.name !== "AbortError") {
        setNfcStatus("error");
        setNfcMessage(error?.message || "Không thể khởi động đầu đọc NFC.");
      }
    }
  };

  useEffect(() => {
    if (paymentMethod !== "card_nfc" || nfcStatus !== "scanning") return undefined;

    let scanBuffer = "";
    let lastKeyAt = 0;
    const handleScannerKey = (event) => {
      const now = Date.now();

      if (event.key === "Enter") {
        if (scanBuffer.length >= 4) {
          event.preventDefault();
          finishNfcScan();
        }
        scanBuffer = "";
        lastKeyAt = 0;
        return;
      }

      if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return;
      if (lastKeyAt && now - lastKeyAt > 180) scanBuffer = "";
      scanBuffer += event.key;
      lastKeyAt = now;
    };

    window.addEventListener("keydown", handleScannerKey, true);
    return () => window.removeEventListener("keydown", handleScannerKey, true);
  }, [nfcStatus, paymentMethod]);

  const handleSubmit = async () => {
    if (!canGoStep2()) return;
    if (paymentMethod === "card_nfc" && nfcStatus !== "scanned") {
      onToast?.("Vui lòng quét NFC và xác nhận giao dịch trên thiết bị POS trước.");
      return;
    }
    setSubmitting(true);
    try {
      const customerPayload = customerMode === "existing_user"
        ? { user_id: selectedCustomer.user_id }
        : customerMode === "new_user" ? {
            mode: "new_user",
            new_user: { ...newCustomerForm, phone: newCustomerForm.phone.trim() },
          } : {
            mode: "guest",
            guest_customer: {
              full_name: guestCustomerForm.full_name.trim(),
              phone: guestCustomerForm.phone.trim(),
              email: guestCustomerForm.email.trim() || null,
            },
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
        mode: customerPayload.mode || "existing_user",
        user_id: customerPayload.user_id,
        new_user: customerPayload.new_user,
        guest_customer: customerPayload.guest_customer,
        showtimeId: selectedShowtime?.showtime_id || selectedShowtime?.id,
        seatUnits,
        foodItems,
        paymentMethod: paymentMethod === "banking" ? `banking:${selectedBank}` : paymentMethod,
        nfcReference: paymentMethod === "card_nfc" ? nfcReference : undefined,
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
    setSelectedMovieId("");
    setMovieStatusFilter("now_showing");
    setNewCustomerErrors({});
    setGuestCustomerForm({ full_name: "", phone: "", email: "" });
    setGuestCustomerErrors({});
    setSelectedCinemaId("");
    setSelectedShowtime(null);
    setSelectedSeats([]);
    setComboCounts(comboList.reduce((acc, c) => ({ ...acc, [c.combo_id]: 0 }), {}));
    setBookingResult(null);
    setPaymentMethod("cashier");
    setSelectedBank("VCB");
    setBankSearch("");
    setNfcStatus("idle");
    setNfcMessage("");
    setNfcReference("");
  };

  // Result screen
  if (bookingResult) {
    const b = bookingResult.booking || {};
    const nu = bookingResult.new_user;
    const printBooking = () => {
      const seatList = (b.seats || selectedSeatUnits.flatMap((unit) => unit.seatCodes)).filter(Boolean);
      const comboPayload = comboList
        .filter((combo) => Number(comboCounts[combo.combo_id] || 0) > 0)
        .map((combo) => ({
          quantity: Number(comboCounts[combo.combo_id] || 0),
          combo_name: combo.combo_name,
          name: combo.combo_name,
        }));

      printTicketPdf({
        bookingCode: b.booking_code || "",
        movie: b.movie_title || selectedShowtime?.movie_title || selectedMovie?.title || "",
        cinema: b.cinema_name || selectedShowtime?.cinema_name || "Sweetstar Cinema",
        room: b.room_name || selectedShowtime?.room_name || "",
        showtime: b.start_time ? new Date(b.start_time).toLocaleString("vi-VN") : (selectedShowtime?.start_time ? new Date(selectedShowtime.start_time).toLocaleString("vi-VN") : ""),
        user: b.full_name || selectedCustomer?.full_name || newCustomerForm.full_name || "",
        seats: seatList,
        combos: comboPayload,
      });
    };

    return (
      <div className="sf-section">
        <div className="sf-detail-card" style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: "12px 0 20px" }}>
            <div style={{ fontSize: 48 }}>🎟️</div>
            <h3 style={{ color: "#4ade80", marginTop: 8 }}>Đặt vé thành công!</h3>
          </div>
          <div className="sf-detail-row"><span>Mã đặt vé</span><strong style={{ color: "#7c61ff", fontSize: 18 }}>{b.booking_code || "—"}</strong></div>
          <div className="sf-detail-row"><span>Khách hàng</span><strong>{b.full_name || selectedCustomer?.full_name || (customerMode === "guest" ? guestCustomerForm.full_name : newCustomerForm.full_name)}</strong></div>
          <div className="sf-detail-row"><span>Phim</span><strong>{b.movie_title || selectedShowtime?.movie_title || selectedMovie?.title || selectedShowtime?.title || "—"}</strong></div>
          <div className="sf-detail-row"><span>Suất</span><strong>
            {b.start_time ? new Date(b.start_time).toLocaleString("vi-VN") : (selectedShowtime?.start_time ? new Date(selectedShowtime.start_time).toLocaleString("vi-VN") : "—")}
          </strong></div>
          <div className="sf-detail-row"><span>Ghế</span><strong>{(b.seats || selectedSeatUnits.flatMap((unit) => unit.seatCodes)).join(", ")}</strong></div>
          <div className="sf-detail-row"><span>Tổng tiền</span><strong style={{ color: "#fbbf24", fontSize: 18 }}>{fmtMoney(b.total_price || totalAmount)}</strong></div>
          <div className="sf-detail-row"><span>Thanh toán</span><strong>{paymentMethod === "cashier" ? "Tiền mặt tại quầy" : paymentMethod === "banking" ? `Chuyển khoản · ${selectedPaymentBank.label}` : paymentMethod === "zalopay" ? "Ví ZaloPay" : "Thẻ NFC tại quầy"}</strong></div>
          <div className="sf-detail-row"><span>Trạng thái</span><strong style={{ color: b.payment_status === "paid" ? "#4ade80" : "#fbbf24" }}>{b.payment_status === "paid" ? "Đã thanh toán" : "Chờ xác nhận thanh toán"}</strong></div>
          {paymentMethod === "banking" && (
            <div className="admin-payment-result-qr">
              <img src={bankQrUrl} alt="VietQR chuyển khoản đặt vé" />
              <div>
                <strong>Quét VietQR để chuyển khoản</strong>
                <p>{selectedPaymentBank.label} · {PAYMENT_BANK_INFO.accountNumber}</p>
                <p>{PAYMENT_BANK_INFO.accountName}</p>
                <p>Nội dung: {transferNote}</p>
              </div>
            </div>
          )}
          {paymentMethod === "card_nfc" && nfcReference && (
            <div className="admin-payment-nfc-reference"><FaCheckCircle /> Đã nhận NFC · Mã phiên {nfcReference}</div>
          )}
          {paymentMethod === "zalopay" && b.payment_status !== "paid" && (
            <div className="admin-payment-zalopay-notice">
              <FaMobileAlt /> Vé đang chờ thanh toán ZaloPay. Khi khách thanh toán xong, mở nút Thanh toán trong danh sách vé và nhập mã giao dịch ZaloPay.
            </div>
          )}
          {nu && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: "rgba(251,191,36,0.12)", border: "1px dashed #fbbf24" }}>
              <strong style={{ color: "#fbbf24" }}>⚠ Tài khoản mới đã được tạo:</strong>
              <div className="sf-detail-row" style={{ marginTop: 8 }}><span>Email</span><strong>{nu.email}</strong></div>
              <div className="sf-detail-row"><span>Mật khẩu tạm</span><strong style={{ color: "#fbbf24" }}>{nu.temporary_password}</strong></div>
              <div style={{ fontSize: 12, color: "#93c5fd", marginTop: 6 }}>Khách hàng nên đổi mật khẩu sau khi đăng nhập.</div>
            </div>
          )}
          {customerMode === "guest" && (
            <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: "rgba(74,222,128,0.1)", border: "1px dashed #4ade80", color: "#86efac" }}>
              Khách vãng lai — vé đã được lưu mà không tạo tài khoản.
            </div>
          )}
          <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
            <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={resetForm}>Đặt vé khác</button>
            <button className="sf-btn sf-btn-add sf-btn-lg" onClick={printBooking}>In vé / Lưu PDF</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-section">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[
          { n: 1, label: "Khách hàng" },
          { n: 2, label: "Phim đang chiếu" },
          { n: 3, label: "Suất chiếu" },
          { n: 4, label: "Chọn ghế" },
          { n: 5, label: "Combo" },
          { n: 6, label: "Xác nhận & In vé" },
        ].map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={`sf-btn ${step === s.n ? "sf-btn-add" : "sf-btn-secondary"} sm`}
            style={{ opacity: step >= s.n ? 1 : 0.55 }}
          >
            Bước {s.n}: {s.label}
          </button>
        ))}
      </div>

      <div className="table-card" style={{ padding: 20 }}>
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Bước 1: Chọn khách hàng</h3>
            <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
              <label className={`sf-role-chip ${customerMode === "existing_user" ? " checked" : ""}`}
                style={{ cursor: "pointer", padding: "10px 14px" }}>
                <input type="radio" checked={customerMode === "existing_user"} onChange={() => { setCustomerMode("existing_user"); setSelectedCustomer(null); }} style={{ marginRight: 6 }} />
                ✅ Đã có tài khoản
              </label>
              <label className={`sf-role-chip ${customerMode === "new_user" ? " checked" : ""}`} style={{ cursor: "pointer", padding: "10px 14px" }}>
                <input type="radio" checked={customerMode === "new_user"} onChange={() => { setCustomerMode("new_user"); setSelectedCustomer(null); }} style={{ marginRight: 6 }} />
                ➕ Chưa có tài khoản (tạo mới)
              </label>
              <label className={`sf-role-chip ${customerMode === "guest" ? " checked" : ""}`}
                style={{ cursor: "pointer", padding: "10px 14px" }}>
                <input type="radio" checked={customerMode === "guest"} onChange={() => { setCustomerMode("guest"); setSelectedCustomer(null); }} style={{ marginRight: 6 }} />
                🎟️ Khách vãng lai
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
                      Không tìm thấy tài khoản nào khớp với “{searchQuery}”
                    </div>
                  ) : (
                    searchResults.map((u) => (
                      <div
                        key={u.user_id}
                        onClick={() => setSelectedCustomer(u)}
                        style={{
                          padding: "12px 16px",
                          cursor: "pointer",
                          borderBottom: "1px solid #182047",
                          background: selectedCustomer?.user_id === u.user_id ? "rgba(124,97,255,0.15)" : "transparent",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
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
            ) : customerMode === "new_user" ? (
              <div className="sf-form-grid">
                <div className="sf-form-col">
                  <div className="sf-field-row">
                    <div className="sf-field">
                      <label>Họ và tên *</label>
                      <input
                        className={newCustomerErrors.full_name ? "error" : ""}
                        value={newCustomerForm.full_name}
                        onChange={(e) => setNewCustomerForm((p) => ({ ...p, full_name: e.target.value }))}
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
                        onChange={(e) => setNewCustomerForm((p) => ({ ...p, email: e.target.value }))}
                        placeholder="khach@email.com"
                      />
                      {newCustomerErrors.email && <span className="sf-error">{newCustomerErrors.email}</span>}
                    </div>
                  </div>
                  <div className="sf-field-row">
                    <div className="sf-field">
                      <label>Số điện thoại *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="0[0-9]*"
                        minLength={10}
                        className={newCustomerErrors.phone ? "error" : ""}
                        value={newCustomerForm.phone}
                        onChange={(e) => {
                          const phone = sanitizeBookingPhone(e.target.value);
                          setNewCustomerForm((p) => ({ ...p, phone }));
                          setNewCustomerErrors((previous) => ({ ...previous, phone: "" }));
                        }}
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
                        onChange={(e) => setNewCustomerForm((p) => ({ ...p, birthday: e.target.value }))}
                      />
                      {newCustomerErrors.birthday && <span className="sf-error">{newCustomerErrors.birthday}</span>}
                    </div>
                  </div>
                  <div className="sf-field">
                    <label>Giới tính</label>
                    <select value={newCustomerForm.sex} onChange={(e) => setNewCustomerForm((p) => ({ ...p, sex: e.target.value }))}>
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
            ) : (
              <div className="sf-form-grid">
                <div className="sf-form-col">
                  <div className="sf-field-row">
                    <div className="sf-field">
                      <label>Họ và tên *</label>
                      <input
                        className={guestCustomerErrors.full_name ? "error" : ""}
                        value={guestCustomerForm.full_name}
                        onChange={(e) => setGuestCustomerForm((previous) => ({ ...previous, full_name: e.target.value }))}
                        placeholder="Nguyễn Văn A"
                      />
                      {guestCustomerErrors.full_name && <span className="sf-error">{guestCustomerErrors.full_name}</span>}
                    </div>
                    <div className="sf-field">
                      <label>Số điện thoại *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="0[0-9]*"
                        minLength={10}
                        className={guestCustomerErrors.phone ? "error" : ""}
                        value={guestCustomerForm.phone}
                        onChange={(e) => {
                          const phone = sanitizeBookingPhone(e.target.value);
                          setGuestCustomerForm((previous) => ({ ...previous, phone }));
                          setGuestCustomerErrors((previous) => ({ ...previous, phone: "" }));
                        }}
                        placeholder="09xxxxxxxx"
                      />
                      {guestCustomerErrors.phone && <span className="sf-error">{guestCustomerErrors.phone}</span>}
                    </div>
                  </div>
                  <div className="sf-field">
                    <label>Email (không bắt buộc)</label>
                    <input
                      type="email"
                      className={guestCustomerErrors.email ? "error" : ""}
                      value={guestCustomerForm.email}
                      onChange={(e) => setGuestCustomerForm((previous) => ({ ...previous, email: e.target.value }))}
                      placeholder="khach@email.com"
                    />
                    {guestCustomerErrors.email && <span className="sf-error">{guestCustomerErrors.email}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#86efac", marginTop: 8, padding: 10, borderRadius: 8, background: "rgba(74,222,128,0.1)" }}>
                    Vé được bán trực tiếp tại quầy. Hệ thống không tạo tài khoản, không yêu cầu mật khẩu và không cộng điểm thành viên.
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" className="sf-btn sf-btn-add sf-btn-lg" onClick={goStep2}>Tiếp theo →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Bước 2: Chọn phim</h3>
            {movieList.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff", border: "1px solid #1e2a55", borderRadius: 10 }}>
                Hiện chưa có phim để hiển thị.
              </div>
            ) : (
              <>
                <div className="admin-booking-movie-tabs" role="tablist" aria-label="Trạng thái phim">
                  {MOVIE_STATUS_GROUPS.map((group) => (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={movieStatusFilter === group.value}
                      key={group.value}
                      className={`${group.className}${movieStatusFilter === group.value ? " active" : ""}`}
                      onClick={() => setMovieStatusFilter(group.value)}
                    >
                      <span>{group.icon}</span>
                      <strong>{group.label}</strong>
                      <em>{movieStatusCounts[group.value] || 0}</em>
                    </button>
                  ))}
                </div>

                {filteredMovieList.length === 0 ? (
                  <div className="admin-booking-movie-empty">
                    Không có phim trong nhóm “{MOVIE_STATUS_GROUPS.find((group) => group.value === movieStatusFilter)?.label}”.
                  </div>
                ) : (
              <div className="admin-booking-movie-grid">
                {filteredMovieList.map((movie) => {
                  const isSelected = String(movie.movie_id) === String(selectedMovieId);
                  const isEnded = movieStatusFilter === "ended";
                  const poster = movie.poster_url || movie.poster || movie.image || "";
                  return (
                    <button
                      type="button"
                      key={movie.movie_id}
                      disabled={isEnded}
                      onClick={() => {
                        setSelectedMovieId(String(movie.movie_id));
                        setSelectedShowtime(null);
                        setStep(3);
                      }}
                      className={`admin-booking-movie-card${isSelected ? " selected" : ""}${isEnded ? " ended" : ""}`}
                    >
                      <div className="admin-booking-movie-poster">
                        {poster ? (
                          <img src={toAbsoluteAssetUrl(poster)} alt={movie.title} />
                        ) : (
                          <div className="admin-booking-movie-placeholder">🎬</div>
                        )}
                        <span className={`admin-booking-movie-status ${movieStatusFilter}`}>
                          {MOVIE_STATUS_GROUPS.find((group) => group.value === movieStatusFilter)?.label}
                        </span>
                      </div>
                      <div className="admin-booking-movie-info">
                        <div className="admin-booking-movie-title">{movie.title}</div>
                        <div className="admin-booking-movie-meta">
                          {movie.genre || "Phim chiếu rạp"}
                          {movie.age_limit ? ` • ${movie.age_limit}+` : ""}
                        </div>
                        <div className="admin-booking-movie-release">
                          Khởi chiếu: {movie.release_date
                            ? new Date(movie.release_date).toLocaleDateString("vi-VN")
                            : "Chưa có ngày khởi chiếu"}
                        </div>
                        {isEnded && <small>Phim đã kết thúc, không thể đặt vé.</small>}
                      </div>
                    </button>
                  );
                })}
              </div>
                )}
              </>
            )}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
              <button type="button" className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(1)}>← Quay lại</button>
            </div>
          </div>
        )}

        {step === 3 && (() => {
          const quickDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const iso = toVNDateString(d);
            const label = i === 0 ? "Hôm nay" : i === 1 ? "Ngày mai" : d.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" });
            return { iso, label };
          });

          const grouped = showtimes.reduce((acc, st) => {
            const key = st.movie_title || `Phim #${st.movie_id}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(st);
            return acc;
          }, {});

          return (
            <div>
              <h3 style={{ marginBottom: 16 }}>Bước 3: Chọn suất chiếu</h3>
              <div className="sf-field" style={{ marginBottom: 14 }}>
                <label>Phim đã chọn</label>
                <input value={selectedMovie?.title || "Chưa chọn phim"} readOnly style={{ background: "rgba(255,255,255,0.04)", color: "#eef4ff" }} />
              </div>
              <div className="sf-field" style={{ marginBottom: 14 }}>
                <label>Rạp chiếu</label>
                <select value={selectedCinemaId} onChange={(e) => { setSelectedCinemaId(e.target.value); setSelectedShowtime(null); }}>
                  <option value="">-- Chọn rạp --</option>
                  {cinemas.map((c) => (
                    <option key={c.cinemas_id || c.id || c.cinema_id} value={c.cinemas_id || c.id || c.cinema_id}>
                      {c.cinema_name || c.name}
                    </option>
                  ))}
                </select>
              </div>

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
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setSelectedShowtime(null); }}
                    style={{ background: "rgba(30,42,85,0.7)", border: "1px solid rgba(124,97,255,0.3)", borderRadius: 8, color: "#eef4ff", padding: "6px 10px", fontSize: 12, cursor: "pointer" }}
                  />
                </div>
              </div>

              {!selectedMovieId ? (
                <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff", border: "1px solid #1e2a55", borderRadius: 10 }}>Vui lòng chọn phim trước.</div>
              ) : !selectedCinemaId ? (
                <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff", border: "1px solid #1e2a55", borderRadius: 10 }}>Vui lòng chọn rạp trước.</div>
              ) : showtimeLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff", border: "1px solid #1e2a55", borderRadius: 10 }}>Đang tải suất chiếu…</div>
              ) : showtimes.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#8fa6ff", border: "1px solid #1e2a55", borderRadius: 10 }}>Không có suất chiếu của phim này vào ngày đã chọn.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(grouped).map(([movieName, sts]) => (
                    <div key={movieName}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, padding: "8px 12px", background: "rgba(124,97,255,0.08)", borderRadius: 8 }}>
                        <span style={{ fontSize: 16 }}>🎬</span>
                        <strong style={{ color: "#c4b5fd", fontSize: 14 }}>{movieName}</strong>
                        <span style={{ fontSize: 12, color: "#7a8fc0", marginLeft: "auto" }}>{sts.length} suất</span>
                      </div>

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
                                .map((st) => {
                                  const isSelected = selectedShowtime?.showtime_id === st.showtime_id;
                                  const isEnded = st.status === "ended";
                                  const timeLabel = st.start_time ? new Date(st.start_time).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—";
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
                                      {isEnded && <div style={{ fontSize: 10, color: "#6b7280", marginTop: 1 }}>Đã chiếu</div>}
                                      {isSelected && <div style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, background: "#7c61ff", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>✓</div>}
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

              {selectedShowtime && (
                <div style={{ marginTop: 14, padding: "10px 14px", borderRadius: 10, background: "rgba(124,97,255,0.1)", border: "1px solid rgba(124,97,255,0.25)", fontSize: 13 }}>
                  ✅ Đã chọn: <strong style={{ color: "#c4b5fd" }}>{selectedShowtime.movie_title || selectedMovie?.title}</strong>
                  {" · "}{selectedShowtime.room_name}
                  {" · "}<strong style={{ color: "#7c61ff" }}>
                    {new Date(selectedShowtime.start_time).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                  </strong>
                </div>
              )}

              <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
                <button type="button" className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(2)}>← Quay lại</button>
                <button type="button" className="sf-btn sf-btn-add sf-btn-lg" onClick={goStep4} disabled={!canGoStep4()}>Tiếp theo →</button>
              </div>
            </div>
          );
        })()}

        {step === 4 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Bước 4: Chọn ghế</h3>
            <div style={{ textAlign: "center", marginBottom: 10, fontSize: 13, color: "#7a8fc0" }}>🎥 Màn hình chiếu phim 🎥</div>
            <div style={{ height: 8, width: "70%", margin: "0 auto 24px", borderRadius: "0 0 50% 50%", background: "linear-gradient(180deg, #7c61ff, #1e2a55)" }} />
            {seatLoading ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8fa6ff" }}>Đang tải ghế…</div>
            ) : seatLoadError ? (
              <div style={{ padding: 20, textAlign: "center", color: "#f87171" }}>{seatLoadError}</div>
            ) : seatLayout.rows.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: "#8fa6ff" }}>Không có dữ liệu ghế cho phòng này.</div>
            ) : (
              <div className="admin-seat-scroll">
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: "max-content", margin: "0 auto" }}>
                  <div className="booking-seat-grid-map" style={{ "--booking-grid-columns": seatLayout.totalVisualColumns, "--booking-seat-size": "42px", "--booking-seat-gap": "8px" }}>
                    {seatLayout.rows.map((row) => (
                      <div className="admin-seat-row" key={row.row}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <div style={{ width: 28, minWidth: 28, textAlign: "center", fontWeight: 700, color: "#7a8fc0", fontSize: 13 }}>{row.row}</div>
                          <div className="booking-seat-grid-row" style={{ "--booking-grid-columns": seatLayout.totalVisualColumns }}>
                            {row.units.map((unit) => {
                              const isSold = unit.sold || unit.seatCodes.some((c) => soldSeatCodes.has(String(c).toUpperCase()));
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
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(180deg,rgba(61,74,110,.92),rgba(43,54,87,.98))", border: "1px solid rgba(255,255,255,.09)", display: "inline-block" }} />Ghế thường (80k)</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(180deg,#ffd36f,#eb9830)", display: "inline-block" }} />Ghế VIP (100k)</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(180deg,#ff7084,#f43f5e)", display: "inline-block" }} />Ghế Đôi (120k)</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: "linear-gradient(135deg,#7f6bff,#6552ff)", display: "inline-block" }} />Đang chọn</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.16)", display: "inline-block" }} />Đã bán</span>
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
                <button type="button" className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(3)}>← Quay lại</button>
                <button type="button" className="sf-btn sf-btn-add sf-btn-lg" onClick={goStep5}>Tiếp theo →</button>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div>
            <div className="admin-food-heading">
              <div>
                <h3>Bước 5: Bắp, nước &amp; combo</h3>
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
                        <FoodItemCard key={item.combo_id} item={item} quantity={Number(comboCounts[item.combo_id] || 0)} onChange={(delta) => changeFoodQuantity(item.combo_id, delta)} />
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
                        <FoodItemCard key={item.combo_id} item={item} quantity={Number(comboCounts[item.combo_id] || 0)} onChange={(delta) => changeFoodQuantity(item.combo_id, delta)} />
                      ))}
                    </div>
                  ) : <p className="admin-food-empty-section">Chưa có combo nào đang bán.</p>}
                </section>
              </div>
            )}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>Tạm tính đồ ăn: <strong style={{ color: "#fbbf24" }}>{fmtMoney(comboTotal)}</strong></div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(4)}>← Quay lại</button>
                <button type="button" className="sf-btn sf-btn-add sf-btn-lg" onClick={goStep6}>Tiếp theo →</button>
              </div>
            </div>
          </div>
        )}

        {step === 6 && (
          <div>
            <h3 style={{ marginBottom: 16 }}>Bước 6: Xác nhận đặt vé</h3>
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
                ) : customerMode === "new_user" ? (
                  <>
                    <div className="sf-detail-row"><span>Tên</span><strong>{newCustomerForm.full_name}</strong></div>
                    <div className="sf-detail-row"><span>Email</span><strong>{newCustomerForm.email}</strong></div>
                    <div className="sf-detail-row"><span>Điện thoại</span><strong>{newCustomerForm.phone}</strong></div>
                    <div className="sf-detail-row"><span>Ghi chú</span><strong style={{ color: "#fbbf24", fontSize: 12 }}>Sẽ tạo tài khoản mới + mật khẩu tạm</strong></div>
                  </>
                ) : (
                  <>
                    <div className="sf-detail-row"><span>Tên</span><strong>{guestCustomerForm.full_name}</strong></div>
                    <div className="sf-detail-row"><span>Điện thoại</span><strong>{guestCustomerForm.phone}</strong></div>
                    <div className="sf-detail-row"><span>Email</span><strong>{guestCustomerForm.email || "—"}</strong></div>
                    <div className="sf-detail-row"><span>Loại khách</span><strong style={{ color: "#86efac", fontSize: 12 }}>Khách vãng lai · không tạo tài khoản</strong></div>
                  </>
                )}
              </div>
              <div className="sf-detail-card">
                <h4>Suất chiếu</h4>
                <div className="sf-detail-row"><span>Phim</span><strong>{selectedShowtime?.movie_title || selectedShowtime?.title || selectedMovie?.title || "—"}</strong></div>
                <div className="sf-detail-row"><span>Giờ chiếu</span><strong>{selectedShowtime?.start_time ? new Date(selectedShowtime.start_time).toLocaleString("vi-VN") : "—"}</strong></div>
                <div className="sf-detail-row"><span>Phòng</span><strong>{selectedShowtime?.room_name || `#${selectedShowtime?.room_id}`}</strong></div>
                <div className="sf-detail-row"><span>Ghế ({selectedSeats.length})</span><strong>{selectedSeatUnits.map((unit) => unit.label).join(", ")}</strong></div>
              </div>
            </div>
            <div className="sf-detail-card" style={{ marginTop: 14 }}>
              <h4>Thanh toán</h4>
              <div className="sf-detail-row"><span>Giá ghế</span><strong>{fmtMoney(seatTotal)}</strong></div>
              {comboTotal > 0 && <div className="sf-detail-row"><span>Combo</span><strong>{fmtMoney(comboTotal)}</strong></div>}
              <div className="sf-detail-row"><span style={{ fontSize: 16 }}><strong>Tổng cộng</strong></span><strong style={{ color: "#fbbf24", fontSize: 22 }}>{fmtMoney(totalAmount)}</strong></div>
              <div className="admin-payment-price-breakdown">
                {membershipDiscount > 0 && <div><span>Ưu đãi thành viên ({membershipPercent}%)</span><strong>−{fmtMoney(membershipDiscount)}</strong></div>}
                <div><span>Phí dịch vụ (8%)</span><strong>{fmtMoney(serviceFee)}</strong></div>
              </div>

              <div className="admin-payment-methods" role="radiogroup" aria-label="Hình thức thanh toán">
                <button type="button" className={paymentMethod === "cashier" ? "selected" : ""} onClick={() => choosePaymentMethod("cashier")}>
                  <span className="admin-payment-method-icon cash"><FaMoneyBillWave /></span>
                  <span><strong>Tiền mặt tại quầy</strong><small>Nhận tiền trực tiếp và in vé ngay</small></span>
                  <span className="admin-payment-radio" aria-hidden="true" />
                </button>
                <button type="button" className={paymentMethod === "banking" ? "selected" : ""} onClick={() => choosePaymentMethod("banking")}>
                  <span className="admin-payment-method-icon bank"><FaUniversity /></span>
                  <span><strong>Chuyển khoản ngân hàng</strong><small>VietQR tự điền tài khoản, số tiền và nội dung</small></span>
                  <span className="admin-payment-radio" aria-hidden="true" />
                </button>
                <button type="button" className={paymentMethod === "card_nfc" ? "selected" : ""} onClick={() => choosePaymentMethod("card_nfc")}>
                  <span className="admin-payment-method-icon nfc"><FaCreditCard /></span>
                  <span><strong>Thẻ tín dụng / Ghi nợ qua NFC</strong><small>Chạm thẻ hoặc điện thoại vào thiết bị POS/NFC</small></span>
                  <span className="admin-payment-radio" aria-hidden="true" />
                </button>
                <button type="button" className={paymentMethod === "zalopay" ? "selected" : ""} onClick={() => choosePaymentMethod("zalopay")}>
                  <span className="admin-payment-method-icon zalopay"><FaMobileAlt /></span>
                  <span><strong>Ví ZaloPay</strong><small>Thanh toán bằng ứng dụng ZaloPay và xác nhận mã giao dịch</small></span>
                  <span className="admin-payment-radio" aria-hidden="true" />
                </button>
              </div>

              {paymentMethod === "banking" && (
                <div className="admin-payment-panel">
                  <h5><FaUniversity /> Chọn ngân hàng nhận chuyển khoản</h5>
                  <label className="admin-payment-bank-search">
                    <FaSearch />
                    <input value={bankSearch} onChange={(event) => setBankSearch(event.target.value)} placeholder="Tìm ngân hàng…" />
                  </label>
                  <div className="admin-payment-bank-grid">
                    {filteredPaymentBanks.map((bank) => (
                      <button type="button" key={bank.id} className={selectedBank === bank.id ? "selected" : ""} onClick={() => setSelectedBank(bank.id)}>
                        <img src={getPaymentBankLogo(bank.id)} alt="" onError={(event) => { event.currentTarget.style.display = "none"; }} />
                        <span>{bank.shortName}</span>
                        {selectedBank === bank.id && <FaCheckCircle />}
                      </button>
                    ))}
                  </div>
                  <div className="admin-payment-bank-info">
                    <img src={getPaymentBankLogo(selectedBank)} alt={selectedPaymentBank.label} />
                    <div><span>Ngân hàng</span><strong>{selectedPaymentBank.label}</strong></div>
                    <div><span>Số tài khoản</span><strong>{PAYMENT_BANK_INFO.accountNumber}</strong></div>
                    <div><span>Chủ tài khoản</span><strong>{PAYMENT_BANK_INFO.accountName}</strong></div>
                    <div><span>Số tiền</span><strong className="amount">{fmtMoney(totalAmount)}</strong></div>
                    <div className="wide"><span>Nội dung chuyển khoản</span><strong>{transferNote}</strong></div>
                    <p>VietQR sẽ hiển thị sau khi tạo vé để khách quét và hoàn tất chuyển khoản.</p>
                  </div>
                </div>
              )}

              {paymentMethod === "card_nfc" && (
                <div className={`admin-payment-panel admin-payment-nfc ${nfcStatus}`}>
                  <div className="admin-payment-nfc-visual">
                    <span className="admin-payment-nfc-waves"><FaWifi /></span>
                    <FaCreditCard />
                  </div>
                  <div className="admin-payment-nfc-content">
                    <h5>Quét thẻ bằng NFC</h5>
                    <p>Đưa thẻ hoặc điện thoại của khách sát đầu đọc NFC/POS. Trên máy tính có thể dùng đầu đọc USB gửi mã tự động.</p>
                    {nfcMessage && <div className="admin-payment-nfc-status">{nfcStatus === "scanned" && <FaCheckCircle />} {nfcMessage}</div>}
                    <button type="button" onClick={startNfcScan} disabled={nfcStatus === "scanning"}>
                      <FaWifi /> {nfcStatus === "scanning" ? "Đang chờ quét NFC…" : nfcStatus === "scanned" ? "Quét lại NFC" : "Bắt đầu quét NFC"}
                    </button>
                    <small>Không lưu số thẻ trên website. Giao dịch chỉ được xác nhận bởi thiết bị POS/cổng thanh toán; tín hiệu quét không tự ghi nhận đã thu tiền.</small>
                  </div>
                </div>
              )}

              {paymentMethod === "zalopay" && (
                <div className="admin-payment-panel admin-payment-zalopay">
                  <span className="admin-payment-zalopay-logo">Z</span>
                  <div>
                    <h5><FaMobileAlt /> Thanh toán bằng ZaloPay</h5>
                    <p>Cho khách hoàn tất thanh toán trên ZaloPay. Vé sẽ ở trạng thái chờ cho đến khi nhân viên nhập mã giao dịch thành công bằng nút Thanh toán trong danh sách vé.</p>
                  </div>
                  <div className="admin-payment-zalopay-amount"><span>Số tiền</span><strong>{fmtMoney(totalAmount)}</strong></div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
              <button type="button" className="sf-btn sf-btn-secondary sf-btn-lg" onClick={() => setStep(5)}>← Quay lại</button>
              <button type="button" className="sf-btn sf-btn-add sf-btn-lg" disabled={submitting || (paymentMethod === "card_nfc" && nfcStatus !== "scanned")} onClick={handleSubmit} style={{ paddingLeft: 30, paddingRight: 30 }}>
                {submitting ? "Đang đặt vé…" : "✅ Xác nhận & Đặt vé"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
