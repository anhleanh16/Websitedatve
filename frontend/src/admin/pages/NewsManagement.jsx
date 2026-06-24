import { useEffect, useMemo, useState } from "react";
import { adminNewsService } from "../services/adminApi";
import { toAbsoluteAssetUrl } from "../../utils/api";
import "./news-management.css";

const CATEGORY_OPTIONS = [
  { value: "movie_news", label: "Tin điện ảnh" },
  { value: "promotion", label: "Khuyến mãi" },
  { value: "event", label: "Sự kiện" },
  { value: "coming_soon", label: "Sắp chiếu" },
  { value: "review", label: "Review" },
  { value: "announcement", label: "Thông báo" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Nháp" },
  { value: "published", label: "Đã xuất bản" },
  { value: "hidden", label: "Ẩn" },
];

const EMPTY_FORM = {
  title: "",
  slug: "",
  thumbnail: "",
  thumbnailFile: null,
  thumbnailPreview: "",
  short_description: "",
  content: "",
  category: "movie_news",
  status: "draft",
  published_at: "",
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN");
};

const getCategoryLabel = (value) =>
  CATEGORY_OPTIONS.find((item) => item.value === value)?.label || value;

const getStatusMeta = (value) => {
  switch (value) {
    case "published":
      return { label: "Đã xuất bản", cls: "confirmed" };
    case "hidden":
      return { label: "Ẩn", cls: "cancelled" };
    default:
      return { label: "Nháp", cls: "pending" };
  }
};

function NewsModal({ open, form, setForm, onClose, onSubmit, saving, editingId }) {
  if (!open) return null;

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="nm-overlay" onClick={onClose}>
      <div className="nm-modal" onClick={(event) => event.stopPropagation()}>
        <div className="nm-modal-header">
          <h2>{editingId ? "Chỉnh sửa bài viết" : "Tạo bài viết mới"}</h2>
          <button className="nm-modal-close" onClick={onClose}>✕</button>
        </div>

        <form className="nm-modal-body" onSubmit={onSubmit}>
          <div className="nm-form-grid">
            <div className="nm-form-col">
              <div className="nm-field">
                <label>Tiêu đề *</label>
                <input
                  value={form.title}
                  onChange={(event) => setField("title", event.target.value)}
                  placeholder="Nhập tiêu đề bài viết"
                  required
                />
              </div>

              <div className="nm-field-row">
                <div className="nm-field">
                  <label>Slug</label>
                  <input
                    value={form.slug}
                    onChange={(event) => setField("slug", event.target.value)}
                    placeholder="De trong de tu sinh"
                  />
                </div>
                <div className="nm-field">
                  <label>Danh mục *</label>
                  <select
                    value={form.category}
                    onChange={(event) => setField("category", event.target.value)}
                  >
                    {CATEGORY_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="nm-field">
                <label>Mô tả ngắn</label>
                <textarea
                  rows={4}
                  value={form.short_description}
                  onChange={(event) => setField("short_description", event.target.value)}
                  placeholder="Tóm tắt ngắn nội dung bài viết"
                />
              </div>

              <div className="nm-field">
                <label>Nội dung *</label>
                <textarea
                  rows={12}
                  value={form.content}
                  onChange={(event) => setField("content", event.target.value)}
                  placeholder="Nhập nội dung chi tiết bài viết"
                  required
                />
              </div>
            </div>

            <div className="nm-form-col">
              <div className="nm-field">
                <label>Thumbnail URL</label>
                <input
                  value={form.thumbnail}
                  onChange={(event) => setField("thumbnail", event.target.value)}
                  placeholder="https://... hoặc giữ trống nếu upload file"
                />
              </div>

              <div className="nm-field">
                <label>Upload thumbnail</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    setField("thumbnailFile", file);
                    setField(
                      "thumbnailPreview",
                      file ? URL.createObjectURL(file) : form.thumbnail ? toAbsoluteAssetUrl(form.thumbnail) : "",
                    );
                  }}
                />
              </div>

              <div className="nm-field-row">
                <div className="nm-field">
                  <label>Trạng thái *</label>
                  <select
                    value={form.status}
                    onChange={(event) => setField("status", event.target.value)}
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="nm-field">
                  <label>Ngày xuất bản</label>
                  <input
                    type="datetime-local"
                    value={form.published_at}
                    onChange={(event) => setField("published_at", event.target.value)}
                  />
                </div>
              </div>

              <div className="nm-preview-card">
                <div className="nm-preview-thumb">
                  {form.thumbnailPreview || form.thumbnail ? (
                    <img
                      src={form.thumbnailPreview || toAbsoluteAssetUrl(form.thumbnail)}
                      alt="Thumbnail preview"
                    />
                  ) : (
                    <span>Chưa có thumbnail</span>
                  )}
                </div>
                <div className="nm-preview-body">
                  <span className="nm-preview-category">{getCategoryLabel(form.category)}</span>
                  <strong>{form.title || "Tiêu đề bài viết"}</strong>
                  <p>{form.short_description || "Mô tả ngắn sẽ hiển thị ở đây."}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="nm-modal-footer">
            <button className="nm-btn nm-btn-primary" type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo bài viết"}
            </button>
            <button className="nm-btn nm-btn-secondary" type="button" onClick={onClose}>
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewsManagement() {
  const [newsList, setNewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const buildNewsFormData = () => {
    const formData = new FormData();
    formData.append("title", form.title || "");
    formData.append("slug", form.slug || "");
    formData.append("thumbnail", form.thumbnail || "");
    formData.append("short_description", form.short_description || "");
    formData.append("content", form.content || "");
    formData.append("category", form.category || "movie_news");
    formData.append("status", form.status || "draft");
    formData.append("published_at", form.published_at || "");

    if (form.thumbnailFile) {
      formData.append("thumbnailFile", form.thumbnailFile);
    }

    return formData;
  };

  const loadNews = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminNewsService.getAll();
      setNewsList(Array.isArray(data?.news) ? data.news : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể tải danh sách tin tức.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const filteredNews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return newsList.filter((item) => {
      const matchesSearch =
        !query ||
        item.title?.toLowerCase().includes(query) ||
        item.slug?.toLowerCase().includes(query) ||
        item.author_name?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "all" || item.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, newsList, search, statusFilter]);

  const stats = useMemo(
    () => [
      { label: "Tổng bài viết", value: newsList.length, color: "#7c61ff" },
      {
        label: "Đã xuất bản",
        value: newsList.filter((item) => item.status === "published").length,
        color: "#4ade80",
      },
      {
        label: "Bản nháp",
        value: newsList.filter((item) => item.status === "draft").length,
        color: "#f59e0b",
      },
      {
        label: "Lượt xem",
        value: newsList.reduce((sum, item) => sum + Number(item.view_count || 0), 0),
        color: "#5bcad4",
      },
    ],
    [newsList],
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.news_id);
    setForm({
      title: item.title || "",
      slug: item.slug || "",
      thumbnail: item.thumbnail || "",
      thumbnailFile: null,
      thumbnailPreview: item.thumbnail ? toAbsoluteAssetUrl(item.thumbnail) : "",
      short_description: item.short_description || "",
      content: item.content || "",
      category: item.category || "movie_news",
      status: item.status || "draft",
      published_at: item.published_at
        ? new Date(item.published_at).toISOString().slice(0, 16)
        : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingId) {
        await adminNewsService.update(editingId, buildNewsFormData());
        setMessage("Đã cập nhật bài viết.");
      } else {
        await adminNewsService.create(buildNewsFormData());
        setMessage("Đã tạo bài viết mới.");
      }

      closeModal();
      await loadNews();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể lưu bài viết.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (newsId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này?")) return;

    setError("");
    setMessage("");

    try {
      await adminNewsService.delete(newsId);
      setNewsList((prev) => prev.filter((item) => item.news_id !== newsId));
      setMessage("Đã xóa bài viết.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể xóa bài viết.");
    }
  };

  return (
    <div className="admin-news-page">
      <div className="nm-page-header">
        <div>
          <h2>Quản lý tin tức</h2>
          <p>Tạo, chỉnh sửa và xuất bản tin tức cho hệ thống Lunexa từ dữ liệu database.</p>
        </div>
        <button className="nm-btn nm-btn-primary nm-btn-lg" onClick={openCreate}>
          + Thêm bài viết
        </button>
      </div>

      <div className="nm-stats-row">
        {stats.map((item) => (
          <div className="nm-stat-pill" key={item.label}>
            <span>{item.label}</span>
            <strong style={{ color: item.color }}>{item.value}</strong>
          </div>
        ))}
      </div>

      {(message || error) && (
        <div
          className="report-card"
          style={{
            borderColor: error ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.2)",
            color: error ? "#fecaca" : "#bbf7d0",
          }}
        >
          <h3>{error ? "Có lỗi xảy ra" : "Thành công"}</h3>
          <p>{error || message}</p>
        </div>
      )}

      <div className="nm-toolbar">
        <input
          className="nm-search"
          placeholder="Tìm theo tiêu đề, slug, tác giả..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="nm-select"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="all">Tất cả danh mục</option>
          {CATEGORY_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          className="nm-select"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          {STATUS_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Bài viết</th>
              <th>Danh mục</th>
              <th>Tác giả</th>
              <th>Lượt xem</th>
              <th>Trạng thái</th>
              <th>Xuất bản</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32 }}>
                  Đang tải dữ liệu tin tức...
                </td>
              </tr>
            ) : filteredNews.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32 }}>
                  Chưa có bài viết nào khớp bộ lọc hiện tại.
                </td>
              </tr>
            ) : (
              filteredNews.map((item) => {
                const status = getStatusMeta(item.status);
                return (
                  <tr key={item.news_id}>
                    <td>
                      <div className="nm-news-cell">
                        <div className="nm-thumb">
                          {item.thumbnail ? (
                            <img src={toAbsoluteAssetUrl(item.thumbnail)} alt={item.title} />
                          ) : (
                            <span>📰</span>
                          )}
                        </div>
                        <div className="nm-news-meta">
                          <strong>{item.title}</strong>
                          <span>{item.slug}</span>
                          <p>{item.short_description || "Chưa có mô tả ngắn."}</p>
                        </div>
                      </div>
                    </td>
                    <td>{getCategoryLabel(item.category)}</td>
                    <td>
                      <div className="nm-author-cell">
                        <strong>{item.author_name || "Chưa rõ"}</strong>
                        <span>{item.employee_code || "—"}</span>
                      </div>
                    </td>
                    <td>{Number(item.view_count || 0).toLocaleString("vi-VN")}</td>
                    <td>
                      <span className={`status-pill ${status.cls}`}>{status.label}</span>
                    </td>
                    <td>{formatDateTime(item.published_at)}</td>
                    <td>
                      <div className="nm-actions">
                        <button className="nm-btn nm-btn-edit" onClick={() => openEdit(item)}>
                          Sửa
                        </button>
                        <button className="nm-btn nm-btn-delete" onClick={() => handleDelete(item.news_id)}>
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="nm-footer-count">
        Hiển thị <strong>{filteredNews.length}</strong> / {newsList.length} bài viết
      </div>

      <NewsModal
        open={modalOpen}
        form={form}
        setForm={setForm}
        onClose={closeModal}
        onSubmit={handleSubmit}
        saving={saving}
        editingId={editingId}
      />
    </div>
  );
}
