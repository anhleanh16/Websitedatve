import { useEffect, useMemo, useState } from "react";
import { adminComboService } from "../../services/adminApi";
import AdminPagination, { useAdminPagination } from "../../components/AdminPagination.jsx";
import AdminModalPortal from "../../components/AdminModalPortal.jsx";
import { toAbsoluteAssetUrl } from "../../../utils/api.js";
import "./combos.css";

const CATEGORY_LABELS = {
  combo: "Combo",
  single: "Món lẻ",
};

const STATUS_LABELS = {
  active: { label: "Đang bán", cls: "confirmed" },
  inactive: { label: "Ngừng bán", cls: "cancelled" },
};

const EMPTY_FORM = {
  combo_name: "",
  description: "",
  price: "",
  image: "",
  category: "combo",
  popcorn_quantity: 1,
  drink_quantity: 1,
  popcorn_options: "Bắp ngọt, Bắp phô mai, Bắp caramel",
  drink_options: "Coca-Cola, Pepsi, 7 Up, Trà đào",
  is_active: true,
  sort_order: 0,
};

function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

function optionsToText(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

function summarizeContents(combo) {
  const parts = [];
  if (Number(combo.popcorn_quantity || 0) > 0) {
    parts.push(`${combo.popcorn_quantity} bắp`);
  }
  if (Number(combo.drink_quantity || 0) > 0) {
    parts.push(`${combo.drink_quantity} nước`);
  }
  return parts.join(" + ") || "Tùy chỉnh";
}

const resolveComboImage = (image) => toAbsoluteAssetUrl(image || "");

function ComboFormModal({ combo, onClose, onSave }) {
  const isEdit = Boolean(combo?.combo_id);
  const [form, setForm] = useState(
    combo
      ? {
          ...combo,
          price: String(combo.price ?? ""),
          popcorn_options: optionsToText(combo.popcorn_options),
          drink_options: optionsToText(combo.drink_options),
        }
      : { ...EMPTY_FORM },
  );
  const [errors, setErrors] = useState({});
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(combo?.image || "");

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleImageFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);
  };

  const validate = () => {
    const nextErrors = {};
    if (!String(form.combo_name || "").trim()) {
      nextErrors.combo_name = "Nhập tên combo.";
    }
    if (!Number(form.price || 0)) {
      nextErrors.price = "Nhập giá combo hợp lệ.";
    }
    if (Number(form.popcorn_quantity || 0) <= 0 && Number(form.drink_quantity || 0) <= 0) {
      nextErrors.contents = "Combo phải có ít nhất bắp hoặc nước.";
    }
    return nextErrors;
  };

  const handleSave = () => {
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const payload = new FormData();
    Object.entries({
      ...form,
      price: Number(form.price || 0),
      popcorn_quantity: Number(form.popcorn_quantity || 0),
      drink_quantity: Number(form.drink_quantity || 0),
      popcorn_options: String(form.popcorn_options || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      drink_options: String(form.drink_options || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      is_active: Boolean(form.is_active),
      sort_order: Number(form.sort_order || 0),
    }).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (Array.isArray(value)) {
        payload.append(key, JSON.stringify(value));
        return;
      }
      payload.append(key, String(value));
    });

    if (selectedImageFile) {
      payload.set("imageFile", selectedImageFile);
    } else if (form.image && !form.image.startsWith("blob:")) {
      payload.set("image", form.image);
    }

    onSave(payload);
  };

  const previewSummary = summarizeContents(form);

  return (
    <AdminModalPortal>
    <div className="bk-modal-overlay" onClick={onClose}>
      <div className="bk-modal combo-modal" onClick={(event) => event.stopPropagation()}>
        <div className="bk-modal-header">
          <div>
            <h2>{isEdit ? "Chỉnh sửa combo" : "Tạo combo mới"}</h2>
            <span className="bk-booking-code">{CATEGORY_LABELS[form.category] || "Combo"}</span>
          </div>
          <button className="bk-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="bk-modal-body">
          <div className="combo-form-grid">
            <div className="combo-form-col">
              <div className="combo-field">
                <label>Tên combo *</label>
                <input
                  className={errors.combo_name ? "error" : ""}
                  value={form.combo_name}
                  onChange={(event) => setField("combo_name", event.target.value)}
                  placeholder="Ví dụ: Combo 1 Bắp + 2 Nước"
                />
                {errors.combo_name && <span className="combo-error">{errors.combo_name}</span>}
              </div>

              <div className="combo-field-row">
                <div className="combo-field">
                  <label>Loại</label>
                  <select
                    value={form.category}
                    onChange={(event) => setField("category", event.target.value)}
                  >
                    <option value="combo">Combo</option>
                    <option value="single">Món lẻ</option>
                  </select>
                </div>
                <div className="combo-field">
                  <label>Giá *</label>
                  <input
                    type="number"
                    min="0"
                    className={errors.price ? "error" : ""}
                    value={form.price}
                    onChange={(event) => setField("price", event.target.value)}
                  />
                  {errors.price && <span className="combo-error">{errors.price}</span>}
                </div>
              </div>

              <div className="combo-field">
                <label>Mô tả</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) => setField("description", event.target.value)}
                  placeholder="Mô tả ngắn cho combo..."
                />
              </div>

              <div className="combo-field">
                <label>Ảnh combo</label>
                <div className="combo-image-upload-wrap">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                  />
                  <input
                    value={form.image}
                    onChange={(event) => setField("image", event.target.value)}
                    placeholder="/uploads/combos/combo-1.png hoặc URL đầy đủ"
                  />
                </div>
                {(imagePreview || form.image) && (
                  <div className="combo-image-preview">
                    <img
                      src={imagePreview || resolveComboImage(form.image || "")}
                      alt={form.combo_name || "Combo preview"}
                      onError={(event) => {
                        event.target.style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="combo-form-col">
              <div className="combo-field-row">
                <div className="combo-field">
                  <label>Số lượng bắp</label>
                  <input
                    type="number"
                    min="0"
                    value={form.popcorn_quantity}
                    onChange={(event) => setField("popcorn_quantity", event.target.value)}
                  />
                </div>
                <div className="combo-field">
                  <label>Số lượng nước</label>
                  <input
                    type="number"
                    min="0"
                    value={form.drink_quantity}
                    onChange={(event) => setField("drink_quantity", event.target.value)}
                  />
                </div>
              </div>

              {errors.contents && <span className="combo-error">{errors.contents}</span>}

              <div className="combo-field">
                <label>Loại bắp cho phép</label>
                <textarea
                  rows={3}
                  value={form.popcorn_options}
                  onChange={(event) => setField("popcorn_options", event.target.value)}
                  placeholder="Bắp ngọt, Bắp phô mai, Bắp caramel"
                />
                <small>Nhập cách nhau bằng dấu phẩy.</small>
              </div>

              <div className="combo-field">
                <label>Loại nước cho phép</label>
                <textarea
                  rows={3}
                  value={form.drink_options}
                  onChange={(event) => setField("drink_options", event.target.value)}
                  placeholder="Coca-Cola, Pepsi, 7 Up, Trà đào"
                />
                <small>Nhập cách nhau bằng dấu phẩy.</small>
              </div>

              <div className="combo-field-row">
                <div className="combo-field">
                  <label>Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min="0"
                    value={form.sort_order}
                    onChange={(event) => setField("sort_order", event.target.value)}
                  />
                </div>
                <div className="combo-field">
                  <label>Trạng thái</label>
                  <select
                    value={form.is_active ? "active" : "inactive"}
                    onChange={(event) => setField("is_active", event.target.value === "active")}
                  >
                    <option value="active">Đang bán</option>
                    <option value="inactive">Ngừng bán</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="combo-preview-card">
            <div className="combo-preview-top">
              <span className="combo-preview-badge">{CATEGORY_LABELS[form.category]}</span>
              <strong>{form.combo_name || "Tên combo"}</strong>
            </div>
            <p>{form.description || "Mô tả combo sẽ hiển thị ở đây."}</p>
            <div className="combo-preview-meta">
              <span>{previewSummary}</span>
              <span>{formatMoney(form.price || 0)}</span>
            </div>
          </div>
        </div>

        <div className="bk-modal-footer">
          <button className="bk-btn bk-btn-check bk-btn-lg" onClick={handleSave}>
            {isEdit ? "Lưu thay đổi" : "Tạo combo"}
          </button>
          <button className="bk-btn bk-btn-secondary bk-btn-lg" onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

export default function AdminCombos() {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [editingCombo, setEditingCombo] = useState(null);
  const [toast, setToast] = useState(null);

  const loadCombos = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminComboService.getAll();
      setCombos(Array.isArray(data?.combos) ? data.combos : []);
    } catch (loadError) {
      console.error(loadError);
      setCombos([]);
      setError(loadError.message || "Không thể tải danh sách combo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCombos();
  }, []);

  const filteredCombos = useMemo(() => {
    return combos.filter((combo) => {
      const keyword = search.trim().toLowerCase();
      const matchesSearch =
        !keyword ||
        String(combo.combo_name || "").toLowerCase().includes(keyword) ||
        String(combo.description || "").toLowerCase().includes(keyword);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" ? combo.is_active : !combo.is_active);
      const matchesCategory =
        categoryFilter === "all" || combo.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoryFilter, combos, search, statusFilter]);
  const { page, setPage, totalPages, pageItems } = useAdminPagination(filteredCombos);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3200);
  };

  const stats = useMemo(
    () => [
      { label: "Tổng món", value: combos.length, color: "#7c61ff" },
      {
        label: "Đang bán",
        value: combos.filter((combo) => combo.is_active).length,
        color: "#4ade80",
      },
      {
        label: "Combo",
        value: combos.filter((combo) => combo.category === "combo").length,
        color: "#fbbf24",
      },
      {
        label: "Món lẻ",
        value: combos.filter((combo) => combo.category === "single").length,
        color: "#38bdf8",
      },
    ],
    [combos],
  );

  const handleSave = async (payload) => {
    try {
      if (editingCombo?.combo_id) {
        await adminComboService.update(editingCombo.combo_id, payload);
        showToast("Đã cập nhật combo.");
      } else {
        await adminComboService.create(payload);
        showToast("Đã tạo combo mới.");
      }
      setEditingCombo(null);
      await loadCombos();
    } catch (saveError) {
      console.error(saveError);
      showToast(saveError.message || "Không thể lưu combo.", "error");
    }
  };

  const handleDelete = async (combo) => {
    if (Number(combo?.usage_count || 0) > 0) {
      showToast("Combo đã được sử dụng trong khu vực đơn hàng nên không thể ngừng bán hoặc xóa.", "error");
      return;
    }

    try {
      const result = await adminComboService.delete(combo.combo_id);
      showToast(result?.message || "Đã xóa combo.");
      await loadCombos();
    } catch (deleteError) {
      console.error(deleteError);
      showToast(deleteError.message || "Không thể xóa combo.", "error");
    }
  };

  return (
    <div className="admin-bookings admin-combos">
      <div className="bk-page-header">
        <h2>Quản lý combo</h2>
        <p>Quản lý combo bắp nước, món lẻ và tùy chọn loại bắp, loại nước từ cơ sở dữ liệu</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-icon" style={{ color: stat.color }}>
              ●
            </div>
            <div className="stat-info">
              <h3>{stat.label}</h3>
              <p>{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="table-card">
        <div className="bk-toolbar">
          <input
            className="bk-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm theo tên combo hoặc mô tả..."
          />
          <select
            className="bk-filter-select"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">Tất cả loại</option>
            <option value="combo">Combo</option>
            <option value="single">Món lẻ</option>
          </select>
          <select
            className="bk-filter-select"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang bán</option>
            <option value="inactive">Ngừng bán</option>
          </select>
          <button className="bk-btn bk-btn-check" onClick={() => setEditingCombo({ ...EMPTY_FORM })}>
            + Thêm combo
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Hình</th>
              <th>Tên combo</th>
              <th>Loại</th>
              <th>Cấu phần</th>
              <th>Giá</th>
              <th>Tùy chọn</th>
              <th>Trạng thái</th>
              <th>Lượt dùng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 28 }}>
                  Đang tải danh sách combo...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 28, color: "#fca5a5" }}>
                  {error}
                </td>
              </tr>
            ) : filteredCombos.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: 28 }}>
                  Chưa có combo nào phù hợp bộ lọc.
                </td>
              </tr>
            ) : (
              pageItems.map((combo) => {
                const statusMeta = combo.is_active ? STATUS_LABELS.active : STATUS_LABELS.inactive;
                const comboImage = resolveComboImage(combo.image);
                return (
                  <tr key={combo.combo_id}>
                    <td>
                      {comboImage ? (
                        <img
                          src={comboImage}
                          alt={combo.combo_name}
                          className="combo-table-image"
                          onError={(event) => {
                            event.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="combo-table-image missing-image-placeholder">—</div>
                      )}
                    </td>
                    <td>
                      <div className="bk-user-cell combo-name-cell">
                        <div className="combo-name-copy">
                          <strong>{combo.combo_name}</strong>
                          <span>{combo.description || "Không có mô tả"}</span>
                        </div>
                      </div>
                    </td>
                    <td>{CATEGORY_LABELS[combo.category] || combo.category}</td>
                    <td>{summarizeContents(combo)}</td>
                    <td>{formatMoney(combo.price)}</td>
                    <td>
                      <div className="combo-option-cell">
                        {combo.popcorn_options?.length > 0 && (
                          <span>Bắp: {combo.popcorn_options.join(", ")}</span>
                        )}
                        {combo.drink_options?.length > 0 && (
                          <span>Nước: {combo.drink_options.join(", ")}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${statusMeta.cls}`}>{statusMeta.label}</span>
                    </td>
                    <td>{combo.usage_count}</td>
                    <td>
                      <div className="combo-action-row">
                        <button className="bk-btn bk-btn-view" onClick={() => setEditingCombo(combo)}>
                          Sửa
                        </button>
                        <button className="bk-btn bk-btn-refund" onClick={() => handleDelete(combo)}>
                          {combo.usage_count > 0 ? "Không thể xóa" : "Xóa"}
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
      <AdminPagination page={page} totalPages={totalPages} totalItems={filteredCombos.length} pageSize={10} onPageChange={setPage} />

      {editingCombo && (
        <ComboFormModal
          combo={editingCombo?.combo_id ? editingCombo : null}
          onClose={() => setEditingCombo(null)}
          onSave={handleSave}
        />
      )}

      {toast && (
        <div className={`bk-toast bk-toast-${toast.type === "error" ? "error" : "success"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
