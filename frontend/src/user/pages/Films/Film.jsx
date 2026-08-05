import React, { useEffect, useMemo, useState } from "react";
import "./Film.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import QuickBookWidget from "../../Components/QuickBookWidget/QuickBookWidget";
import { userMovieService } from "../../services/userApi";
import { getActiveHomeBanners, hydrateHomeBannerImages } from "../../utils/homeBanners";

const VISITED_TAG_STORAGE_KEY = "sweetstar_user_tag_preferences";

const normalizeMovieItem = (m) => ({
  id: m.movie_id,
  title: m.title,
  poster: m.poster,
  ageLimit: Number(m.age_limit || 0),
  rating:
    Number.isFinite(Number(m.rating)) && Number(m.review_count) > 0
      ? Number(m.rating)
      : null,
  reviewCount: Number(m.review_count || 0),
  status: m.status,
  releaseDate: m.release_date || "",
  categories: Array.isArray(m.categories) ? m.categories : [],
});

export default function Film() {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [banners, setBanners] = useState(getActiveHomeBanners);

  useEffect(() => {
    hydrateHomeBannerImages(banners).then(setBanners);
  }, []);
  const bookingContext = location.state?.bookingContext || null;

  const bookingSummary = useMemo(() => {
    if (!bookingContext) return null;
    const roomParts = [bookingContext.roomName, bookingContext.roomType].filter(Boolean);
    return {
      cinemaName: bookingContext.cinema || "Rạp đã chọn",
      roomLabel: roomParts.length > 0 ? roomParts.join(" • ") : "Chưa chọn phòng",
    };
  }, [bookingContext]);
  const quickBookingSteps = useMemo(
    () => [
      {
        id: "cinema",
        step: "Bước 1",
        title: bookingSummary ? bookingSummary.cinemaName : "Chọn rạp",
        description: "Bắt đầu bằng rạp bạn muốn xem phim.",
      },
      {
        id: "room",
        step: "Bước 2",
        title: bookingSummary ? bookingSummary.roomLabel : "Chọn phòng",
        description: "Xem phòng chiếu và định dạng phù hợp.",
      },
      {
        id: "movie",
        step: "Bước 3",
        title: "Chọn phim",
        description: "Mở phim bạn thích để xem lịch chiếu.",
      },
      {
        id: "showtime",
        step: "Bước 4",
        title: "Chọn suất chiếu",
        description: "Chọn giờ đẹp rồi vào thẳng phần đặt ghế.",
      },
    ],
    [bookingSummary],
  );
  const [activeTab, setActiveTab] = useState("now_showing");
  const [movies, setMovies] = useState([]);
  const [movieCatalog, setMovieCatalog] = useState([]);
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [moviesError, setMoviesError] = useState(null);
  const [buyingMovieId] = useState(null);

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
    const loadMovies = async () => {
      setLoadingMovies(true);
      setMoviesError(null);
      try {
        const data = await userMovieService.getAll({ status: activeTab });
        const list = Array.isArray(data?.movies) ? data.movies : [];
        setMovies(list.map(normalizeMovieItem));
      } catch (err) {
        console.error(err);
        setMovies([]);
        setMoviesError("Không thể tải danh sách phim.");
      } finally {
        setLoadingMovies(false);
      }
    };

    loadMovies();
  }, [activeTab]);

  useEffect(() => {
    const loadMovieCatalog = async () => {
      try {
        const data = await userMovieService.getAll();
        const list = Array.isArray(data?.movies) ? data.movies : [];
        setMovieCatalog(list.map(normalizeMovieItem));
      } catch (err) {
        console.error(err);
        setMovieCatalog([]);
      }
    };

    loadMovieCatalog();
  }, []);

  const suggestedMovies = useMemo(() => {
    const source = movieCatalog.length > 0 ? movieCatalog : movies;
    const visibleMovieIds = new Set(movies.map((movie) => movie.id));

    let tagScores = {};
    try {
      const raw = window.localStorage.getItem(VISITED_TAG_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      tagScores = parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      console.error("Không thể đọc lịch sử tag đã xem:", error);
    }

    const scoredMovies = source
      .filter((movie) => movie.status !== "ended")
      .map((movie) => {
        const score = (Array.isArray(movie.categories) ? movie.categories : []).reduce(
          (total, category) =>
            total + Number(tagScores[Number(category?.category_id)] || 0),
          0,
        );
        return { ...movie, recommendationScore: score };
      })
      .filter(
        (movie) =>
          movie.recommendationScore > 0 && !visibleMovieIds.has(movie.id),
      )
      .sort((a, b) => {
        if (b.recommendationScore !== a.recommendationScore) {
          return b.recommendationScore - a.recommendationScore;
        }
        if ((b.rating || 0) !== (a.rating || 0)) {
          return (b.rating || 0) - (a.rating || 0);
        }
        return new Date(b.releaseDate) - new Date(a.releaseDate);
      });

    const fallbackMovies = source
      .filter((movie) => movie.status !== "ended" && !visibleMovieIds.has(movie.id))
      .sort((a, b) => {
        if ((b.rating || 0) !== (a.rating || 0)) {
          return (b.rating || 0) - (a.rating || 0);
        }
        return new Date(b.releaseDate) - new Date(a.releaseDate);
      });

    const merged = [...scoredMovies];
    fallbackMovies.forEach((movie) => {
      if (!merged.some((item) => item.id === movie.id)) {
        merged.push(movie);
      }
    });

    return merged.slice(0, 3);
  }, [movieCatalog, movies]);

  const goToMovieDetail = (movie) => {
    navigate(`/movie/${movie.id}`, {
      state: bookingContext
        ? { bookingContext, movieTitle: movie.title }
        : { movieTitle: movie.title },
    });
  };

  const formatBookingDay = (input) => {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return "Hôm nay";
    return d.toLocaleDateString("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatBookingTime = (input, roomType) => {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return roomType || "Suất chiếu";
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}${roomType ? ` - ${roomType}` : ""}`;
  };

  const handleBuyTicket = (movie) => {
    // Luôn chuyển tới trang chi tiết phim và scroll xuống phần chọn khung giờ
    navigate(`/movie/${movie.id}`, {
      state: {
        ...(bookingContext ? { bookingContext, movieTitle: movie.title } : { movieTitle: movie.title }),
        scrollToSchedule: true,
      },
    });
  };

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
                  backgroundImage: `url(${banners[currentBannerIndex]?.image})`,
                }}
              >
                <div className="banner-overlay" />
                <div className="banner-content">
                  <h2>{banners[currentBannerIndex]?.title}</h2>
                  <p>{banners[currentBannerIndex]?.subtitle}</p>
                </div>
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
                  <article className="movie-card" key={m.id}>
                    <div
                      className="poster"
                      role="button"
                      tabIndex={0}
                      onClick={() => goToMovieDetail(m)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          goToMovieDetail(m);
                        }
                      }}
                      style={
                        m.poster
                          ? {
                              backgroundImage: `url(${m.poster})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      <span className="poster-age-badge">
                        {m.ageLimit > 0 ? `${m.ageLimit}+` : "P"}
                      </span>
                    </div>

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
                        <button
                          className="btn primary"
                          type="button"
                          onClick={() => handleBuyTicket(m)}
                        >
                          Mua vé
                        </button>
                        <button
                          className="btn secondary"
                          type="button"
                          onClick={() => goToMovieDetail(m)}
                        >
                          Chi tiết
                        </button>
                      </div>
                    </div>

                    <div className="movie-title">{m.title}</div>
                  </article>
                ))}
            </div>

          </section>

          <aside className="film-right">
            <QuickBookWidget />

            <div className="suggest">
              <div className="suggest-header">
                <h4>Gợi ý cho bạn</h4>
                <span>Dựa trên các Tags bạn hay xem</span>
              </div>
              <div className="suggest-list">
                {suggestedMovies.length > 0 ? (
                  suggestedMovies.map((movie) => (
                    <button
                      key={movie.id}
                      type="button"
                      className="suggest-card"
                      onClick={() => goToMovieDetail(movie)}
                    >
                      <div
                        className="suggest-poster"
                        style={
                          movie.poster
                            ? {
                                backgroundImage: `url(${movie.poster})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }
                            : undefined
                        }
                      >
                        <span className="suggest-age-badge">
                          {movie.ageLimit > 0 ? `${movie.ageLimit}+` : "P"}
                        </span>
                      </div>
                      <div className="suggest-content">
                        <strong>{movie.title}</strong>
                        <p>
                          {movie.categories.length > 0
                            ? movie.categories
                                .slice(0, 2)
                                .map((category) => category.category_name)
                                .join(" • ")
                            : "Chưa có Tags"}
                        </p>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="suggest-empty">
                    Hãy xem vài phim có Tags bạn thích, hệ thống sẽ gợi ý đúng hơn.
                  </div>
                )}
              </div>
            </div>
            <Link
              to="/"
              className="ad"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(7, 10, 24, 0.2), rgba(7, 10, 24, 0.76)), url(${banners[(currentBannerIndex + 1) % banners.length]?.image})`,
              }}
            >
              <div className="ad-content">
                <span className="ad-badge">Ưu đãi</span>
                <strong>Đặt vé sớm</strong>
                <p>Chọn suất đẹp và trải nghiệm phim hot tại Sweetstar Movie.</p>
                <span className="ad-cta">Khám phá ngay</span>
              </div>
            </Link>
          </aside>
        </main>
      </div>
    </div>
  );
}
