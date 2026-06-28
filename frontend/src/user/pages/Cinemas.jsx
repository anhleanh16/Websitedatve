import React, { useEffect, useMemo, useState } from "react";
import "./Cinemas.css";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { userCinemaService } from "../services/userApi";

const banners = [
  "/uploads/banners/banner1.jpg",
  "/uploads/banners/banner2.jpg",
  "/uploads/banners/banner3.jpg",
];

const FALLBACK_BANNER = "/uploads/banners/banner1.jpg";

const getRoomTypeLabel = (type) => {
  if (!type) return "Phòng chiếu";
  return String(type).toUpperCase();
};

const summarizeCinema = (cinema) => {
  const rooms = Array.isArray(cinema.rooms) ? cinema.rooms : [];
  const roomTypes = [
    ...new Set(rooms.map((room) => room.room_type).filter(Boolean)),
  ];
  const totalSeats = rooms.reduce(
    (sum, room) => sum + (Number(room.total_seat) || room.seats?.length || 0),
    0,
  );
  const seatTypes = new Set();

  rooms.forEach((room) => {
    (room.seats || []).forEach((seat) => {
      if (seat?.seat_type) seatTypes.add(seat.seat_type);
    });
  });

  return {
    roomCount: rooms.length,
    totalSeats,
    facilities: [...roomTypes, ...seatTypes].slice(0, 6),
  };
};

const getFirstBookingRoom = (cinema) =>
  (cinema.rooms || []).find((room) => Number(room.total_seat) > 0) ||
  (cinema.rooms || [])[0] ||
  null;

export default function Cinemas() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [selectedCity, setSelectedCity] = useState("Tất cả tỉnh/thành");
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [cinemas, setCinemas] = useState([]);
  const [expandedCinemaId, setExpandedCinemaId] = useState(null);
  const [selectedCinemaId, setSelectedCinemaId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    const fetchCinemas = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await userCinemaService.getAll();

        if (ignore) return;

        const nextCinemas = Array.isArray(data.cinemas) ? data.cinemas : [];
        setCinemas(nextCinemas);

        if (nextCinemas.length > 0) {
          setSelectedCinemaId((prev) => prev ?? nextCinemas[0].cinemas_id);
          setExpandedCinemaId((prev) => prev ?? nextCinemas[0].cinemas_id);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError.message || "Không thể tải danh sách rạp.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    fetchCinemas();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (searchQuery) {
      searchParams.set("q", searchQuery);
    } else {
      searchParams.delete("q");
    }
    setSearchParams(searchParams, { replace: true });
  }, [searchQuery, searchParams, setSearchParams]);

  const cityOptions = useMemo(() => {
    const citySet = new Set(
      cinemas.map((cinema) => String(cinema.city || "").trim()).filter(Boolean),
    );
    return [
      "Tất cả tỉnh/thành",
      ...Array.from(citySet).sort((a, b) => a.localeCompare(b, "vi")),
    ];
  }, [cinemas]);

  const filteredCinemas = useMemo(
    () =>
      cinemas.filter((cinema) => {
        const city = String(cinema.city || "").trim();
        const name = String(cinema.cinema_name || "").toLowerCase();
        const address = String(cinema.address || "").toLowerCase();
        const phone = String(cinema.phone || "").toLowerCase();
        const normalizedQuery = searchQuery.trim().toLowerCase();
        const matchesCity =
          selectedCity === "Tất cả tỉnh/thành" || city === selectedCity;
        const matchesSearch =
          !normalizedQuery ||
          name.includes(normalizedQuery) ||
          address.includes(normalizedQuery) ||
          phone.includes(normalizedQuery);

        return matchesCity && matchesSearch;
      }),
    [cinemas, searchQuery, selectedCity],
  );

  useEffect(() => {
    if (filteredCinemas.length === 0) {
      setSelectedCinemaId(null);
      return;
    }

    const hasSelected = filteredCinemas.some(
      (cinema) => cinema.cinemas_id === selectedCinemaId,
    );
    if (!hasSelected) {
      setSelectedCinemaId(filteredCinemas[0].cinemas_id);
    }
  }, [filteredCinemas, selectedCinemaId]);

  const selectedCinema =
    filteredCinemas.find((cinema) => cinema.cinemas_id === selectedCinemaId) ||
    filteredCinemas[0] ||
    null;

  const featuredCinema = selectedCinema || cinemas[0] || null;
  const featuredSummary = featuredCinema
    ? summarizeCinema(featuredCinema)
    : null;

  const handleToggleDetails = (cinemaId) => {
    setExpandedCinemaId((prev) => (prev === cinemaId ? null : cinemaId));
    setSelectedCinemaId(cinemaId);
  };

  const handleBooking = (cinema) => {
    const room = getFirstBookingRoom(cinema);
    navigate("/Films/Film", {
      state: {
        bookingContext: {
          cinema: cinema.cinema_name,
          cinemaId: cinema.cinemas_id,
          roomId: room?.room_id || null,
          roomName: room?.room_name || "",
          roomType: room?.room_type || "",
          day: "Hôm nay",
        },
      },
    });
  };

  return (
    <div className="cinema-page">
      <div className="breadcrumb">
        <button className="back-btn" onClick={() => window.history.back()}>
          ← Quay lại
        </button>
        <div className="breadcrumb-items">
          <Link to="/">Trang chủ</Link>
          <span className="separator">›</span>
          <span className="current">Rạp chiếu phim</span>
        </div>
      </div>
      <div className="cinema-container">
        <main className="cinema-main">
          <section className="cinema-left">
            <div className="hero">
              <div
                className="hero-banner"
                style={{
                  backgroundImage: `url(${banners[0]})`,
                }}
              >
                <div className="banner-overlay" />
                <div className="banner-content">
                  <h2>Rạp chiếu phim</h2>
                  <p>
                    Xem danh sách rạp thật, phòng chiếu đang có và chọn rạp phù
                    hợp để đặt vé nhanh.
                  </p>
                </div>
              </div>
            </div>

            <div className="filter-section">
              <div className="city-selector">
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="city-select"
                >
                  {cityOptions.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Tìm theo tên rạp, địa chỉ hoặc số điện thoại..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading && (
              <div className="cinema-feedback">
                <p>Đang tải danh sách rạp từ hệ thống...</p>
              </div>
            )}

            {!loading && error && (
              <div className="cinema-feedback error">
                <p>{error}</p>
                <button
                  className="btn secondary"
                  onClick={() => window.location.reload()}
                >
                  Tải lại
                </button>
              </div>
            )}

            {!loading && !error && (
              <div className="cinema-list">
                {filteredCinemas.map((cinema) => {
                  const summary = summarizeCinema(cinema);
                  const isExpanded = expandedCinemaId === cinema.cinemas_id;
                  const isSelected = selectedCinemaId === cinema.cinemas_id;

                  return (
                    <div
                      key={cinema.cinemas_id}
                      className={`cinema-card${isSelected ? " selected" : ""}`}
                    >
                      <div className="cinema-card-top">
                        <div className="cinema-cover">
                          <img
                            src={cinema.image || banners[0] || FALLBACK_BANNER}
                            alt={cinema.cinema_name}
                          />
                        </div>

                        <div className="cinema-body">
                          <div className="cinema-header">
                            <div>
                              <h3 className="cinema-name">
                                {cinema.cinema_name}
                              </h3>
                              <p className="cinema-location">
                                {cinema.address || "Đang cập nhật địa chỉ"}
                              </p>
                            </div>
                            <div className="cinema-rating">
                              <span className="star">★</span>
                              <span>{summary.roomCount || 0}</span>
                            </div>
                          </div>

                          <div className="cinema-info">
                            <span className="info-item">
                              🎬 {summary.roomCount} phòng chiếu
                            </span>
                            <span className="info-item">
                              💺 {summary.totalSeats} ghế
                            </span>
                            <span className="info-item">
                              📍 {cinema.city || "Đang cập nhật"}
                            </span>
                            <span className="info-item">
                              ☎ {cinema.phone || "Chưa có số điện thoại"}
                            </span>
                          </div>

                          {summary.facilities.length > 0 && (
                            <div className="cinema-facilities">
                              {summary.facilities.map((facility, index) => (
                                <span key={`${facility}-${index}`} className="facility-tag">
                                  {facility}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="cinema-actions">
                            <button
                              className="btn secondary"
                              onClick={() =>
                                handleToggleDetails(cinema.cinemas_id)
                              }
                            >
                              {isExpanded ? "Ẩn chi tiết" : "Xem chi tiết"}
                            </button>
                            <button
                              className="btn primary"
                              onClick={() => handleBooking(cinema)}
                            >
                              Chọn phim
                            </button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="cinema-details">
                          <div className="cinema-detail-grid">
                            <div className="cinema-detail-panel">
                              <h4>Thông tin rạp</h4>
                              <ul className="detail-list">
                                <li>Tên rạp: {cinema.cinema_name}</li>
                                <li>
                                  Thành phố: {cinema.city || "Đang cập nhật"}
                                </li>
                                <li>
                                  Địa chỉ: {cinema.address || "Đang cập nhật"}
                                </li>
                                <li>
                                  Số điện thoại:{" "}
                                  {cinema.phone ||
                                    "Chưa cập nhật số điện thoại"}
                                </li>
                              </ul>
                            </div>

                            <div className="cinema-detail-panel">
                              <h4>Phòng đang có</h4>
                              <div className="room-list">
                                {(cinema.rooms || []).length === 0 && (
                                  <p className="room-empty">
                                    Chưa có dữ liệu phòng chiếu.
                                  </p>
                                )}

                                {(cinema.rooms || []).map((room) => {
                                  const roomSeats = Array.isArray(room.seats)
                                    ? room.seats.length
                                    : Number(room.total_seat) || 0;
                                  const gapCount = Array.isArray(room.seat_gaps)
                                    ? room.seat_gaps.length
                                    : 0;

                                  return (
                                    <div
                                      key={room.room_id}
                                      className="room-card"
                                    >
                                      <div className="room-card-head">
                                        <strong>{room.room_name}</strong>
                                        <span>
                                          {getRoomTypeLabel(room.room_type)}
                                        </span>
                                      </div>
                                      <div className="room-card-meta">
                                        <span>{roomSeats} ghế</span>
                                        <span>{gapCount} khoảng cách</span>
                                        <span>
                                          {
                                            (room.seats || []).filter(
                                              (seat) =>
                                                seat.seat_type === "VIP",
                                            ).length
                                          }{" "}
                                          ghế VIP
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loading && !error && filteredCinemas.length === 0 && (
              <div className="no-result">
                <p>Không tìm thấy rạp nào phù hợp</p>
              </div>
            )}
          </section>

          <aside className="cinema-right">
            <div className="quick-book">
              <h4>Đặt vé nhanh</h4>
              {featuredCinema ? (
                <>
                  <div className="quick-book-summary">
                    <span className="quick-book-label">Rạp đang chọn</span>
                    <strong>{featuredCinema.cinema_name}</strong>
                    <p>{featuredCinema.address}</p>
                  </div>

                  <div className="quick-book-stats">
                    <div>
                      <strong>{featuredSummary?.roomCount || 0}</strong>
                      <span>Phòng chiếu</span>
                    </div>
                    <div>
                      <strong>{featuredSummary?.totalSeats || 0}</strong>
                      <span>Tổng ghế</span>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      handleToggleDetails(featuredCinema.cinemas_id)
                    }
                  >
                    Xem phòng chiếu
                  </button>
                  <button onClick={() => handleBooking(featuredCinema)}>
                    Chọn phim trước
                  </button>
                </>
              ) : (
                <p className="quick-book-empty">
                  Chưa có dữ liệu rạp để hiển thị.
                </p>
              )}
            </div>

            <div className="suggest">
              <div className="side-card-title">Tính năng hiện có</div>
              <ul className="side-feature-list">
                <li>Lọc theo tỉnh/thành</li>
                <li>Tìm kiếm theo tên, địa chỉ, số điện thoại</li>
                <li>Xem chi tiết rạp và danh sách phòng</li>
                <li>Chuyển nhanh sang trang đặt vé</li>
              </ul>
            </div>
            <div className="ad">
              <div className="side-card-title">Gợi ý sử dụng</div>
              <p className="side-card-text">
                Chọn một rạp trong danh sách để xem ngay số phòng, số ghế và
                loại phòng đang có.
              </p>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}
