import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaSearch,
  FaCalendarAlt,
  FaEye,
  FaHeart,
  FaShareAlt,
  FaTag,
  FaFire,
  FaClock,
  FaArrowRight,
} from "react-icons/fa";
import { userNewsService } from "../../services/userApi";
import { toAbsoluteAssetUrl } from "../../../utils/api";
import "./News.css";

const CATEGORY_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "movie_news", label: "Tin điện ảnh" },
  { value: "promotion", label: "Khuyến mãi" },
  { value: "event", label: "Sự kiện" },
  { value: "coming_soon", label: "Sắp chiếu" },
  { value: "review", label: "Review" },
  { value: "announcement", label: "Thông báo" },
];

const TAGS = [
  "Marvel",
  "Pixar",
  "Disney",
  "Phim Việt",
  "IMAX",
  "4DX",
  "Bom tấn",
  "Ưu đãi",
  "Sự kiện",
  "Hoạt hình",
  "Kinh dị",
];

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("vi-VN");
};

const formatViews = (value) => Number(value || 0).toLocaleString("vi-VN");

const estimateReadTime = (content = "") => {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 180))} phút`;
};

const getCategoryLabel = (value) =>
  CATEGORY_OPTIONS.find((item) => item.value === value)?.label || value;

export default function News() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedIds, setLikedIds] = useState(new Set());
  const [newsItems, setNewsItems] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    const loadNews = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await userNewsService.getAll();
        setNewsItems(Array.isArray(data?.news) ? data.news : []);
        setFeatured(data?.featured || null);
        setTrending(Array.isArray(data?.trending) ? data.trending : []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Không thể tải tin tức.");
      } finally {
        setLoading(false);
      }
    };

    loadNews();
  }, []);

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return newsItems.filter((item) => {
      const matchCat = activeCategory === "all" || item.category === activeCategory;
      const matchSearch =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.short_description?.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });
  }, [activeCategory, newsItems, searchQuery]);

  const displayedNews = filtered.slice(0, visibleCount);
  const canLoadMore = visibleCount < filtered.length;

  const toggleLike = (id) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleFeaturedShare = async () => {
    if (!featured) return;

    const shareUrl = `${window.location.origin}/news/${featured.slug}`;
    const shareData = {
      title: featured.title,
      text: featured.short_description || featured.title,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Đã mở chia sẻ.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage("Đã sao chép liên kết.");
      } else {
        const input = document.createElement("textarea");
        input.value = shareUrl;
        input.setAttribute("readonly", "");
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
        setShareMessage("Đã sao chép liên kết.");
      }
    } catch (shareError) {
      if (shareError?.name !== "AbortError") {
        setShareMessage("Không thể chia sẻ bài viết.");
      }
    }

    window.setTimeout(() => setShareMessage(""), 2500);
  };

  return (
    <div className="news-page">
      <div className="news-breadcrumb">
        <button className="back-btn" onClick={() => window.history.back()}>
          ← Quay lại
        </button>
        <div className="breadcrumb-items">
          <Link to="/">Trang chủ</Link>
          <span className="sep">›</span>
          <span className="current">Tin tức</span>
        </div>
      </div>

      <div className="news-page-header">
        <div className="news-page-title-group">
          <h1>Tin tức & Sự kiện</h1>
          <p>Cập nhật thông tin điện ảnh, ưu đãi và sự kiện mới nhất từ Sweetstar Movie.</p>
        </div>
        <div className="news-search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Tìm kiếm tin tức..."
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setVisibleCount(6);
            }}
            aria-label="Tìm kiếm tin tức"
          />
        </div>
      </div>

      {featured && (
        <section className="news-featured">
          <div className="featured-body">
            <div className="featured-left">
              <div className="featured-chips">
                <span className="featured-tag">
                  <FaFire /> NỔI BẬT
                </span>
                <span className="featured-cat">{getCategoryLabel(featured.category)}</span>
              </div>
              <h2 className="featured-title">{featured.title}</h2>
              <div className="featured-excerpt" dangerouslySetInnerHTML={{ __html: featured.short_description || "Khám phá bài viết nổi bật mới nhất tại Sweetstar Movie." }} />
              <div className="featured-meta">
                <span>
                  <FaCalendarAlt /> {formatDate(featured.published_at || featured.created_at)}
                </span>
                <span>
                  <FaEye /> {formatViews(featured.view_count)}
                </span>
                <span>
                  <FaClock /> {estimateReadTime(featured.content)} đọc
                </span>
              </div>
              <div className="featured-actions">
                <Link className="btn-read-more" to={`/news/${featured.slug}`}>
                  Đọc ngay →
                </Link>
                <button
                  className="btn-share"
                  onClick={handleFeaturedShare}
                >
                  <FaShareAlt /> {shareMessage || "Chia sẻ"}
                </button>
              </div>
            </div>
            <div className="featured-right">
              {featured.thumbnail ? (
                <img
                  className="featured-cover-image"
                  src={toAbsoluteAssetUrl(featured.thumbnail)}
                  alt={featured.title}
                />
              ) : (
                <div className="featured-img-placeholder">
                  <span>📰</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="news-main">
        <div className="news-content">
          <div className="news-filter-bar">
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat.value}
                className={`filter-btn ${activeCategory === cat.value ? "active" : ""}`}
                onClick={() => {
                  setActiveCategory(cat.value);
                  setVisibleCount(6);
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="news-empty">
              <span>📰</span>
              <p>Đang tải danh sách tin tức...</p>
            </div>
          ) : error ? (
            <div className="news-empty">
              <span>⚠️</span>
              <p>{error}</p>
            </div>
          ) : displayedNews.length > 0 ? (
            <div className="news-grid">
              {displayedNews.map((item) => (
                <article key={item.news_id} className="news-card">
                  <div className="news-card-img">
                    {item.thumbnail ? (
                      <img
                        className="news-card-image"
                        src={toAbsoluteAssetUrl(item.thumbnail)}
                        alt={item.title}
                      />
                    ) : (
                      <div className="news-card-img-placeholder">📰</div>
                    )}
                    {(Number(item.view_count || 0) >= 100 || item.news_id === featured?.news_id) && (
                      <span className="news-hot-badge">
                        <FaFire /> HOT
                      </span>
                    )}
                    <span className="news-cat-badge">{getCategoryLabel(item.category)}</span>
                  </div>
                  <div className="news-card-body">
                    <div className="news-card-meta">
                      <span>
                        <FaCalendarAlt /> {formatDate(item.published_at || item.created_at)}
                      </span>
                      <span>
                        <FaClock /> {estimateReadTime(item.content)}
                      </span>
                    </div>
                    <Link className="news-card-title-link" to={`/news/${item.slug}`}>
                      <h3 className="news-card-title">{item.title}</h3>
                    </Link>
                    <div className="news-card-excerpt" dangerouslySetInnerHTML={{ __html: item.short_description || "Bài viết đang được cập nhật mô tả ngắn." }} />
                    <div className="news-card-footer">
                      <div className="news-card-stats">
                        <span>
                          <FaEye /> {formatViews(item.view_count)}
                        </span>
                        <button
                          className={`like-btn ${likedIds.has(item.news_id) ? "liked" : ""}`}
                          onClick={() => toggleLike(item.news_id)}
                          aria-label="Thích"
                        >
                          <FaHeart /> {likedIds.has(item.news_id) ? 1 : 0}
                        </button>
                      </div>
                      <Link className="btn-read-card" to={`/news/${item.slug}`}>
                        <span>Đọc thêm</span>
                        <FaArrowRight aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="news-empty">
              <span>🔍</span>
              <p>Không tìm thấy tin tức phù hợp</p>
            </div>
          )}

          {canLoadMore && (
            <div className="news-load-more">
              <button className="btn-load-more" onClick={() => setVisibleCount((prev) => prev + 6)}>
                Xem thêm tin tức
              </button>
            </div>
          )}
        </div>

        <aside className="news-sidebar">
          <div className="sidebar-widget">
            <div className="widget-header">
              <FaFire style={{ color: "#f97316" }} />
              <h3>Xu hướng</h3>
            </div>
            <ol className="trending-list">
              {trending.map((item, idx) => (
                <li key={item.news_id} className="trending-item">
                  <span className={`trending-num ${idx < 3 ? "top" : ""}`}>{idx + 1}</span>
                  <div className="trending-body">
                    <Link className="trending-title" to={`/news/${item.slug}`}>
                      {item.title}
                    </Link>
                    <span className="trending-views">
                      <FaEye /> {formatViews(item.view_count)}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="sidebar-widget">
            <div className="widget-header">
              <FaTag style={{ color: "#818cf8" }} />
              <h3>Chủ đề phổ biến</h3>
            </div>
            <div className="tag-cloud">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  className="tag-chip"
                  onClick={() => setSearchQuery(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-widget newsletter-widget">
            <div className="widget-header">
              <span>📬</span>
              <h3>Nhận tin mới nhất</h3>
            </div>
            <p className="newsletter-desc">
              Đăng ký để nhận thông báo về phim, ưu đãi và sự kiện mỗi tuần.
            </p>
            <div className="newsletter-form">
              <input type="email" placeholder="Email của bạn" aria-label="Email đăng ký nhận tin" />
              <button className="newsletter-btn" type="button">Đăng ký</button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
