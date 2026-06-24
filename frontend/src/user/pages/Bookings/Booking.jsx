import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Booking.css";

const parseSeatCode = (seatCode) => {
  const match = String(seatCode || "")
    .trim()
    .toUpperCase()
    .match(/^([A-Z]+)(\d+)$/);

  if (!match) return null;

  return {
    row: match[1],
    number: Number(match[2]),
  };
};

const normalizeSeatType = (seatType) => {
  const normalized = String(seatType || "Standard").toLowerCase();
  if (normalized === "vip") return "vip";
  if (normalized === "couple") return "couple";
  return "regular";
};

const buildSeatLayout = (room) => {
  const seats = Array.isArray(room?.seats) ? room.seats : [];
  const gaps = (Array.isArray(room?.seat_gaps) ? room.seat_gaps : [])
    .map((gap) => ({
      from: Number(gap?.gap_from ?? gap?.from ?? 0) || 0,
      to: Number(gap?.gap_to ?? gap?.to ?? 0) || 0,
      sortOrder: Number(gap?.sort_order ?? 0) || 0,
    }))
    .filter((gap) => gap.from > 0 && gap.to > gap.from)
    .sort((a, b) => a.from - b.from || a.sortOrder - b.sortOrder);

  const parsedSeats = seats
    .map((seat) => {
      const parsedCode = parseSeatCode(seat.seat_code);
      if (!parsedCode) return null;
      return {
        ...seat,
        row: parsedCode.row,
        number: parsedCode.number,
        normalizedType: normalizeSeatType(seat.seat_type),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.row !== b.row) return a.row.localeCompare(b.row, "en");
      return a.number - b.number;
    });

  if (parsedSeats.length === 0) {
    return {
      rows: [],
      totalVisualColumns: 1,
      minSeatNumber: 1,
      maxSeatNumber: 1,
    };
  }

  const minSeatNumber = Math.min(...parsedSeats.map((seat) => seat.number));
  const maxSeatNumber = Math.max(...parsedSeats.map((seat) => seat.number));
  const getGapOffset = (seatNumber) =>
    gaps.filter((gap) => gap.to <= seatNumber).length;

  const rowsByName = new Map();
  parsedSeats.forEach((seat) => {
    if (!rowsByName.has(seat.row)) rowsByName.set(seat.row, []);
    rowsByName.get(seat.row).push(seat);
  });

  const rows = Array.from(rowsByName.entries()).map(([rowName, rowSeats]) => {
    const units = [];

    for (let index = 0; index < rowSeats.length; index += 1) {
      const currentSeat = rowSeats[index];
      const nextSeat = rowSeats[index + 1];

      if (
        currentSeat.normalizedType === "couple" &&
        nextSeat &&
        nextSeat.normalizedType === "couple" &&
        nextSeat.number === currentSeat.number + 1
      ) {
        units.push({
          id: `${currentSeat.seat_code}_${nextSeat.seat_code}`,
          label: `${currentSeat.number}-${nextSeat.number}`,
          seatCodes: [currentSeat.seat_code, nextSeat.seat_code],
          startNumber: currentSeat.number,
          endNumber: nextSeat.number,
          type: "couple",
          sold: currentSeat.status !== "active" || nextSeat.status !== "active",
          columnStart:
            Math.max(1, currentSeat.number - minSeatNumber + 1) +
            getGapOffset(currentSeat.number),
          span: 2,
        });
        index += 1;
        continue;
      }

      units.push({
        id: currentSeat.seat_code,
        label: currentSeat.seat_code,
        seatCodes: [currentSeat.seat_code],
        startNumber: currentSeat.number,
        endNumber: currentSeat.number,
        type: currentSeat.normalizedType,
        sold: currentSeat.status !== "active",
        columnStart:
          Math.max(1, currentSeat.number - minSeatNumber + 1) +
          getGapOffset(currentSeat.number),
        span: 1,
      });
    }

    return {
      row: rowName,
      units,
    };
  });

  return {
    rows,
    totalVisualColumns: Math.max(
      1,
      maxSeatNumber - minSeatNumber + 1 + gaps.length,
    ),
    minSeatNumber,
    maxSeatNumber,
  };
};

const comboItems = [
  {
    key: "couple",
    label: "Combo Couple",
    description: "1 bắp + 2 nước",
    price: 150000,
    icon: "💑",
  },
  {
    key: "friends",
    label: "Combo Friends",
    description: "2 bắp + 2 nước",
    price: 180000,
    icon: "👯",
  },
  {
    key: "family",
    label: "Combo Family",
    description: "3 bắp + 4 nước",
    price: 260000,
    icon: "👪",
  },
];

const snackItems = [
  { key: "corn", label: "Bắp", price: 50000, icon: "🍿" },
  { key: "drink", label: "Nước", price: 30000, icon: "🥤" },
];

export default function Booking() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    movieTitle = "",
    cinema = "Lunexa Movix Đà Nẵng",
    cinemaId = null,
    roomId: initialRoomId = null,
    roomName: initialRoomName = "",
    roomType: initialRoomType = "",
    day = "Hôm nay",
    time = "10:00 - 2D",
  } = location.state ?? {};
  const movieSelectionState = {
    bookingContext: {
      cinema,
      cinemaId,
      roomId: initialRoomId,
      roomName: initialRoomName,
      roomType: initialRoomType,
      day,
    },
  };
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [comboCounts, setComboCounts] = useState({
    couple: 0,
    friends: 0,
    family: 0,
  });
  const [snackCounts, setSnackCounts] = useState({ corn: 0, drink: 0 });
  const [openDropdown, setOpenDropdown] = useState("snacks"); // ensure snacks open by default
  const [mobileStep, setMobileStep] = useState(1); // 1=ghế, 2=combo, 3=thanh toán
  const [cinemaDetail, setCinemaDetail] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const [loadingSeats, setLoadingSeats] = useState(Boolean(cinemaId));
  const [seatError, setSeatError] = useState("");

  const toggleSeat = (seat) => {
    setSelectedSeats((prev) =>
      prev.includes(seat)
        ? prev.filter((item) => item !== seat)
        : [...prev, seat],
    );
  };

  useEffect(() => {
    if (!cinemaId) {
      setLoadingSeats(false);
      return undefined;
    }

    let ignore = false;

    const fetchCinemaDetail = async () => {
      setLoadingSeats(true);
      setSeatError("");

      try {
        const res = await fetch(`/api/user/cinemas/${cinemaId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || "Không thể tải dữ liệu ghế.");
        }

        if (ignore) return;

        const nextCinema = data?.cinema || null;
        const rooms = Array.isArray(nextCinema?.rooms) ? nextCinema.rooms : [];
        setCinemaDetail(nextCinema);
        setSelectedRoomId((prev) => {
          if (prev && rooms.some((room) => room.room_id === prev)) {
            return prev;
          }
          return rooms[0]?.room_id || null;
        });
      } catch (error) {
        if (!ignore) {
          setSeatError(error.message || "Không thể tải dữ liệu ghế.");
        }
      } finally {
        if (!ignore) setLoadingSeats(false);
      }
    };

    fetchCinemaDetail();

    return () => {
      ignore = true;
    };
  }, [cinemaId]);

  useEffect(() => {
    setSelectedSeats([]);
  }, [selectedRoomId]);

  const updateCombo = (key, delta) => {
    setComboCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const updateSnack = (key, delta) => {
    setSnackCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const toggleDropdown = (key) => {
    // Prevent closing both dropdowns: clicking an open header does nothing.
    setOpenDropdown((prev) => (prev === key ? prev : key));
  };

  const roomOptions = Array.isArray(cinemaDetail?.rooms)
    ? cinemaDetail.rooms
    : [];
  const selectedRoom =
    roomOptions.find((room) => room.room_id === selectedRoomId) || null;
  const selectedRoomDisplayName =
    selectedRoom?.room_name || initialRoomName || "Đang chọn phòng";
  const selectedRoomDisplayType =
    selectedRoom?.room_type || initialRoomType || "";
  const seatLayout = useMemo(
    () => buildSeatLayout(selectedRoom),
    [selectedRoom],
  );
  const seatGridWeight = Math.max(
    1,
    seatLayout.totalVisualColumns +
      Math.max(0, seatLayout.totalVisualColumns - 1) * 0.18,
  );
  const seatSize = Math.max(28, Math.min(42, Math.floor(700 / seatGridWeight)));
  const seatGap = Math.max(6, Math.min(10, Math.round(seatSize * 0.16)));

  const seatPrices = {
    regular: 80000,
    vip: 100000,
    couple: 120000,
  };

  const getSelectedSeatType = (seatId) => {
    const unit = seatLayout.rows
      .flatMap((row) => row.units)
      .find((item) => item.id === seatId);
    return unit?.type || "regular";
  };

  const selectedSeatLabels = selectedSeats.map((seatId) => {
    const unit = seatLayout.rows
      .flatMap((row) => row.units)
      .find((item) => item.id === seatId);
    return unit?.label || seatId;
  });

  const seatTotal = selectedSeats.reduce((sum, seatId) => {
    const type = getSelectedSeatType(seatId);
    return sum + seatPrices[type];
  }, 0);
  const comboTotal = comboItems.reduce(
    (sum, item) => sum + item.price * comboCounts[item.key],
    0,
  );
  const snackTotal = snackItems.reduce(
    (sum, item) => sum + item.price * (snackCounts[item.key] || 0),
    0,
  );
  const total = seatTotal + comboTotal;
  const totalWithSnacks = seatTotal + comboTotal + snackTotal;

  return (
    <div className="booking-page">
      {/* ── Breadcrumb (desktop only) ── */}
      <div className="booking-breadcrumb-bar">
        <nav className="booking-breadcrumb">
          <button
            className="booking-breadcrumb-link"
            type="button"
            onClick={() => navigate("/")}
          >
            Trang chủ
          </button>
          <span className="booking-breadcrumb-sep">›</span>
          <button
            className="booking-breadcrumb-link"
            type="button"
            onClick={() => navigate("/Films/Film", { state: movieSelectionState })}
          >
            Phim
          </button>
          <span className="booking-breadcrumb-sep">›</span>
          <button
            className="booking-breadcrumb-link"
            type="button"
            onClick={() => navigate(-1)}
          >
            Rạp chiếu phim
          </button>
          <span className="booking-breadcrumb-sep">›</span>
          <span className="booking-breadcrumb-current">Đặt vé</span>
        </nav>
      </div>

      {/* ── Mobile header ── */}
      <div className="booking-mobile-header">
        <button
          type="button"
          className="booking-back-btn"
          onClick={() =>
            mobileStep > 1 ? setMobileStep(mobileStep - 1) : navigate(-1)
          }
        >
          ←
        </button>
        <div className="booking-mobile-title">
          <strong>{cinema}</strong>
          <span>
            {selectedRoomDisplayName}{" "}
            {selectedRoomDisplayType ? `• ${selectedRoomDisplayType}` : ""}
          </span>
        </div>
      </div>

      {/* ── Stepper ── */}
      <div className="booking-stepper">
        {[
          { label: "Ghế ngồi" },
          { label: "Combo" },
          { label: "Thanh toán" },
        ].map((s, i) => (
          <Fragment key={s.label}>
            <div
              className={`stepper-step ${mobileStep === i + 1 ? "active" : mobileStep > i + 1 ? "done" : ""}`}
            >
              <div className="stepper-circle">
                {mobileStep > i + 1 ? "✓" : i + 1}
              </div>
              <span>{s.label}</span>
            </div>
            {i < 2 && (
              <div
                className={`stepper-line ${mobileStep > i + 1 ? "done" : ""}`}
              />
            )}
          </Fragment>
        ))}
      </div>

      {/* ── Desktop header ── */}
      <div className="booking-header">
        <div>
          <p className="booking-subtitle">Chọn ghế và combo</p>
          <h1>Đặt vé - {movieTitle || cinema}</h1>
          <p className="booking-meta">
            {movieTitle ? `${movieTitle} • ` : ""}
            {day} • {time} • {selectedRoomDisplayName}
            {selectedRoomDisplayType ? ` • ${selectedRoomDisplayType}` : ""}
          </p>
        </div>
        <button type="button" className="btn-book" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
      </div>

      <div
        className={`booking-layout${mobileStep === 2 ? " mobile-hide" : ""}`}
      >
        <section className="booking-seat-panel">
          <div className="booking-room-toolbar">
            <div className="booking-room-meta">
              <span className="booking-room-label">Phòng chiếu</span>
              <strong>{selectedRoomDisplayName}</strong>
            </div>

            {roomOptions.length > 0 && (
              <label className="booking-room-select-wrap">
                <span>Đổi phòng</span>
                <select
                  value={selectedRoomId || ""}
                  onChange={(e) =>
                    setSelectedRoomId(Number(e.target.value) || null)
                  }
                >
                  {roomOptions.map((room) => (
                    <option key={room.room_id} value={room.room_id}>
                      {room.room_name} - {room.room_type}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {!movieTitle && (
            <div className="booking-seat-feedback error">
              <p>Bạn phải chọn phim trước khi đặt vé cho phòng chiếu này.</p>
              <button
                type="button"
                className="btn-book"
                onClick={() =>
                  navigate("/Films/Film", { state: movieSelectionState })
                }
              >
                Chọn phim trước
              </button>
            </div>
          )}

          <div className="screen-label">MÀN HÌNH</div>
          {movieTitle && loadingSeats && (
            <div className="booking-seat-feedback">
              Đang tải sơ đồ ghế từ CSDL...
            </div>
          )}

          {movieTitle && !loadingSeats && seatError && (
            <div className="booking-seat-feedback error">
              <p>{seatError}</p>
              <button
                type="button"
                className="btn-book"
                onClick={() => window.location.reload()}
              >
                Tải lại
              </button>
            </div>
          )}

          {movieTitle && !loadingSeats && !seatError && seatLayout.rows.length > 0 && (
            <div
              className="seat-map booking-seat-grid-map"
              style={{
                "--booking-grid-columns": seatLayout.totalVisualColumns,
                "--booking-seat-size": `${seatSize}px`,
                "--booking-seat-gap": `${seatGap}px`,
              }}
            >
              {seatLayout.rows.map((row) => (
                <div className="seat-row" key={row.row}>
                  <span className="seat-row-label">{row.row}</span>
                  <div className="seat-row-sections booking-seat-grid-row">
                    {row.units.map((seat) => (
                      <button
                        key={seat.id}
                        type="button"
                        className={`booking-seat booking-seat-${seat.type} ${seat.sold ? "booking-seat-sold" : ""} ${selectedSeats.includes(seat.id) ? "selected" : ""}`}
                        onClick={() => !seat.sold && toggleSeat(seat.id)}
                        disabled={seat.sold}
                        aria-label={`${seat.label} ${seat.sold ? "đã bán" : "còn trống"}`}
                        title={seat.seatCodes.join(", ")}
                        style={{
                          gridColumn: `${seat.columnStart} / span ${seat.span}`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {movieTitle && !loadingSeats && !seatError && seatLayout.rows.length === 0 && (
            <div className="booking-seat-feedback">
              Chưa có dữ liệu ghế cho phòng này.
            </div>
          )}

          <div className="legend">
            <div className="legend-item">
              <span
                className="legend-marker"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              />
              Thường
            </div>
            <div className="legend-item">
              <span
                className="legend-marker"
                style={{
                  background: "linear-gradient(135deg, #ffc260, #ff7d2c)",
                }}
              />
              VIP
            </div>
            <div className="legend-item">
              <span
                className="legend-marker"
                style={{
                  background: "linear-gradient(135deg, #ff8a8a, #ff4a4a)",
                }}
              />
              Ghế Đôi
            </div>
            <div className="legend-item">
              <span
                className="legend-marker"
                style={{
                  background: "linear-gradient(135deg, #9e71ff, #7d4ff6)",
                }}
              />
              Đang chọn
            </div>
            <div className="legend-item">
              <span
                className="legend-marker"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.16)",
                }}
              />
              Đã bán
            </div>
          </div>
        </section>

        <aside className="booking-sidebar">
          <div className="section-title">
            <div>
              <div className="sidebar-title">Chọn combo</div>
              <div className="sidebar-subtitle">
                Thêm combo để tiết kiệm hơn
              </div>
            </div>
          </div>
          <div
            className={`dropdown ${openDropdown === "snacks" ? "open" : ""}`}
          >
            <div
              className="dropdown-header"
              onClick={() => toggleDropdown("snacks")}
            >
              <div>
                <div className="sidebar-title">Chọn bắp & nước</div>
                <div className="sidebar-subtitle">
                  Chọn bắp hoặc nước riêng lẻ
                </div>
              </div>
              <div className="dropdown-caret">
                {openDropdown === "snacks" ? "▲" : "▼"}
              </div>
            </div>
            {openDropdown === "snacks" && (
              <div className="dropdown-body">
                {snackItems.map((item) => (
                  <div className="combo-card" key={item.key}>
                    <div className="combo-info">
                      <span className="item-icon" aria-hidden>
                        {item.icon}
                      </span>
                      <div>
                        <h4>{item.label}</h4>
                        <p>{item.price.toLocaleString("vi-VN")}đ</p>
                      </div>
                    </div>
                    <div className="combo-control">
                      <button
                        type="button"
                        className="combo-button"
                        onClick={() => updateSnack(item.key, -1)}
                      >
                        -
                      </button>
                      <span className="combo-count">
                        {snackCounts[item.key]}
                      </span>
                      <button
                        type="button"
                        className="combo-button"
                        onClick={() => updateSnack(item.key, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={`dropdown ${openDropdown === "combo" ? "open" : ""}`}>
            <div
              className="dropdown-header"
              onClick={() => toggleDropdown("combo")}
            >
              <div>
                <div className="sidebar-title">Chọn combo</div>
                <div className="sidebar-subtitle">
                  Thêm combo để tiết kiệm hơn
                </div>
              </div>
              <div className="dropdown-caret">
                {openDropdown === "combo" ? "▲" : "▼"}
              </div>
            </div>
            {openDropdown === "combo" && (
              <div className="dropdown-body">
                {comboItems.map((item) => (
                  <div className="combo-card" key={item.key}>
                    <div className="combo-info">
                      <span className="item-icon" aria-hidden>
                        {item.icon}
                      </span>
                      <div>
                        <h4>{item.label}</h4>
                        <p>{item.description}</p>
                      </div>
                    </div>
                    <div className="combo-control">
                      <button
                        type="button"
                        className="combo-button"
                        onClick={() => updateCombo(item.key, -1)}
                      >
                        -
                      </button>
                      <span className="combo-count">
                        {comboCounts[item.key]}
                      </span>
                      <button
                        type="button"
                        className="combo-button"
                        onClick={() => updateCombo(item.key, 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="summary-card">
            <div className="summary-row">
              <span>Tạm tính ({selectedSeats.length} ghế)</span>
              <strong>{seatTotal.toLocaleString("vi-VN")}đ</strong>
            </div>
            <div className="summary-row">
              <span>Bắp & Nước</span>
              <strong>{snackTotal.toLocaleString("vi-VN")}đ</strong>
            </div>
            <div className="summary-row">
              <span>Combo</span>
              <strong>{comboTotal.toLocaleString("vi-VN")}đ</strong>
            </div>
            <div className="summary-total">
              <span>Tổng tiền</span>
              <strong>{totalWithSnacks.toLocaleString("vi-VN")}đ</strong>
            </div>
            <button
              type="button"
              className="checkout-button"
              disabled={selectedSeats.length === 0}
              onClick={() =>
                navigate("/payment", {
                  state: {
                    movieTitle,
                    cinema,
                    roomName: selectedRoomDisplayName,
                    roomType: selectedRoomDisplayType,
                    day,
                    time,
                    selectedSeats,
                    selectedSeatLabels,
                    comboCounts,
                    total: totalWithSnacks,
                  },
                })
              }
            >
              Tiếp tục thanh toán →
            </button>
          </div>
        </aside>
      </div>

      {/* ── Mobile step 2: Combo & Bắp nước ── */}
      <div
        className={`booking-mobile-combo${mobileStep === 2 ? " mobile-step-visible" : ""}`}
      >
        <div className="mobile-combo-section">
          <div className="mobile-combo-heading">🍿 Bắp &amp; Nước</div>
          {snackItems.map((item) => (
            <div className="combo-card" key={item.key}>
              <div className="combo-info">
                <span className="item-icon" aria-hidden>
                  {item.icon}
                </span>
                <div>
                  <h4>{item.label}</h4>
                  <p>{item.price.toLocaleString("vi-VN")}đ</p>
                </div>
              </div>
              <div className="combo-control">
                <button
                  type="button"
                  className="combo-button"
                  onClick={() => updateSnack(item.key, -1)}
                >
                  -
                </button>
                <span className="combo-count">{snackCounts[item.key]}</span>
                <button
                  type="button"
                  className="combo-button"
                  onClick={() => updateSnack(item.key, 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mobile-combo-section">
          <div className="mobile-combo-heading">🎁 Combo</div>
          {comboItems.map((item) => (
            <div className="combo-card" key={item.key}>
              <div className="combo-info">
                <span className="item-icon" aria-hidden>
                  {item.icon}
                </span>
                <div>
                  <h4>{item.label}</h4>
                  <p>{item.description}</p>
                </div>
              </div>
              <div className="combo-control">
                <button
                  type="button"
                  className="combo-button"
                  onClick={() => updateCombo(item.key, -1)}
                >
                  -
                </button>
                <span className="combo-count">{comboCounts[item.key]}</span>
                <button
                  type="button"
                  className="combo-button"
                  onClick={() => updateCombo(item.key, 1)}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Mobile summary card ── */}
      <div className="booking-mobile-summary">
        <div className="mobile-summary-movie">
          <strong>{cinema}</strong>
          <span>
            🗓 {time} • {day},{" "}
            {new Date().toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
            })}
          </span>
        </div>
        <div className="mobile-summary-rows">
          <div className="mobile-summary-row">
            <span>Phòng chiếu</span>
            <strong>
              {selectedRoomDisplayName}
              {selectedRoomDisplayType ? ` • ${selectedRoomDisplayType}` : ""}
            </strong>
          </div>
          <div className="mobile-summary-row">
            <span>Ghế</span>
            <strong>
              {selectedSeatLabels.length > 0
                ? selectedSeatLabels.join(", ")
                : "—"}
            </strong>
          </div>
          {mobileStep === 2 && (
            <>
              <div className="mobile-summary-row">
                <span>Bắp &amp; Nước</span>
                <strong>
                  {snackTotal > 0
                    ? snackTotal.toLocaleString("vi-VN") + "đ"
                    : "0đ"}
                </strong>
              </div>
              <div className="mobile-summary-row">
                <span>Combo</span>
                <strong>
                  {comboTotal > 0
                    ? comboTotal.toLocaleString("vi-VN") + "đ"
                    : "0đ"}
                </strong>
              </div>
            </>
          )}
          {mobileStep === 1 && (
            <div className="mobile-summary-row">
              <span>Phí dịch vụ</span>
              <strong>0đ</strong>
            </div>
          )}
        </div>
        <div className="mobile-summary-footer">
          <div className="mobile-summary-total">
            <span>Tổng cộng</span>
            <strong>{totalWithSnacks.toLocaleString("vi-VN")}đ</strong>
          </div>
          {mobileStep === 1 && (
            <button
              type="button"
              className="mobile-checkout-btn"
              disabled={selectedSeats.length === 0}
              onClick={() => setMobileStep(2)}
            >
              Tiếp tục
            </button>
          )}
          {mobileStep === 2 && (
            <button
              type="button"
              className="mobile-checkout-btn"
              onClick={() =>
                navigate("/payment", {
                  state: {
                    movieTitle,
                    cinema,
                    roomName: selectedRoomDisplayName,
                    roomType: selectedRoomDisplayType,
                    day,
                    time,
                    selectedSeats,
                    selectedSeatLabels,
                    comboCounts,
                    total: totalWithSnacks,
                  },
                })
              }
            >
              Thanh toán
            </button>
          )}
        </div>
      </div>

      {/* ── Promo banner ── */}
      <div className="booking-promo-banner">
        <div className="promo-content">
          <strong>Ưu đãi Member</strong>
          <p>Giảm 5% cho thành viên Star Member khi đặt qua Lunexa App</p>
          <button type="button" className="promo-link">
            Khám phá ngay &rsaquo;
          </button>
        </div>
      </div>
    </div>
  );
}
