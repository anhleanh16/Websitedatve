import React, { useState, useEffect } from "react";
import "./Film.css";
import { Link } from "react-router-dom";

const sampleMovies = Array.from({ length: 16 }).map((_, i) => ({
  id: i + 1,
  title: `Phim ${i + 1}`,
  poster: "",
  rating: Math.floor(Math.random() * 3) + 3, // 3..5
}));

const banners = [
  "/uploads/banners/banner1.jpg",
  "/uploads/banners/banner2.jpg",
  "/uploads/banners/banner3.jpg",
];

export default function Film() {
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
                <Link to={`/movie/${m.id}`} className="movie-card" key={m.id}>
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
                      <button className="btn primary">Mua vé</button>
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
              <button>Chọn phim</button>
              <button>Chọn rạp</button>
              <button>Chọn ngày</button>
              <button>Chọn suất chiếu</button>
            </div>

            <div className="suggest">Gợi ý cho bạn</div>
            <div className="ad">Banner quảng cáo</div>
          </aside>
        </main>
      </div>
    </div>
  );
}
