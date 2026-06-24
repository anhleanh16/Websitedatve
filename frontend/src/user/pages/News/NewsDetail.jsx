import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaCalendarAlt, FaClock, FaEye, FaTag } from "react-icons/fa";
import { userNewsService } from "../../services/userApi";
import { toAbsoluteAssetUrl } from "../../../utils/api";
import "./NewsDetail.css";

const CATEGORY_LABELS = {
  movie_news: "Tin điện ảnh",
  promotion: "Khuyến mãi",
  event: "Sự kiện",
  coming_soon: "Sắp chiếu",
  review: "Review",
  announcement: "Thông báo",
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
};

const readTime = (content = "") => {
  const words = String(content).trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 180))} phút đọc`;
};

export default function NewsDetail() {
  const { slug } = useParams();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await userNewsService.getBySlug(slug);
        setArticle(data?.article || null);
        setRelated(Array.isArray(data?.related) ? data.related : []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Không thể tải chi tiết bài viết.");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      loadDetail();
    }
  }, [slug]);

  const categoryLabel = useMemo(
    () => CATEGORY_LABELS[article?.category] || article?.category || "Tin tức",
    [article],
  );

  if (loading) {
    return (
      <div className="news-detail-page">
        <div className="news-detail-empty">Đang tải bài viết...</div>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="news-detail-page">
        <div className="news-detail-empty">{error || "Không tìm thấy bài viết."}</div>
      </div>
    );
  }

  return (
    <div className="news-detail-page">
      <div className="news-detail-breadcrumb">
        <Link to="/">Trang chủ</Link>
        <span>›</span>
        <Link to="/news">Tin tức</Link>
        <span>›</span>
        <strong>{article.title}</strong>
      </div>

      <article className="news-detail-article">
        <header className="news-detail-header">
          <div className="news-detail-badges">
            <span className="news-detail-category">
              <FaTag /> {categoryLabel}
            </span>
          </div>
          <h1>{article.title}</h1>
          <p>{article.short_description || "Bài viết đang được cập nhật mô tả ngắn."}</p>

          <div className="news-detail-meta">
            <span>
              <FaCalendarAlt /> {formatDate(article.published_at || article.created_at)}
            </span>
            <span>
              <FaEye /> {Number(article.view_count || 0).toLocaleString("vi-VN")} lượt xem
            </span>
            <span>
              <FaClock /> {readTime(article.content)}
            </span>
            <span>Tác giả: {article.author_name || "Lunexa"}</span>
          </div>
        </header>

        {article.thumbnail && (
          <div className="news-detail-cover-wrap">
            <img
              className="news-detail-cover"
              src={toAbsoluteAssetUrl(article.thumbnail)}
              alt={article.title}
            />
          </div>
        )}

        <div className="news-detail-content">
          {String(article.content || "")
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
        </div>
      </article>

      <section className="news-detail-related">
        <div className="news-detail-related-header">
          <h2>Bài viết liên quan</h2>
          <Link to="/news">Xem tất cả</Link>
        </div>

        <div className="news-detail-related-grid">
          {related.length === 0 ? (
            <div className="news-detail-empty">Chưa có bài viết liên quan.</div>
          ) : (
            related.map((item) => (
              <Link key={item.news_id} to={`/news/${item.slug}`} className="news-detail-related-card">
                <div className="news-detail-related-thumb">
                  {item.thumbnail ? (
                    <img src={toAbsoluteAssetUrl(item.thumbnail)} alt={item.title} />
                  ) : (
                    <span>📰</span>
                  )}
                </div>
                <div className="news-detail-related-body">
                  <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                  <strong>{item.title}</strong>
                  <p>{item.short_description || "Khám phá thêm bài viết này."}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
