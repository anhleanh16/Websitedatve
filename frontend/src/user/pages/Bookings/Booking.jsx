import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Booking.css";
import { userComboService, userCinemaService } from "../../services/userApi";

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

const buildSeatSelectionMeta = (seatLayout) => {
  const rows = Array.isArray(seatLayout?.rows) ? seatLayout.rows : [];
  const units = [];

  rows.forEach((row, rowIndex) => {
    const rowUnits = Array.isArray(row?.units)
      ? [...row.units].sort(
          (a, b) => a.columnStart - b.columnStart || a.span - b.span,
        )
      : [];

    let sectionIndex = -1;
    let previousEnd = 0;

    rowUnits.forEach((unit, unitIndex) => {
      const columnStart = Number(unit.columnStart || 1);
      const span = Math.max(1, Number(unit.span || 1));
      const columnEnd = columnStart + span - 1;

      if (unitIndex === 0 || columnStart > previousEnd + 1) {
        sectionIndex += 1;
      }

      units.push({
        ...unit,
        row: row.row,
        rowIndex,
        unitIndex,
        sectionIndex,
      });

      previousEnd = columnEnd;
    });
  });

  const unitMap = new Map(units.map((unit) => [unit.id, unit]));
  const availableBySectionRow = new Map();

  units
    .filter((unit) => !unit.sold)
    .forEach((unit) => {
      if (!availableBySectionRow.has(unit.sectionIndex)) {
        availableBySectionRow.set(unit.sectionIndex, new Map());
      }
      const rowMap = availableBySectionRow.get(unit.sectionIndex);
      if (!rowMap.has(unit.rowIndex)) rowMap.set(unit.rowIndex, []);
      rowMap.get(unit.rowIndex).push(unit);
    });

  availableBySectionRow.forEach((rowMap) => {
    rowMap.forEach((rowUnits) => {
      rowUnits.sort((a, b) => a.unitIndex - b.unitIndex);
    });
  });

  return {
    unitMap,
    availableBySectionRow,
  };
};

const validateSeatSelectionRules = (selectedSeatIds, selectionMeta) => {
  if (!Array.isArray(selectedSeatIds) || selectedSeatIds.length === 0) return "";

  const { unitMap, availableBySectionRow } = selectionMeta || {};
  const selectedUnits = selectedSeatIds
    .map((seatId) => unitMap?.get(seatId))
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.sectionIndex - b.sectionIndex ||
        a.rowIndex - b.rowIndex ||
        a.unitIndex - b.unitIndex,
    );

  if (selectedUnits.length !== selectedSeatIds.length) {
    return "Không thể xác định đủ ghế đã chọn. Vui lòng chọn lại.";
  }

  const activeSectionIndex = selectedUnits[0]?.sectionIndex;
  if (selectedUnits.some((unit) => unit.sectionIndex !== activeSectionIndex)) {
    return "Chỉ được chọn ghế trong cùng một nhánh, không vượt qua khoảng cách giữa.";
  }

  const selectedByRow = new Map();
  selectedUnits.forEach((unit) => {
    if (!selectedByRow.has(unit.rowIndex)) selectedByRow.set(unit.rowIndex, []);
    selectedByRow.get(unit.rowIndex).push(unit);
  });

  // ── RULE: Trong cùng một hàng, không được bỏ trống ghế ở giữa ──
  const rowIndexes = Array.from(selectedByRow.keys()).sort((a, b) => a - b);
  for (const rowIndex of rowIndexes) {
    const selectedRowUnits = [...selectedByRow.get(rowIndex)].sort(
      (a, b) => a.unitIndex - b.unitIndex,
    );
    const availableRowUnits =
      availableBySectionRow?.get(activeSectionIndex)?.get(rowIndex) || [];

    if (selectedRowUnits.length <= 1) continue;

    const minUnitIndex = selectedRowUnits[0].unitIndex;
    const maxUnitIndex = selectedRowUnits[selectedRowUnits.length - 1].unitIndex;

    // Tìm tất cả ghế CÓ SẴN (chưa bán) trong khoảng [min, max]
    const availableBetween = availableRowUnits.filter(
      (unit) =>
        unit.unitIndex >= minUnitIndex && unit.unitIndex <= maxUnitIndex,
    );

    // Tất cả các ghế có sẵn ở giữa PHẢI được chọn hết
    const selectedIds = new Set(selectedRowUnits.map((u) => u.id));
    const unselectedAvailable = availableBetween.filter(
      (unit) => !selectedIds.has(unit.id),
    );

    if (unselectedAvailable.length > 0) {
      const firstGap = unselectedAvailable[0];
      return (
        `Không được bỏ trống ghế giữa các ghế đã chọn. ` +
        `Ghế ${firstGap.label || firstGap.id} còn trống và nằm giữa ghế đã chọn, ` +
        `vui lòng chọn thêm ghế này hoặc điều chỉnh vị trí.`
      );
    }
  }

  for (let index = 1; index < rowIndexes.length; index += 1) {
    if (rowIndexes[index] !== rowIndexes[index - 1] + 1) {
      return "Chỉ được chọn thêm ghế ở hàng trên hoặc dưới liền kề.";
    }
  }

  const partialRows = [];
  for (const rowIndex of rowIndexes) {
    const selectedRowUnits = selectedByRow.get(rowIndex);
    const availableRowUnits =
      availableBySectionRow?.get(activeSectionIndex)?.get(rowIndex) || [];

    if (selectedRowUnits.length < availableRowUnits.length) {
      partialRows.push(rowIndex);
    }
  }

  if (partialRows.length > 1) {
    return "Hàng ngang trong nhánh hiện tại phải kín trước khi chọn sang hàng trên hoặc dưới.";
  }

  if (partialRows.length === 1 && rowIndexes.length > 1) {
    const partialRowIndex = partialRows[0];
    const firstRowIndex = rowIndexes[0];
    const lastRowIndex = rowIndexes[rowIndexes.length - 1];

    if (
      partialRowIndex !== firstRowIndex &&
      partialRowIndex !== lastRowIndex
    ) {
      return "Chỉ được mở rộng sang hàng trên hoặc dưới khi các hàng ở giữa đã chọn kín.";
    }
  }

  return "";
};

const getFoodKey = (item) => String(item?.combo_id ?? item?.key ?? "");

const getFoodIcon = (item) => {
  const popcornQty = Number(item?.popcorn_quantity || 0);
  const drinkQty = Number(item?.drink_quantity || 0);

  if (item?.category === "single" && popcornQty > 0 && drinkQty === 0) return "🍿";
  if (item?.category === "single" && drinkQty > 0 && popcornQty === 0) return "🥤";
  if (drinkQty >= 4 || String(item?.combo_name || "").includes("4 Người")) return "👨‍👩‍👧‍👦";
  if (popcornQty >= 2 || drinkQty >= 2) return "🎉";
  return "🎁";
};

const getFoodSummary = (item) => {
  const parts = [];
  const popcornQty = Number(item?.popcorn_quantity || 0);
  const drinkQty = Number(item?.drink_quantity || 0);

  if (popcornQty > 0) parts.push(`${popcornQty} bắp`);
  if (drinkQty > 0) parts.push(`${drinkQty} nước`);

  return parts.join(" + ") || String(item?.description || "").trim() || "Tùy chỉnh";
};

const buildSelectedFoodItems = (items, counts, selections) =>
  items
    .map((item) => {
      const key = getFoodKey(item);
      const quantity = Number(counts[key] || 0);
      if (quantity <= 0) return null;

      return {
        comboId: item.combo_id,
        key,
        name: item.combo_name,
        category: item.category,
        quantity,
        unitPrice: Number(item.price || 0),
        totalPrice: Number(item.price || 0) * quantity,
        popcornType: selections[key]?.popcornType || "",
        drinkType: selections[key]?.drinkType || "",
      };
    })
    .filter(Boolean);

const formatMoney = (value) => `${Number(value || 0).toLocaleString("vi-VN")}đ`;

function FoodSelectionCard({
  item,
  count,
  selection,
  onDecrease,
  onIncrease,
  onSelectOption,
}) {
  const key = getFoodKey(item);
  const popcornOptions = Array.isArray(item.popcorn_options) ? item.popcorn_options : [];
  const drinkOptions = Array.isArray(item.drink_options) ? item.drink_options : [];

  return (
    <div className="combo-card" key={key}>
      <div className="combo-info">
        <span className="item-icon" aria-hidden>
          {getFoodIcon(item)}
        </span>
        <div>
          <h4>{item.combo_name}</h4>
          <p>{getFoodSummary(item)}</p>
          <span className="combo-price-line">
            {Number(item.price || 0).toLocaleString("vi-VN")}đ
          </span>
          {popcornOptions.length > 0 && (
            <label className="combo-option-row">
              <span>Loại bắp</span>
              <select
                className="combo-option-select"
                value={selection?.popcornType || popcornOptions[0] || ""}
                onChange={(event) => onSelectOption(key, "popcornType", event.target.value)}
              >
                {popcornOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}
          {drinkOptions.length > 0 && (
            <label className="combo-option-row">
              <span>Loại nước</span>
              <select
                className="combo-option-select"
                value={selection?.drinkType || drinkOptions[0] || ""}
                onChange={(event) => onSelectOption(key, "drinkType", event.target.value)}
              >
                {drinkOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>
      <div className="combo-control">
        <button type="button" className="combo-button" onClick={() => onDecrease(key)}>
          -
        </button>
        <span className="combo-count">{count || 0}</span>
        <button type="button" className="combo-button" onClick={() => onIncrease(key)}>
          +
        </button>
      </div>
    </div>
  );
}

export default function Booking() {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    movieId = null,
    movieTitle = "",
    ageLimit = 0,
    cinema = "Sweetstar Movie Đà Nẵng",
    cinemaId = null,
    showtimeId = null,
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
  const [comboCatalog, setComboCatalog] = useState([]);
  const [comboLoading, setComboLoading] = useState(true);
  const [comboError, setComboError] = useState("");
  const [comboCounts, setComboCounts] = useState({});
  const [snackCounts, setSnackCounts] = useState({});
  const [foodSelections, setFoodSelections] = useState({});
  const [openDropdown, setOpenDropdown] = useState("snacks"); // ensure snacks open by default
  const [mobileStep, setMobileStep] = useState(1); // 1=ghế, 2=combo, 3=thanh toán
  const [cinemaDetail, setCinemaDetail] = useState(null);
  const [selectedRoomId, setSelectedRoomId] = useState(initialRoomId);
  const [loadingSeats, setLoadingSeats] = useState(Boolean(cinemaId));
  const [seatError, setSeatError] = useState("");
  const [seatRuleError, setSeatRuleError] = useState("");
  const [showAgeNotice, setShowAgeNotice] = useState(Boolean(movieTitle));
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === "undefined" ? 1280 : window.innerWidth,
  );
  const ageLimitValue = Number(ageLimit || 0);
  const ageLimitLabel = ageLimitValue > 0 ? `${ageLimitValue}+` : "mọi lứa tuổi";
  const hasMovieSelection = Boolean(movieTitle);
  const breadcrumbSectionLabel = hasMovieSelection ? "Phim" : "Rạp chiếu phim";
  const breadcrumbEntityLabel = hasMovieSelection
    ? movieTitle
    : cinema || "Suất chiếu đã chọn";

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
        const data = await userCinemaService.getById(cinemaId);

        if (ignore) return;

        const nextCinema = data?.cinema || null;
        const rooms = Array.isArray(nextCinema?.rooms) ? nextCinema.rooms : [];
        setCinemaDetail(nextCinema);
        setSelectedRoomId((prev) => {
          const lockedRoomId = prev || initialRoomId;
          if (
            lockedRoomId &&
            rooms.some((room) => room.room_id === lockedRoomId)
          ) {
            return lockedRoomId;
          }
          return null;
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
    setSeatRuleError("");
  }, [selectedRoomId]);

  useEffect(() => {
    if (!movieTitle) {
      setShowAgeNotice(false);
      return;
    }
    setShowAgeNotice(true);
  }, [movieTitle]);

  useEffect(() => {
    if (!showAgeNotice) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showAgeNotice]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    let ignore = false;

    const fetchCombos = async () => {
      setComboLoading(true);
      setComboError("");

      try {
        const data = await userComboService.getAll();
        if (ignore) return;
        setComboCatalog(Array.isArray(data?.combos) ? data.combos : []);
      } catch (error) {
        if (ignore) return;
        console.error(error);
        setComboCatalog([]);
        setComboError(error.message || "Không thể tải combo từ cơ sở dữ liệu.");
      } finally {
        if (!ignore) setComboLoading(false);
      }
    };

    fetchCombos();

    return () => {
      ignore = true;
    };
  }, []);

  const snackItems = useMemo(
    () => comboCatalog.filter((item) => item.category === "single"),
    [comboCatalog],
  );
  const comboItems = useMemo(
    () => comboCatalog.filter((item) => item.category !== "single"),
    [comboCatalog],
  );

  useEffect(() => {
    if (comboCatalog.length === 0) return;

    setComboCounts((prev) =>
      comboItems.reduce((acc, item) => {
        const key = getFoodKey(item);
        acc[key] = prev[key] || 0;
        return acc;
      }, {}),
    );

    setSnackCounts((prev) =>
      snackItems.reduce((acc, item) => {
        const key = getFoodKey(item);
        acc[key] = prev[key] || 0;
        return acc;
      }, {}),
    );

    setFoodSelections((prev) =>
      comboCatalog.reduce((acc, item) => {
        const key = getFoodKey(item);
        acc[key] = prev[key] || {
          popcornType: item.popcorn_options?.[0] || "",
          drinkType: item.drink_options?.[0] || "",
        };
        return acc;
      }, {}),
    );
  }, [comboCatalog, comboItems, snackItems]);

  const updateCombo = (key, delta) => {
    setComboCounts((prev) => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta),
    }));
  };

  const updateFoodSelection = (key, field, value) => {
    setFoodSelections((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
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
  const seatSelectionMeta = useMemo(
    () => buildSeatSelectionMeta(seatLayout),
    [seatLayout],
  );
  const seatGridWeight = Math.max(
    1,
    seatLayout.totalVisualColumns +
      Math.max(0, seatLayout.totalVisualColumns - 1) * 0.18,
  );
  const isMobileViewport = viewportWidth <= 640;
  const targetSeatMapWidth = isMobileViewport
    ? Math.max(240, viewportWidth - 110)
    : 700;
  const seatSize = isMobileViewport
    ? Math.max(18, Math.min(32, Math.floor(targetSeatMapWidth / seatGridWeight)))
    : Math.max(28, Math.min(42, Math.floor(targetSeatMapWidth / seatGridWeight)));
  const seatGap = isMobileViewport
    ? Math.max(2, Math.min(5, Math.round(seatSize * 0.14)))
    : Math.max(6, Math.min(10, Math.round(seatSize * 0.16)));

  const seatPrices = {
    regular: 80000,
    vip: 100000,
    couple: 120000,
  };

  const toggleSeat = (seatId) => {
    setSelectedSeats((prev) => {
      const nextSelection = prev.includes(seatId)
        ? prev.filter((item) => item !== seatId)
        : [...prev, seatId];

      const ruleMessage = validateSeatSelectionRules(
        nextSelection,
        seatSelectionMeta,
      );

      if (ruleMessage) {
        setSeatRuleError(ruleMessage);
        return prev;
      }

      setSeatRuleError("");
      return nextSelection;
    });
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
  const selectedSeatUnits = useMemo(
    () =>
      selectedSeats
        .map((seatId) =>
          seatLayout.rows
            .flatMap((row) => row.units)
            .find((item) => item.id === seatId),
        )
        .filter(Boolean)
        .map((unit) => ({
          id: unit.id,
          label: unit.label,
          seatCodes: Array.isArray(unit.seatCodes) ? unit.seatCodes : [],
          type: unit.type,
        })),
    [seatLayout.rows, selectedSeats],
  );

  const seatTotal = selectedSeats.reduce((sum, seatId) => {
    const type = getSelectedSeatType(seatId);
    return sum + seatPrices[type];
  }, 0);
  const comboTotal = comboItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(comboCounts[getFoodKey(item)] || 0),
    0,
  );
  const snackTotal = snackItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(snackCounts[getFoodKey(item)] || 0),
    0,
  );
  const total = seatTotal + comboTotal;
  const totalWithSnacks = seatTotal + comboTotal + snackTotal;
  const selectedComboDetails = useMemo(
    () => buildSelectedFoodItems(comboItems, comboCounts, foodSelections),
    [comboCounts, comboItems, foodSelections],
  );
  const selectedSnackDetails = useMemo(
    () => buildSelectedFoodItems(snackItems, snackCounts, foodSelections),
    [foodSelections, snackCounts, snackItems],
  );
  const selectedFoodItems = useMemo(
    () => [...selectedSnackDetails, ...selectedComboDetails],
    [selectedComboDetails, selectedSnackDetails],
  );
  const hasSelectedFood = selectedFoodItems.length > 0;
  const handleCheckout = () =>
    navigate("/payment", {
      state: {
        movieId,
        showtimeId,
        movieTitle,
        cinema,
        roomName: selectedRoomDisplayName,
        roomType: selectedRoomDisplayType,
        day,
        time,
        selectedSeats,
        selectedSeatLabels,
        selectedSeatUnits,
        seatTotal,
        comboTotal,
        snackTotal,
        total,
        totalWithSnacks,
        comboCounts,
        snackCounts,
        selectedComboDetails,
        selectedSnackDetails,
        foodItems: selectedFoodItems,
      },
    });
  const handleBreadcrumbSectionClick = () => {
    if (hasMovieSelection) {
      navigate("/Films/Film", { state: movieSelectionState });
      return;
    }
    navigate("/cinemas");
  };

  const handleBreadcrumbEntityClick = () => {
    if (hasMovieSelection && movieId) {
      navigate(`/movie/${movieId}`, {
        state: movieSelectionState?.bookingContext
          ? {
              bookingContext: movieSelectionState.bookingContext,
              movieTitle,
            }
          : { movieTitle },
      });
      return;
    }
    handleBreadcrumbSectionClick();
  };

  return (
    <div className="booking-page">
      {showAgeNotice && movieTitle && (
        <div className="booking-age-overlay" role="presentation">
          <div
            className="booking-age-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="booking-age-title"
            aria-describedby="booking-age-message"
          >
            <div className="booking-age-frame" aria-hidden="true" />
            <div
              className="booking-age-frame booking-age-frame-inner"
              aria-hidden="true"
            />
            <div className="booking-age-badge" aria-hidden="true">
              {ageLimitLabel}
            </div>
            <h2 id="booking-age-title">Lưu ý độ tuổi</h2>
            <p id="booking-age-message">
              {movieTitle} yêu cầu khán giả từ <strong>{ageLimitLabel}</strong>{" "}
              trở lên. Vui lòng chỉ tiếp tục đặt vé khi bạn đã đủ tuổi theo quy
              định của phim.
            </p>
            <button
              type="button"
              className="booking-age-confirm"
              onClick={() => setShowAgeNotice(false)}
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

      {seatRuleError && (
        <div className="booking-alert-overlay" role="presentation">
          <div
            className="booking-alert-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="booking-alert-title"
            aria-describedby="booking-alert-message"
          >
            <div className="booking-alert-frame" aria-hidden="true" />
            <div className="booking-alert-frame booking-alert-frame-inner" aria-hidden="true" />
            <div className="booking-alert-icon" aria-hidden="true">
              !
            </div>
            <h2 id="booking-alert-title">Thông báo chọn ghế</h2>
            <p id="booking-alert-message">{seatRuleError}</p>
            <button
              type="button"
              className="booking-alert-confirm"
              onClick={() => setSeatRuleError("")}
            >
              Xác nhận
            </button>
          </div>
        </div>
      )}

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
            onClick={handleBreadcrumbSectionClick}
          >
            {breadcrumbSectionLabel}
          </button>
          <span className="booking-breadcrumb-sep">›</span>
          <button
            className="booking-breadcrumb-link booking-breadcrumb-entity"
            type="button"
            onClick={handleBreadcrumbEntityClick}
          >
            {breadcrumbEntityLabel}
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

            <div className="booking-room-select-wrap">
              <span>Phòng theo lịch chiếu</span>
              <strong>
                {selectedRoomDisplayName}
                {selectedRoomDisplayType ? ` - ${selectedRoomDisplayType}` : ""}
              </strong>
            </div>
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

          {movieTitle && !loadingSeats && !seatError && !selectedRoomId && (
            <div className="booking-seat-feedback error">
              Không tìm thấy phòng của lịch chiếu đã chọn. Vui lòng quay lại và chọn lại lịch chiếu.
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

          {movieTitle && !loadingSeats && !seatError && selectedRoomId && (
            <div className="booking-seat-rule-note">
              Chọn ghế trong cùng một nhánh và dừng ở khoảng cách giữa. <strong>Trong cùng một hàng phải chọn ghế liền nhau, không được bỏ trống ghế ở giữa.</strong> Khi một hàng ngang trong nhánh chưa kín thì chưa thể chọn sang hàng trên hoặc dưới.
            </div>
          )}

          {movieTitle && !loadingSeats && !seatError && selectedRoomId && seatLayout.rows.length > 0 && (
            <div className="booking-seat-map-scroll">
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
            </div>
          )}

          {movieTitle && !loadingSeats && !seatError && selectedRoomId && seatLayout.rows.length === 0 && (
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
                {comboLoading ? (
                  <div className="booking-seat-feedback">Đang tải danh sách bắp và nước...</div>
                ) : comboError ? (
                  <div className="booking-seat-feedback error">{comboError}</div>
                ) : snackItems.length === 0 ? (
                  <div className="booking-seat-feedback">Chưa có món lẻ nào đang bán.</div>
                ) : (
                  snackItems.map((item) => {
                    const key = getFoodKey(item);
                    return (
                      <FoodSelectionCard
                        key={key}
                        item={item}
                        count={snackCounts[key]}
                        selection={foodSelections[key]}
                        onDecrease={() => updateSnack(key, -1)}
                        onIncrease={() => updateSnack(key, 1)}
                        onSelectOption={updateFoodSelection}
                      />
                    );
                  })
                )}
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
                {comboLoading ? (
                  <div className="booking-seat-feedback">Đang tải danh sách combo...</div>
                ) : comboError ? (
                  <div className="booking-seat-feedback error">{comboError}</div>
                ) : comboItems.length === 0 ? (
                  <div className="booking-seat-feedback">Chưa có combo nào đang bán.</div>
                ) : (
                  comboItems.map((item) => {
                    const key = getFoodKey(item);
                    return (
                      <FoodSelectionCard
                        key={key}
                        item={item}
                        count={comboCounts[key]}
                        selection={foodSelections[key]}
                        onDecrease={() => updateCombo(key, -1)}
                        onIncrease={() => updateCombo(key, 1)}
                        onSelectOption={updateFoodSelection}
                      />
                    );
                  })
                )}
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
            {hasSelectedFood && (
              <div className="booking-selected-food-list">
                {selectedFoodItems.map((item) => (
                  <div className="booking-selected-food-row" key={`${item.key}-${item.quantity}`}>
                    <span>
                      {item.quantity}x {item.name}
                      {item.popcornType ? ` • ${item.popcornType}` : ""}
                      {item.drinkType ? ` • ${item.drinkType}` : ""}
                    </span>
                    <strong>{formatMoney(item.totalPrice)}</strong>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              className="checkout-button"
              disabled={selectedSeats.length === 0}
              onClick={handleCheckout}
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
          {comboLoading ? (
            <div className="booking-seat-feedback">Đang tải danh sách bắp và nước...</div>
          ) : comboError ? (
            <div className="booking-seat-feedback error">{comboError}</div>
          ) : snackItems.length === 0 ? (
            <div className="booking-seat-feedback">Chưa có món lẻ nào đang bán.</div>
          ) : (
            snackItems.map((item) => {
              const key = getFoodKey(item);
              return (
                <FoodSelectionCard
                  key={key}
                  item={item}
                  count={snackCounts[key]}
                  selection={foodSelections[key]}
                  onDecrease={() => updateSnack(key, -1)}
                  onIncrease={() => updateSnack(key, 1)}
                  onSelectOption={updateFoodSelection}
                />
              );
            })
          )}
        </div>
        <div className="mobile-combo-section">
          <div className="mobile-combo-heading">🎁 Combo</div>
          {comboLoading ? (
            <div className="booking-seat-feedback">Đang tải danh sách combo...</div>
          ) : comboError ? (
            <div className="booking-seat-feedback error">{comboError}</div>
          ) : comboItems.length === 0 ? (
            <div className="booking-seat-feedback">Chưa có combo nào đang bán.</div>
          ) : (
            comboItems.map((item) => {
              const key = getFoodKey(item);
              return (
                <FoodSelectionCard
                  key={key}
                  item={item}
                  count={comboCounts[key]}
                  selection={foodSelections[key]}
                  onDecrease={() => updateCombo(key, -1)}
                  onIncrease={() => updateCombo(key, 1)}
                  onSelectOption={updateFoodSelection}
                />
              );
            })
          )}
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
              onClick={handleCheckout}
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
          <p>Giảm 5% cho thành viên Star Member khi đặt qua Sweetstar App</p>
          <button type="button" className="promo-link">
            Khám phá ngay &rsaquo;
          </button>
        </div>
      </div>
    </div>
  );
}
