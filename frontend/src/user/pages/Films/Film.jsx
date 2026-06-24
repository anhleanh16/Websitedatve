import React, { useEffect, useMemo, useState } from "react";
import "./Film.css";
import { Link, useLocation, useNavigate } from "react-router-dom";

const sampleMovies = [
  { id: 1, title: "Doraemon: Nobita và cuộc chiến vũ trụ tí hon", rating: 5 },
  { id: 2, title: "Oppenheimer", rating: 5 },
  { id: 3, title: "Dune: Part Two", rating: 5 },
  { id: 4, title: "Inside Out 2", rating: 4 },
  { id: 5, title: "Barbie", rating: 4 },
  { id: 6, title: "The Batman", rating: 5 },
  { id: 7, title: "Wicked", rating: 4 },
  { id: 8, title: "Gladiator II", rating: 4 },
];

const banners = [
  "/uploads/banners/banner1.jpg",
  "/uploads/banners/banner2.jpg",
  "/uploads/banners/banner3.jpg",
];

export default function Film() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const bookingContext = location.state?.bookingContext || null;

  const bookingSummary = useMemo(() => {
    if (!bookingContext) return null;
    const roomParts = [bookingContext.roomName, bookingContext.roomType].filter(Boolean);
    return {
      cinemaName: bookingContext.cinema || "Rạp đã chọn",
      roomLabel: roomParts.length > 0 ? roomParts.join(" • ") : "Chưa chọn phòng",
    };
  }, [bookingContext]);

  const handleBannerChange = (newIndex) => {
    setIsTransitioning(true);
    setCurrentBannerIndex(newIndex);
    setTimeout(() => setIsTransitioning(false), 600);
  };

  const goToPrevBanner = () => {
    const newIndex =
      currentBannerIndex === 0 ? banners.length - 1 : currentBannerIndex - 1;
    handleBannerChange(newIndex);
  };

  const goToNextBanner = () => {
    const newIndex =
      currentBannerIndex === banners.length - 1 ? 0 : currentBannerIndex + 1;
    handleBannerChange(newIndex);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      goToNextBanner();
    }, 5000);

    return () => clearInterval(interval);
  }, [currentBannerIndex]);

  return (
    <div className="film-page">
      <div className="breadcrumb">
        <button className="back-btn" onClick={() => window.history.back()}>
          ← Quay lại
        </button>
        <div className="breadcrumb-items">
          <Link to="/">Trang chủ</Link>
          <span className="separator">›</span>
          <span className="current">Phim</span>
        </div>
      </div>
      <div className="film-container">
        <main className="film-main">
          <section className="film-left">
            <div className="hero">
              {bookingSummary && (
                <div className="booking-intent-banner">
                  <div>
                    <strong>Chọn phim trước khi đặt vé</strong>
                    <p>
                      Bạn đang đặt vé tại {bookingSummary.cinemaName}
                      {bookingSummary.roomLabel ? ` • ${bookingSummary.roomLabel}` : ""}.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn secondary booking-intent-back"
                    onClick={() => navigate("/cinemas")}
                  >
                    Đổi rạp
                  </button>
                </div>
              )}

              <div
                className={`hero-carousel ${isTransitioning ? "transition" : ""}`}
                style={{
                  backgroundImage: `url(${banners[currentBannerIndex]})`,
                }}
              >
                <div className="banner-overlay" />
              </div>
              <div className="hero-controls">
                <button className="hc" onClick={goToPrevBanner}>
                  ‹
                </button>
                <button className="hc" onClick={goToNextBanner}>
                  ›
                </button>
              </div>
              <div className="banner-indicators">
                {banners.map((_, idx) => (
                  <button
                    key={idx}
                    className={`indicator ${idx === currentBannerIndex ? "active" : ""}`}
                    onClick={() => handleBannerChange(idx)}
                    aria-label={`Banner ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <div className="tabs">
              <button className="tab active">Phim đang chiếu</button>
              <button className="tab">Phim sắp chiếu</button>
            </div>

            <div className="movie-grid">
              {sampleMovies.map((m) => (
                <Link
                  to={`/movie/${m.id}`}
                  state={{
                    bookingContext,
                    movieTitle: m.title,
                  }}
                  className="movie-card"
                  key={m.id}
                >
                  <div className="poster" />

                  <div className="card-actions">
                    <div
                      className="rating"
                      aria-label={`Đánh giá ${m.rating} sao`}
                    >
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < m.rating ? "star filled" : "star"}
                        >
                          ★
                        </span>
                      ))}
                      <span className="rating-num">{m.rating}.0</span>
                    </div>

                    <div className="action-btns">
                      <button className="btn primary" type="button">
                        {bookingContext ? "Chọn phim này" : "Mua vé"}
                      </button>
                      <button className="btn secondary">Chi tiết</button>
                    </div>
                  </div>

                  <div className="movie-title">{m.title}</div>
                </Link>
              ))}
            </div>

            <div className="load-more">
              <button className="btn load-more-btn">Xem thêm</button>
            </div>
          </section>

          <aside className="film-right">
            <div className="quick-book">
              <h4>Đặt vé nhanh</h4>
              <button type="button">
                {bookingSummary ? bookingSummary.cinemaName : "Chọn rạp"}
              </button>
              <button type="button">
                {bookingSummary ? bookingSummary.roomLabel : "Chọn phòng"}
              </button>
              <button type="button">Chọn phim</button>
              <button type="button">Chọn suất chiếu</button>
            </div>

            <div className="suggest">Gợi ý cho bạn</div>
            <div className="ad">Banner quảng cáo</div>
          </aside>
        </main>
      </div>
    </div>
  );
}
