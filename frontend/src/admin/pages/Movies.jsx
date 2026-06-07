import { useState } from "react";

// ─── Sample Data ──────────────────────────────────────────────────────────────
const SAMPLE_CATEGORIES = [
  { id: 1, name: "Hành động",           movieCount: 8  },
  { id: 2, name: "Tình cảm",            movieCount: 5  },
  { id: 3, name: "Kinh dị",             movieCount: 4  },
  { id: 4, name: "Hài hước",            movieCount: 6  },
  { id: 5, name: "Khoa học viễn tưởng", movieCount: 3  },
  { id: 6, name: "Hoạt hình",           movieCount: 7  },
  { id: 7, name: "Tâm lý",              movieCount: 4  },
  { id: 8, name: "Phiêu lưu",           movieCount: 5  },
];

const SAMPLE_MOVIES = [
  {
    id: 1,
    title: "Đêm Thiên Cầu",
    description: "Một hành trình khoa học viễn tưởng đưa con người đến ranh giới của vũ trụ. Phi hành đoàn phải đối mặt với những bí ẩn chưa từng được khám phá trong không gian sâu thẳm.",
    duration: 128,
    ageLimit: 13,
    director: "Nguyễn Minh Tuấn",
    actors: "Trần Nghĩa, Lê Thu Hà, Phạm Đức Anh",
    trailerUrl: "",
    poster: "",
    releaseDate: "2026-06-01",
    status: "now_showing",
    language: "Tiếng Việt",
    country: "Việt Nam",
    categories: [1, 5],
    rating: 8.2,
  },
  {
    id: 2,
    title: "Tiếng Vọng Im Lặng",
    description: "Câu chuyện tâm lý sâu sắc về một người phụ nữ cố gắng tìm lại chính mình sau biến cố cuộc đời. Bộ phim khai thác nội tâm con người một cách tinh tế và chân thực.",
    duration: 105,
    ageLimit: 16,
    director: "Lê Hoàng",
    actors: "Ngô Thanh Vân, Trương Thế Vinh",
    trailerUrl: "",
    poster: "",
    releaseDate: "2026-05-20",
    status: "now_showing",
    language: "Tiếng Việt",
    country: "Việt Nam",
    categories: [2, 7],
    rating: 7.8,
  },
  {
    id: 3,
    title: "Hỗn Loạn Tokyo",
    description: "Bộ phim hành động bùng nổ lấy bối cảnh thành phố Tokyo trong cơn hỗn loạn chưa từng có. Những pha hành động mãn nhãn và cốt truyện gay cấn đến phút cuối.",
    duration: 135,
    ageLimit: 18,
    director: "Yamada Kenji",
    actors: "Tanaka Hiroshi, Suzuki Yuki, Park Ji-ho",
    trailerUrl: "",
    poster: "",
    releaseDate: "2026-06-10",
    status: "now_showing",
    language: "Tiếng Nhật",
    country: "Nhật Bản",
    categories: [1, 8],
    rating: 8.5,
  },
  {
    id: 4,
    title: "Ánh Sao Cuối Trời",
    description: "Câu chuyện tình yêu lãng mạn giữa hai tâm hồn cô đơn tìm thấy nhau trong đêm đông lạnh giá. Bộ phim sẽ khiến bạn tin tưởng vào tình yêu đích thực.",
    duration: 110,
    ageLimit: 0,
    director: "Kim Soo-yeon",
    actors: "Lee Min-ho, Park Shin-hye",
    trailerUrl: "",
    poster: "",
    releaseDate: "2026-07-01",
    status: "coming_soon",
    language: "Tiếng Hàn",
    country: "Hàn Quốc",
    categories: [2],
    rating: null,
  },
  {
    id: 5,
    title: "Vương Quốc Bóng Tối",
    description: "Phim kinh dị tâm lý đưa khán giả vào thế giới bí ẩn của một vương quốc cổ đại bị nguyền rủa. Hành trình tìm kiếm sự thật ẩn chứa vô vàn hiểm nguy.",
    duration: 118,
    ageLimit: 18,
    director: "James Wong",
    actors: "Marcus Chen, Sarah Lin",
    trailerUrl: "",
    poster: "",
    releaseDate: "2026-04-15",
    status: "ended",
    language: "Tiếng Anh",
    country: "Mỹ",
    categories: [3],
    rating: 7.1,
  },
  {
    id: 6,
    title: "Doraemon: Đại Chiến Vũ Trụ",
    description: "Nobita và những người bạn bước vào cuộc phiêu lưu vũ trụ kỳ thú nhất từ trước đến nay. Doraemon sẽ dùng tất cả bảo bối để giải cứu các hành tinh khỏi nguy cơ diệt vong.",
    duration: 95,
    ageLimit: 0,
    director: "Fujiko F. Fujio",
    actors: "Mizuta Wasabi, Ōhara Megumi",
    trailerUrl: "",
    poster: "",
    releaseDate: "2026-05-03",
    status: "now_showing",
    language: "Tiếng Nhật",
    country: "Nhật Bản",
    categories: [6, 8],
    rating: 8.9,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_OPTS = [
  { value: "now_showing", label: "Đang chiếu",  cls: "mv-status-showing"  },
  { value: "coming_soon", label: "Sắp chiếu",   cls: "mv-status-coming"   },
  { value: "ended",       label: "Đã kết thúc", cls: "mv-status-ended"    },
];
const statusInfo = (v) => STATUS_OPTS.find((s) => s.value === v) || STATUS_OPTS[0];

const EMPTY_MOVIE = {
  title: "", description: "", duration: "", ageLimit: 0,
  director: "", actors: "", trailerUrl: "", poster: "",
  releaseDate: "", status: "coming_soon", language: "Tiếng Việt",
  country: "Việt Nam", categories: [], rating: null,
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 1. Danh sách phim */
function MovieList({ movies, categories, onView, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCat, setFilterCat] = useState("all");

  const filtered = movies.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = m.title.toLowerCase().includes(q) || m.director.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || m.status === filterStatus;
    const matchCat = filterCat === "all" || m.categories.includes(Number(filterCat));
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
        <select className="mv-select" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="all">Tất cả danh mục</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button className="mv-btn mv-btn-add" onClick={() => onEdit(null)}>+ Thêm phim</button>
      </div>

      {/* Grid */}
      <div className="mv-grid">
        {filtered.length === 0 ? (
          <div className="mv-empty">Không tìm thấy phim nào.</div>
        ) : (
          filtered.map((m) => {
            const st = statusInfo(m.status);
            const cats = m.categories.map((cid) => categories.find((c) => c.id === cid)?.name).filter(Boolean);
            return (
              <div className="mv-card" key={m.id}>
                {/* Poster */}
                <div className="mv-poster">
                  {m.poster
                    ? <img src={m.poster} alt={m.title} />
                    : <div className="mv-poster-placeholder">🎬</div>
                  }
                  <span className={`mv-status-badge ${st.cls}`}>{st.label}</span>
                </div>
                {/* Info */}
                <div className="mv-card-body">
                  <h3 className="mv-card-title">{m.title}</h3>
                  <div className="mv-card-meta">
                    <span>🎬 {m.director}</span>
                    <span>⏱ {m.duration} phút</span>
                    {m.rating && <span>⭐ {m.rating}</span>}
                  </div>
                  <div className="mv-cat-list">
                    {cats.map((c) => <span className="mv-cat-tag" key={c}>{c}</span>)}
                  </div>
                  <div className="mv-card-actions">
                    <button className="mv-btn mv-btn-view"   onClick={() => onView(m)}>Xem</button>
                    <button className="mv-btn mv-btn-edit"   onClick={() => onEdit(m)}>Sửa</button>
                    <button className="mv-btn mv-btn-delete" onClick={() => onDelete(m)}>Xóa</button>
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
  const cats = movie.categories.map((cid) => categories.find((c) => c.id === cid)?.name).filter(Boolean);

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
                {movie.poster
                  ? <img src={movie.poster} alt={movie.title} />
                  : <div className="mv-poster-placeholder mv-poster-lg">🎬</div>
                }
              </div>
              <span className={`mv-status-badge ${st.cls}`} style={{ alignSelf: "center", marginTop: 12 }}>{st.label}</span>
              {movie.rating && (
                <div className="mv-rating-big">⭐ {movie.rating}<span>/10</span></div>
              )}
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

              {movie.trailerUrl && (
                <a className="mv-trailer-btn" href={movie.trailerUrl} target="_blank" rel="noreferrer">
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
  const [posterPreview, setPosterPreview] = useState(movie?.poster || "");
  const [posterDrag, setPosterDrag] = useState(false);

  const set = (field, val) => {
    setForm((f) => ({ ...f, [field]: val }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  // Đọc file ảnh → base64 preview
  const handlePosterFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      setPosterPreview(dataUrl);
      set("poster", dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handlePosterDrop = (e) => {
    e.preventDefault();
    setPosterDrag(false);
    const file = e.dataTransfer.files?.[0];
    handlePosterFile(file);
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
    if (!form.title.trim())       e.title       = "Vui lòng nhập tên phim.";
    if (!form.director.trim())    e.director    = "Vui lòng nhập đạo diễn.";
    if (!form.duration || form.duration <= 0) e.duration = "Thời lượng phải > 0.";
    if (!form.releaseDate)        e.releaseDate = "Vui lòng chọn ngày khởi chiếu.";
    if (form.categories.length === 0) e.categories = "Chọn ít nhất một danh mục.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: movie?.id || Date.now() });
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
                  <input type="date" className={errors.releaseDate ? "error" : ""} value={form.releaseDate} onChange={(e) => set("releaseDate", e.target.value)} />
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
                <label>Link Trailer</label>
                <input value={form.trailerUrl} onChange={(e) => set("trailerUrl", e.target.value)} placeholder="https://youtube.com/…" />
              </div>

              <div className="mv-field">
                <label>Poster phim</label>
                <div
                  className={`img-upload-zone${posterDrag ? " drag-over" : ""}${posterPreview ? " has-image" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setPosterDrag(true); }}
                  onDragLeave={() => setPosterDrag(false)}
                  onDrop={handlePosterDrop}
                  onClick={() => document.getElementById("poster-file-input").click()}
                >
                  {posterPreview ? (
                    <>
                      <img src={posterPreview} alt="poster preview" className="img-upload-preview" />
                      <button
                        className="img-upload-remove"
                        onClick={(e) => { e.stopPropagation(); setPosterPreview(""); set("poster", ""); }}
                      >✕</button>
                    </>
                  ) : (
                    <div className="img-upload-placeholder">
                      <span className="img-upload-icon">🖼</span>
                      <span>Kéo thả hoặc <strong>chọn ảnh</strong> từ máy</span>
                      <span className="img-upload-hint">JPG, PNG, WEBP – tối đa 5MB</span>
                    </div>
                  )}
                </div>
                <input
                  id="poster-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handlePosterFile(e.target.files?.[0])}
                />
              </div>

              <div className="mv-field">
                <label>Đánh giá (tùy chọn)</label>
                <input type="number" step="0.1" min="0" max="10" value={form.rating || ""} onChange={(e) => set("rating", e.target.value ? Number(e.target.value) : null)} placeholder="0.0 – 10.0" />
              </div>

              <div className="mv-field">
                <label>Danh mục *</label>
                {errors.categories && <span className="mv-error">{errors.categories}</span>}
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
          <button className="mv-btn mv-btn-add mv-btn-lg" onClick={handleSave}>
            {isEdit ? "Lưu thay đổi" : "Thêm phim"}
          </button>
          <button className="mv-btn mv-btn-secondary mv-btn-lg" onClick={onClose}>Hủy</button>
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
function DeleteConfirm({ target, type, onClose, onConfirm }) {
  if (!target) return null;
  return (
    <div className="mv-modal-overlay" onClick={onClose}>
      <div className="mv-modal mv-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="mv-modal-header">
          <h2>Xác nhận xóa</h2>
          <button className="mv-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="mv-modal-body">
          <div className="mv-delete-warn">
            ⚠️ Bạn có chắc muốn xóa {type === "movie" ? "phim" : "danh mục"}
            &nbsp;<strong>"{target.title || target.name}"</strong>?
            <br />Hành động này không thể hoàn tác.
          </div>
        </div>
        <div className="mv-modal-footer">
          <button className="mv-btn mv-btn-delete mv-btn-lg" onClick={() => onConfirm(target)}>Xóa</button>
          <button className="mv-btn mv-btn-secondary mv-btn-lg" onClick={onClose}>Hủy</button>
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
  const [movies,     setMovies]     = useState(SAMPLE_MOVIES);
  const [categories, setCategories] = useState(SAMPLE_CATEGORIES);
  const [activeTab,  setActiveTab]  = useState("list");

  // Modal states
  const [viewMovie,    setViewMovie]    = useState(null);
  const [editMovie,    setEditMovie]    = useState(undefined); // undefined = closed, null = new
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteType,   setDeleteType]   = useState("movie");

  const [toast, setToast] = useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Stats
  const stats = [
    { label: "Tổng phim",    value: movies.length,                                              color: "#7c61ff" },
    { label: "Đang chiếu",   value: movies.filter((m) => m.status === "now_showing").length,    color: "#4ade80" },
    { label: "Sắp chiếu",    value: movies.filter((m) => m.status === "coming_soon").length,    color: "#fbbf24" },
    { label: "Danh mục",     value: categories.length,                                          color: "#60a5fa" },
  ];

  const TABS = [
    { key: "list",     label: "Danh sách phim" },
    { key: "category", label: "Danh mục phim"  },
  ];

  // Handlers
  const handleView = (m) => setViewMovie(m);

  const handleEdit = (m) => {
    setViewMovie(null);
    setEditMovie(m); // null = new movie, object = edit
  };

  const handleSaveMovie = (data) => {
    if (data.id && movies.find((m) => m.id === data.id)) {
      setMovies((prev) => prev.map((m) => (m.id === data.id ? data : m)));
      showToast(`Đã cập nhật phim "${data.title}".`);
    } else {
      setMovies((prev) => [data, ...prev]);
      showToast(`Đã thêm phim "${data.title}".`);
    }
    setEditMovie(undefined);
  };

  const handleDeleteMovie = (m) => { setDeleteTarget(m); setDeleteType("movie"); };
  const handleDeleteCat   = (c) => { setDeleteTarget(c); setDeleteType("category"); };

  const handleConfirmDelete = (target) => {
    if (deleteType === "movie") {
      setMovies((prev) => prev.filter((m) => m.id !== target.id));
      showToast(`Đã xóa phim "${target.title}".`, "success");
    } else {
      setCategories((prev) => prev.filter((c) => c.id !== target.id));
      showToast(`Đã xóa danh mục "${target.name}".`, "success");
    }
    setDeleteTarget(null);
  };

  const handleAddCat  = (c) => { setCategories((prev) => [...prev, c]); showToast(`Đã thêm danh mục "${c.name}".`); };
  const handleEditCat = (c) => { setCategories((prev) => prev.map((x) => (x.id === c.id ? c : x))); showToast(`Đã cập nhật danh mục "${c.name}".`); };

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
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={() => setToast(null)} />
    </div>
  );
}
