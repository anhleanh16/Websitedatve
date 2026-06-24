import React, { useEffect, useMemo, useState } from "react";
import "./Film.css";
import { Link, useLocation, useNavigate } from "react-router-dom";

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
  const [activeTab, setActiveTab] = useState("now_showing");
  const [movies, setMovies] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [moviesError, setMoviesError] = useState(null);

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

  useEffect(() => {
    const controller = new AbortController();

    const loadMovies = async () => {
      setLoadingMovies(true);
      setMoviesError(null);
      try {
        const res = await fetch(`/api/user/movies?status=${encodeURIComponent(activeTab)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("API error");
        const data = await res.json();
        const list = Array.isArray(data?.movies) ? data.movies : [];
        setMovies(
          list.map((m) => ({
            id: m.movie_id,
            title: m.title,
            poster: m.poster,
            rating: Number.isFinite(Number(m.rating)) && Number(m.review_count) > 0
              ? Number(m.rating)
              : null,
            reviewCount: Number(m.review_count || 0),
            status: m.status,
          })),
        );
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.error(err);
        setMovies([]);
        setMoviesError("Không thể tải danh sách phim.");
      } finally {
        setLoadingMovies(false);
      }
    };

    loadMovies();
    return () => controller.abort();
  }, [activeTab]);

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
              <button
                className={`tab ${activeTab === "now_showing" ? "active" : ""}`}
                onClick={() => setActiveTab("now_showing")}
              >
                Phim đang chiếu
              </button>
              <button
                className={`tab ${activeTab === "coming_soon" ? "active" : ""}`}
                onClick={() => setActiveTab("coming_soon")}
              >
                Phim sắp chiếu
              </button>
            </div>

            <div className="movie-grid">
              {loadingMovies && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", opacity: 0.85 }}>
                  Đang tải phim...
                </div>
              )}

              {!loadingMovies && moviesError && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", opacity: 0.85 }}>
                  {moviesError}
                </div>
              )}

              {!loadingMovies && !moviesError && movies.length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", opacity: 0.85 }}>
                  Chưa có phim.
                </div>
              )}

              {!loadingMovies &&
                !moviesError &&
                movies.map((m) => (
                  <Link
                    to={`/movie/${m.id}`}
                    state={bookingContext ? { bookingContext, movieTitle: m.title } : { movieTitle: m.title }}
                    className="movie-card"
                    key={m.id}
                  >
                    <div
                      className="poster"
                      style={
                        m.poster
                          ? {
                              backgroundImage: `url(${m.poster})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    />

                    <div className="card-actions">
                      {typeof m.rating === "number" && (
                        <div className="rating" aria-label={`Đánh giá ${m.rating} sao`}>
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
                      )}

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
