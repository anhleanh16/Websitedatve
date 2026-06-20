import { useState, useEffect } from "react";
import { adminMovieService, adminCategoryService } from '../../services/adminApi.js';
import './movies.css';

// ─── Helpers chuyển đổi dữ liệu camelCase ↔ snake_case ───────────────────────────────
const snakeToCamelMovie = (obj) => {
  return {
    id: obj.movie_id,
    title: obj.title,
    description: obj.description,
    duration: obj.duration,
    ageLimit: obj.age_limit,
    director: obj.director,
    actors: obj.actors,
    trailer: obj.trailer,
    poster: obj.poster,
    posters: obj.posters || [],
    releaseDate: obj.release_date,
    status: obj.status,
    language: obj.language,
    country: obj.country,
    categories: obj.categories?.map(cat => ({ id: cat.category_id, name: cat.category_name })) || [],
    isDeleted: !!obj.is_deleted,
    isHidden: !!obj.is_hidden,
    rating: null,
  };
};

const snakeToCamelCategory = (obj) => {
  return {
    id: obj.category_id,
    name: obj.category_name,
    movieCount: obj.movieCount,
  };
};

const camelToSnakeCategory = (obj) => {
  return {
    category_name: obj.name,
  };
};

// ─── Status Options ─────────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: "now_showing", label: "Đang chiếu",  cls: "mv-status-showing"  },
  { value: "coming_soon", label: "Sắp chiếu",   cls: "mv-status-coming"   },
  { value: "ended",       label: "Đã kết thúc", cls: "mv-status-ended"    },
];
const statusInfo = (v) => STATUS_OPTS.find((s) => s.value === v) || STATUS_OPTS[0];

const EMPTY_MOVIE = {
  title: "", description: "", duration: "", ageLimit: 0,
  director: "", actors: "", trailer: "", poster: "",
  posters: [], releaseDate: "", status: "coming_soon",
  language: "Tiếng Việt", country: "Việt Nam",
  categories: [], rating: null,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 1. Danh sách phim */
function MovieList({ movies, categories, onView, onEdit, onDelete, onRestore, onToggleHide, onPermanentDelete, isTrashMode }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCat, setFilterCat] = useState("all");

  const filtered = movies.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = m.title?.toLowerCase().includes(q) || m.director?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    const matchCat = filterCat === "all" || m.categories.some((cat) => cat.id === Number(filterCat));
    return matchSearch && matchStatus && matchCat;
  });

  return (
    <div className="mv-section">
      {/* Toolbar */}
      <div className="mv-toolbar">
        <input
          className="mv-search"
          placeholder="Tìm tên phim, đạo diễn…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="mv-select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        {!isTrashMode && (
          <select className="mv-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
            <option value="all">Tất cả danh mục</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        {!isTrashMode && <button className="mv-btn mv-btn-add" onClick={() => onEdit(null)}>+ Thêm phim</button>}
      </div>

      {/* Grid */}
      <div className="mv-grid">
        {filtered.length === 0 ? (
          <div className="mv-empty">Không tìm thấy phim nào.</div>
        ) : (
          filtered.map((m) => {
            const st = statusInfo(m.status);
            const cats = m.categories.map((cat) => cat.name).filter(Boolean);
            return (
              <div className="mv-card" key={m.id}>
                {/* Poster */}
                <div className="mv-poster">
                  {m.poster ? (
                    <img src={m.poster} alt={m.title} />
                  ) : (
                    <div className="mv-poster-placeholder">🎬</div>
                  )}
                  <span className={`mv-status-badge ${st.cls}`}>{st.label}</span>
                  {m.isHidden && <span className="mv-status-badge mv-status-hidden">🔒 Ẩn</span>}
                </div>
                {/* Info */}
                <div className="mv-card-body">
                  <h3 className="mv-card-title">{m.title}</h3>
                  <div className="mv-card-meta">
                    <span>🎬 {m.director}</span>
                    <span>⏱ {m.duration} phút</span>
                  </div>
                  {!isTrashMode && (
                    <div className="mv-cat-list">
                      {cats.map((c) => <span className="mv-cat-tag" key={c}>{c}</span>)}
                    </div>
                  )}
                  <div className="mv-card-actions">
                    {!isTrashMode && (
                      <>
                        <button className="mv-btn mv-btn-view" onClick={() => onView(m)}>Xem</button>
                        <button className="mv-btn mv-btn-edit" onClick={() => onEdit(m)}>Sửa</button>
                        <button className={`mv-btn ${m.isHidden ? "mv-btn-show" : "mv-btn-hide"}`} onClick={() => onToggleHide(m)}>
                          {m.isHidden ? "🔓 Hiện" : "🔒 Ẩn"}
                        </button>
                        <button className="mv-btn mv-btn-delete" onClick={() => onDelete(m)}>🗑️</button>
                      </>
                    )}
                    {isTrashMode && (
                      <>
                        <button className="mv-btn mv-btn-restore" onClick={() => onRestore(m)}>🔄 Khôi phục</button>
                        <button className="mv-btn mv-btn-permanent-delete" onClick={() => onPermanentDelete(m)}>🗑️ Xóa vĩnh viễn</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mv-footer-count">Hiển thị <strong>{filtered.length}</strong> / {movies.length} phim</div>
    </div>
  );
}

/** 2. Xem phim (Chi tiết) */
function MovieDetail({ movie, categories, onClose, onEdit }) {
  if (!movie) return null;
  const st = statusInfo(movie.status);
  const cats = (movie.categories || []).map((cat) => cat.name).filter(Boolean);

  return (
    <div className="mv-modal-overlay" onClick={onClose}>
      <div className="mv-modal mv-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mv-modal-header">
          <h2>Chi tiết phim</h2>
          <button className="mv-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="mv-modal-body">
          <div className="mv-detail-layout">
            {/* Poster col */}
            <div className="mv-detail-poster-col">
              <div className="mv-detail-poster">
                {movie.poster ? (
                  <img src={movie.poster} alt={movie.title} />
                ) : (
                  <div className="mv-poster-placeholder mv-poster-lg">🎬</div>
                )}
              </div>
              <span className={`mv-status-badge ${st.cls}`} style={{ alignSelf: "center", marginTop: 12 }}>{st.label}</span>
            </div>

            {/* Info col */}
            <div className="mv-detail-info-col">
              <h2 className="mv-detail-title">{movie.title}</h2>
              <div className="mv-cat-list" style={{ marginBottom: 14 }}>
                {cats.map((c) => <span className="mv-cat-tag" key={c}>{c}</span>)}
              </div>

              <div className="mv-detail-grid">
                <div className="mv-detail-item"><span>Đạo diễn</span><strong>{movie.director || "—"}</strong></div>
                <div className="mv-detail-item"><span>Diễn viên</span><strong>{movie.actors || "—"}</strong></div>
                <div className="mv-detail-item"><span>Thời lượng</span><strong>{movie.duration} phút</strong></div>
                <div className="mv-detail-item"><span>Giới hạn tuổi</span><strong>{movie.ageLimit === 0 ? "Mọi lứa tuổi" : `${movie.ageLimit}+`}</strong></div>
                <div className="mv-detail-item"><span>Ngôn ngữ</span><strong>{movie.language}</strong></div>
                <div className="mv-detail-item"><span>Quốc gia</span><strong>{movie.country}</strong></div>
                <div className="mv-detail-item"><span>Khởi chiếu</span><strong>{movie.releaseDate}</strong></div>
              </div>

              <div className="mv-detail-desc">
                <span>Mô tả</span>
                <p>{movie.description || "Chưa có mô tả."}</p>
              </div>

              {movie.trailer && (
                <a className="mv-trailer-btn" href={movie.trailer} target="_blank" rel="noreferrer">
                  ▶ Xem trailer
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="mv-modal-footer">
          <button className="mv-btn mv-btn-edit mv-btn-lg" onClick={() => onEdit(movie)}>Chỉnh sửa phim</button>
          <button className="mv-btn mv-btn-secondary mv-btn-lg" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

/** 3. Thêm / Chỉnh sửa phim */
function MovieForm({ movie, categories, onClose, onSave }) {
  const isEdit = !!movie;
  const [form, setForm] = useState(movie ? { ...movie } : { ...EMPTY_MOVIE });
  const [errors, setErrors] = useState({});
  const [newPosterFiles, setNewPosterFiles] = useState([]);
  const [trailerFile, setTrailerFile] = useState(null);
  const [allPosters, setAllPosters] = useState([]);
  const [posterDrag, setPosterDrag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Tính toán giới hạn ngày (min: hôm nay +10, max: hôm nay +50)
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 10);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 50);
  
  const formatDate = (date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  
  const minDateStr = formatDate(minDate);
  const maxDateStr = formatDate(maxDate);

  useEffect(() => {
    if (movie) {
      // Hiển thị tất cả poster hiện tại (chính + phụ)
      const posters = [movie.poster, ...(movie.posters || [])].filter(Boolean);
      setAllPosters(posters.map(url => ({ url, isNew: false })));
      // Chuyển danh mục từ array object thành array id để dùng trong form
      setForm(prev => ({
        ...prev,
        categories: movie.categories?.map(cat => cat.id) || []
      }));
    }
  }, [movie]);

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  // Xử lý chọn nhiều poster mới
  const handlePosterFiles = (files) => {
    const newFiles = Array.from(files).filter(file => file.type.startsWith("image/"));
    const newPreviews = newFiles.map(file => ({
      url: URL.createObjectURL(file),
      isNew: true,
      file
    }));
    setNewPosterFiles(prev => [...prev, ...newFiles]);
    setAllPosters(prev => [...prev, ...newPreviews]);
  };

  const handlePosterDrop = (e) => {
    e.preventDefault();
    setPosterDrag(false);
    handlePosterFiles(e.dataTransfer.files);
  };

  // Xử lý chọn trailer
  const handleTrailerFile = (file) => {
    if (!file || !file.type.startsWith("video/")) return;
    setTrailerFile(file);
  };

  // Xóa poster (cả cũ và mới)
  const removePoster = (index) => {
    const removed = allPosters[index];
    if (removed.isNew) {
      // Xóa khỏi file mới
      const fileIndex = newPosterFiles.findIndex(f => 
        URL.createObjectURL(f) === removed.url
      );
      if (fileIndex !== -1) {
        setNewPosterFiles(prev => prev.filter((_, i) => i !== fileIndex));
      }
    }
    // Cập nhật danh sách tất cả poster
    setAllPosters(prev => prev.filter((_, i) => i !== index));
  };

  // Xóa trailer
  const removeTrailer = () => {
    setTrailerFile(null);
  };

  const toggleCat = (id) => {
    setForm((f) => ({
      ...f,
      categories: f.categories.includes(id)
        ? f.categories.filter((c) => c !== id)
        : [...f.categories, id],
    }));
  };

  const validate = () => {
    const e = {};
    if (!form.title?.trim()) e.title = "Vui lòng nhập tên phim.";
    if (!form.director?.trim()) e.director = "Vui lòng nhập đạo diễn.";
    if (!form.duration || form.duration <= 0) e.duration = "Thời lượng phải > 0.";
    if (!form.releaseDate) e.releaseDate = "Vui lòng chọn ngày khởi chiếu.";
    if (allPosters.length < 6) e.posters = "Phải có ít nhất 6 poster.";
    if (allPosters.length > 12) e.posters = "Tối đa 12 poster.";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setIsSaving(true);
    try {
      // Tạo FormData
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('duration', form.duration);
      formData.append('age_limit', form.ageLimit);
      formData.append('director', form.director);
      formData.append('actors', form.actors);
      formData.append('release_date', form.releaseDate);
      formData.append('status', form.status);
      formData.append('language', form.language);
      formData.append('country', form.country);
      
      // Gửi danh mục
      if (form.categories && form.categories.length > 0) {
        form.categories.forEach(categoryId => {
          formData.append('categories', categoryId);
        });
      }
      
      // Phân loại poster cũ còn lại
      const oldPostersRemaining = allPosters.filter(p => !p.isNew).map(p => p.url);
      const posterMain = oldPostersRemaining[0] || '';
      const postersExtra = oldPostersRemaining.slice(1);
      
      // Gửi danh sách poster cũ còn lại
      formData.append('existing_main_poster', posterMain);
      formData.append('existing_posters', JSON.stringify(postersExtra));
      
      // Thêm các poster mới
      newPosterFiles.forEach(file => {
        formData.append('posters', file);
      });
      
      // Thêm trailer mới nếu có
      if (trailerFile) {
        formData.append('trailer', trailerFile);
      }

      await onSave({ ...form, id: movie?.id, formData });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mv-modal-overlay" onClick={onClose}>
      <div className="mv-modal mv-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="mv-modal-header">
          <h2>{isEdit ? "Chỉnh sửa phim" : "Thêm phim mới"}</h2>
          <button className="mv-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="mv-modal-body">
          <div className="mv-form-grid">
            {/* Cột trái */}
            <div className="mv-form-col">
              <div className="mv-field">
                <label>Tên phim *</label>
                <input className={errors.title ? "error" : ""} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Nhập tên phim…" />
                {errors.title && <span className="mv-error">{errors.title}</span>}
              </div>

              <div className="mv-field">
                <label>Mô tả</label>
                <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Nội dung phim…" />
              </div>

              <div className="mv-field-row">
                <div className="mv-field">
                  <label>Thời lượng (phút) *</label>
                  <input type="number" min={1} className={errors.duration ? "error" : ""} value={form.duration} onChange={(e) => set("duration", Number(e.target.value))} />
                  {errors.duration && <span className="mv-error">{errors.duration}</span>}
                </div>
                <div className="mv-field">
                  <label>Giới hạn tuổi</label>
                  <select value={form.ageLimit} onChange={(e) => set("ageLimit", Number(e.target.value))}>
                    <option value={0}>Mọi lứa tuổi</option>
                    <option value={13}>13+</option>
                    <option value={16}>16+</option>
                    <option value={18}>18+</option>
                  </select>
                </div>
              </div>

              <div className="mv-field">
                <label>Đạo diễn *</label>
                <input className={errors.director ? "error" : ""} value={form.director} onChange={(e) => set("director", e.target.value)} placeholder="Tên đạo diễn…" />
                {errors.director && <span className="mv-error">{errors.director}</span>}
              </div>

              <div className="mv-field">
                <label>Diễn viên</label>
                <input value={form.actors} onChange={(e) => set("actors", e.target.value)} placeholder="Tên diễn viên, phân cách bằng dấu phẩy…" />
              </div>

              <div className="mv-field-row">
                <div className="mv-field">
                  <label>Ngôn ngữ</label>
                  <input value={form.language} onChange={(e) => set("language", e.target.value)} />
                </div>
                <div className="mv-field">
                  <label>Quốc gia</label>
                  <input value={form.country} onChange={(e) => set("country", e.target.value)} />
                </div>
              </div>
            </div>

            {/* Cột phải */}
            <div className="mv-form-col">
              <div className="mv-field-row">
                <div className="mv-field">
                  <label>Ngày khởi chiếu *</label>
                  <input type="date" className={errors.releaseDate ? "error" : ""} value={form.releaseDate} onChange={(e) => set("releaseDate", e.target.value)} min={minDateStr} max={maxDateStr} />
                  {errors.releaseDate && <span className="mv-error">{errors.releaseDate}</span>}
                </div>
                <div className="mv-field">
                  <label>Trạng thái</label>
                  <select value={form.status} onChange={(e) => set("status", e.target.value)}>
                    {STATUS_OPTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="mv-field">
                <label>Trailer phim</label>
                <div
                  className="img-upload-zone trailer-upload-zone"
                  onClick={() => document.getElementById("trailer-file-input").click()}
                >
                  {trailerFile ? (
                    <>
                      <div className="img-upload-placeholder">
                        <span className="img-upload-icon">🎬</span>
                        <span>{trailerFile.name}</span>
                      </div>
                      <button
                        className="img-upload-remove"
                        onClick={(e) => { e.stopPropagation(); removeTrailer(); }}
                      >✕</button>
                    </>
                  ) : movie?.trailer ? (
                    <>
                      <div className="img-upload-placeholder">
                        <span className="img-upload-icon">🎬</span>
                        <span>Trailer đã chọn</span>
                      </div>
                      <button
                        className="img-upload-remove"
                        onClick={(e) => { e.stopPropagation(); removeTrailer(); }}
                      >✕</button>
                    </>
                  ) : (
                    <div className="img-upload-placeholder">
                      <span className="img-upload-icon">🎬</span>
                      <span>Chọn trailer từ máy</span>
                      <span className="img-upload-hint">MP4, WEBM, OGG – tối đa 100MB</span>
                    </div>
                  )}
                </div>
                <input
                  id="trailer-file-input"
                  type="file"
                  accept="video/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleTrailerFile(e.target.files?.[0])}
                />
              </div>

              <div className="mv-field">
                <label>Poster phim (6-12 ảnh) *</label>
                {errors.posters && <span className="mv-error">{errors.posters}</span>}
                <div
                  className={`img-upload-zone${posterDrag ? " drag-over" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setPosterDrag(true); }}
                  onDragLeave={() => setPosterDrag(false)}
                  onDrop={handlePosterDrop}
                  onClick={() => document.getElementById("poster-file-input").click()}
                >
                  <div className="img-upload-placeholder">
                    <span className="img-upload-icon">🖼</span>
                    <span>Kéo thả hoặc <strong>chọn ảnh</strong> từ máy</span>
                    <span className="img-upload-hint">JPG, PNG, WEBP – tối đa 5MB mỗi ảnh</span>
                  </div>
                </div>
                <input
                  id="poster-file-input"
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => handlePosterFiles(e.target.files)}
                />
                
                {/* Hiển thị tất cả poster (cũ + mới) */}
                {allPosters.length > 0 && (
                  <div className="mv-posters-grid">
                    {allPosters.map((poster, index) => (
                      <div key={index} className="mv-poster-item">
                        <img src={poster.url} alt={`poster-${index}`} />
                        <button
                          className="img-upload-remove"
                          onClick={() => removePoster(index)}
                        >✕</button>
                        {index === 0 && (
                          <span className="mv-poster-main-badge">Chính</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mv-field">
                <label>Danh mục</label>
                <div className="mv-cat-check-grid">
                  {categories.map((c) => (
                    <label key={c.id} className={`mv-cat-check${form.categories.includes(c.id) ? " checked" : ""}`}>
                      <input
                        type="checkbox"
                        checked={form.categories.includes(c.id)}
                        onChange={() => toggleCat(c.id)}
                      />
                      {c.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mv-modal-footer">
          <button className="mv-btn mv-btn-add mv-btn-lg" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm phim"}
          </button>
          <button className="mv-btn mv-btn-secondary mv-btn-lg" onClick={onClose} disabled={isSaving}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/** 4. Danh mục phim */
function CategoryManager({ categories, onAdd, onEdit, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  const openAdd = () => { setEditCat(null); setName(""); setNameError(""); setShowForm(true); };
  const openEdit = (c) => { setEditCat(c); setName(c.name); setNameError(""); setShowForm(true); };

  const handleSave = () => {
    if (!name.trim()) { setNameError("Vui lòng nhập tên danh mục."); return; }
    if (editCat) { onEdit({ ...editCat, name: name.trim() }); }
    else         { onAdd({ id: Date.now(), name: name.trim(), movieCount: 0 }); }
    setShowForm(false);
  };

  return (
    <div className="mv-section">
      <div className="mv-toolbar">
        <h3 style={{ margin: 0, color: "#fff", fontSize: 18 }}>Quản lý danh mục phim</h3>
        <button className="mv-btn mv-btn-add" onClick={openAdd}>+ Thêm danh mục</button>
      </div>

      <div className="mv-cat-manager-grid">
        {categories.map((c) => (
          <div className="mv-cat-manager-card" key={c.id}>
            <div className="mv-cat-manager-info">
              <strong>{c.name}</strong>
              <span>{c.movieCount} phim</span>
            </div>
            <div className="mv-cat-manager-actions">
              <button className="mv-btn mv-btn-edit" onClick={() => openEdit(c)}>Sửa</button>
              <button className="mv-btn mv-btn-delete" onClick={() => onDelete(c)}>Xóa</button>
            </div>
          </div>
        ))}
      </div>

      {/* Inline form */}
      {showForm && (
        <div className="mv-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="mv-modal mv-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="mv-modal-header">
              <h2>{editCat ? "Sửa danh mục" : "Thêm danh mục"}</h2>
              <button className="mv-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="mv-modal-body">
              <div className="mv-field">
                <label>Tên danh mục *</label>
                <input
                  className={nameError ? "error" : ""}
                  value={name}
                  onChange={(e) => { setName(e.target.value); setNameError(""); }}
                  placeholder="Nhập tên danh mục…"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
                {nameError && <span className="mv-error">{nameError}</span>}
              </div>
            </div>
            <div className="mv-modal-footer">
              <button className="mv-btn mv-btn-add mv-btn-lg" onClick={handleSave}>
                {editCat ? "Lưu" : "Thêm"}
              </button>
              <button className="mv-btn mv-btn-secondary mv-btn-lg" onClick={() => setShowForm(false)}>Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Confirm xóa */
function DeleteConfirm({ target, type, isPermanent, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);
  if (!target) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm(target);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mv-modal-overlay" onClick={onClose}>
      <div className="mv-modal mv-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mv-modal-header">
          <h2>{isPermanent ? "Xác nhận xóa vĩnh viễn" : "Xác nhận xóa"}</h2>
          <button className="mv-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="mv-modal-body">
          <div className="mv-delete-warn">
            ⚠️ Bạn có chắc muốn {isPermanent ? "xóa vĩnh viễn" : type === "movie" ? "di chuyển vào thùng rác" : "xóa"} {type === "movie" ? "phim" : "danh mục"}
            &nbsp;<strong>"{target.title || target.name}"</strong>?
            <br />
            {isPermanent ? "Hành động này không thể hoàn tác!" : type === "movie" ? "Bạn có thể khôi phục lại từ thùng rác." : ""}
          </div>
        </div>
        <div className="mv-modal-footer">
          <button className={`mv-btn ${isPermanent ? "mv-btn-delete" : "mv-btn-delete"} mv-btn-lg`} onClick={handleConfirm} disabled={isDeleting}>
            {isDeleting ? "Đang xóa..." : isPermanent ? "Xóa vĩnh viễn" : "Xóa"}
          </button>
          <button className="mv-btn mv-btn-secondary mv-btn-lg" onClick={onClose} disabled={isDeleting}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/** Toast */
function Toast({ message, type, onClose }) {
  if (!message) return null;
  return (
    <div className={`mv-toast mv-toast-${type}`}>
      {message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminMovies() {
  const [movies, setMovies] = useState([]);
  const [trashMovies, setTrashMovies] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeTab, setActiveTab] = useState("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [viewMovie, setViewMovie] = useState(null);
  const [editMovie, setEditMovie] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType, setDeleteType] = useState("movie");
  const [deleteIsPermanent, setDeleteIsPermanent] = useState(false);

  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch movies and categories
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [moviesData, trashData, categoriesData] = await Promise.all([
        adminMovieService.getAllMovies(false),
        adminMovieService.getAllMovies(true),
        adminCategoryService.getAllCategories()
      ]);
      setMovies((moviesData.movies || []).map(snakeToCamelMovie));
      setTrashMovies((trashData.movies || []).map(snakeToCamelMovie));
      setCategories((categoriesData.categories || []).map(snakeToCamelCategory));
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Không thể tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Stats
  const stats = [
    { label: "Tổng phim", value: movies.length, color: "#7c61ff" },
    { label: "Đang chiếu", value: movies.filter((m) => m.status === "now_showing").length, color: "#4ade80" },
    { label: "Sắp chiếu", value: movies.filter((m) => m.status === "coming_soon").length, color: "#fbbf24" },
    { label: "Thùng rác", value: trashMovies.length, color: "#ef4444" },
    { label: "Danh mục", value: categories.length, color: "#60a5fa" },
  ];

  const TABS = [
    { key: "list", label: "Danh sách phim" },
    { key: "trash", label: "Thùng rác" },
    { key: "category", label: "Danh mục phim" },
  ];

  // Handlers
  const handleView = (m) => {
    setViewMovie(m);
  };

  const handleEdit = (m) => {
    setViewMovie(null);
    setEditMovie(m);
  };

  const handleSaveMovie = async (data) => {
    try {
      if (data.id) {
        // Update existing
        await adminMovieService.updateMovie(data.id, data.formData);
        showToast(`Đã cập nhật phim "${data.title}".`);
      } else {
        // Create new
        await adminMovieService.createMovie(data.formData);
        showToast(`Đã thêm phim "${data.title}".`);
      }
      setEditMovie(undefined);
      // Refresh danh sách phim
      fetchData();
    } catch (err) {
      console.error("Error saving movie:", err);
      showToast(data.id ? "Không thể cập nhật phim." : "Không thể thêm phim.", "error");
    }
  };

  const handleDeleteMovie = (m) => { setDeleteTarget(m); setDeleteType("movie"); setDeleteIsPermanent(false); };
  const handlePermanentDeleteMovie = (m) => { setDeleteTarget(m); setDeleteType("movie"); setDeleteIsPermanent(true); };
  const handleDeleteCat = (c) => { setDeleteTarget(c); setDeleteType("category"); setDeleteIsPermanent(false); };

  const handleConfirmDelete = async (target) => {
    try {
      if (deleteType === "movie") {
        if (deleteIsPermanent) {
          await adminMovieService.permanentDeleteMovie(target.id);
          showToast(`Đã xóa vĩnh viễn phim "${target.title}".`, "success");
        } else {
          await adminMovieService.deleteMovie(target.id);
          showToast(`Đã di chuyển phim "${target.title}" vào thùng rác.`, "success");
        }
      } else {
        await adminCategoryService.deleteCategory(target.id);
        setCategories((prev) => prev.filter((c) => c.id !== target.id));
        showToast(`Đã xóa danh mục "${target.name}".`, "success");
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error("Error deleting:", err);
      showToast(deleteType === "movie" ? "Không thể xóa phim." : "Không thể xóa danh mục.", "error");
    }
  };

  const handleRestoreMovie = async (m) => {
    try {
      await adminMovieService.restoreMovie(m.id);
      showToast(`Đã khôi phục phim "${m.title}".`);
      fetchData();
    } catch (err) {
      console.error("Error restoring movie:", err);
      showToast("Không thể khôi phục phim.", "error");
    }
  };

  const handleToggleHideMovie = async (m) => {
    try {
      await adminMovieService.toggleHideMovie(m.id);
      showToast(`Đã ${m.isHidden ? "hiện" : "ẩn"} phim "${m.title}".`);
      fetchData();
    } catch (err) {
      console.error("Error toggling hide movie:", err);
      showToast("Không thể cập nhật trạng thái ẩn/hiện phim.", "error");
    }
  };

  const handleAddCat = async (c) => { 
    try {
      const result = await adminCategoryService.createCategory(camelToSnakeCategory(c));
      const newCategory = { ...c, id: result.categoryId, movieCount: 0 };
      setCategories((prev) => [...prev, newCategory]); 
      showToast(`Đã thêm danh mục "${c.name}".`); 
    } catch (err) {
      console.error("Error adding category:", err);
      showToast("Không thể thêm danh mục.", "error");
    }
  };
  const handleEditCat = async (c) => { 
    try {
      await adminCategoryService.updateCategory(c.id, camelToSnakeCategory(c));
      setCategories((prev) => prev.map((x) => (x.id === c.id ? c : x))); 
      showToast(`Đã cập nhật danh mục "${c.name}".`); 
    } catch (err) {
      console.error("Error updating category:", err);
      showToast("Không thể cập nhật danh mục.", "error");
    }
  };

  // Nếu loading, hiển thị spinner
  if (loading) {
    return (
      <div className="admin-movies-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div style={{ fontSize: 24, color: '#fff' }}>Đang tải...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-movies-page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', flexDirection: 'column' }}>
        <div style={{ fontSize: 24, color: '#ef4444' }}>{error}</div>
        <button className="mv-btn mv-btn-add" style={{ marginTop: 20 }} onClick={fetchData}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="admin-movies-page">
      <div className="mv-page-header">
        <h2>Quản lý phim</h2>
        <p>Quản lý danh sách phim, thông tin chi tiết, chỉnh sửa và danh mục</p>
      </div>

      {/* Stats */}
      <div className="mv-stats-row">
        {stats.map((s) => (
          <div className="mv-stat-pill" key={s.label}>
            <span>{s.label}</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mv-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`mv-tab${activeTab === t.key ? " active" : ""}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "list" && (
        <MovieList
          movies={movies}
          categories={categories}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDeleteMovie}
          onToggleHide={handleToggleHideMovie}
          isTrashMode={false}
        />
      )}
      {activeTab === "trash" && (
        <MovieList
          movies={trashMovies}
          categories={categories}
          onRestore={handleRestoreMovie}
          onPermanentDelete={handlePermanentDeleteMovie}
          isTrashMode={true}
        />
      )}
      {activeTab === "category" && (
        <CategoryManager
          categories={categories}
          onAdd={handleAddCat}
          onEdit={handleEditCat}
          onDelete={handleDeleteCat}
        />
      )}

      {/* Modals */}
      {viewMovie && (
        <MovieDetail
          movie={viewMovie}
          categories={categories}
          onClose={() => setViewMovie(null)}
          onEdit={handleEdit}
        />
      )}
      {editMovie !== undefined && (
        <MovieForm
          movie={editMovie}
          categories={categories}
          onClose={() => setEditMovie(undefined)}
          onSave={handleSaveMovie}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          target={deleteTarget}
          type={deleteType}
          isPermanent={deleteIsPermanent}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}
