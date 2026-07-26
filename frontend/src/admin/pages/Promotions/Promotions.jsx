import { useEffect, useState } from "react";
import { adminPromotionService } from "../../services/adminApi";
import './promotions.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const PROMO_STATUS = {
  active:   { label: "Đang hoạt động", cls: "confirmed" },
  inactive: { label: "Chưa kích hoạt", cls: "pending"   },
  expired:  { label: "Hết hạn",        cls: "cancelled" },
  used:     { label: "Đã dùng",        cls: "refunded"  },
};

const TYPE_LABEL = { percent: "%", fixed: "₫" };

function fmtMoney(n) { return Number(n).toLocaleString("vi-VN") + " ₫"; }
function fmtVal(type, val) {
  return type === "percent" ? `${val}%` : fmtMoney(val);
}
function usagePct(used, limit) { return limit ? Math.min(100, Math.round((used / limit) * 100)) : 0; }

function genCode(prefix = "CODE") {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const EMPTY_COUPON = {
  code: "", type: "percent", value: "", minOrder: 0, maxDiscount: "",
  startDate: "", endDate: "", usageLimit: 100, usedCount: 0,
  applicableTo: "all", status: "active", desc: "",
};
const EMPTY_VOUCHER = {
  code: "", type: "percent", value: "", minOrder: 0, maxDiscount: "",
  issuedTo: "", userId: "", issuedDate: "", expiryDate: "",
  status: "active", desc: "",
};

// ─── Coupon Form Modal ────────────────────────────────────────────────────────
function CouponForm({ coupon, onClose, onSave }) {
  const isEdit = !!coupon;
  const [form, setForm] = useState(coupon ? { ...coupon } : { ...EMPTY_COUPON, code: genCode("KM") });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.code.trim())            e.code      = "Nhập mã khuyến mãi.";
    if (!form.value || form.value <= 0) e.value   = "Nhập giá trị giảm giá.";
    if (form.type === "percent" && form.value > 50) e.value = "Phần trăm không được vượt quá 50%.";
    if (!form.startDate)              e.startDate = "Chọn ngày bắt đầu.";
    if (!form.endDate)                e.endDate   = "Chọn ngày kết thúc.";
    if (form.startDate && form.endDate && form.startDate > form.endDate) e.endDate = "Ngày kết thúc phải sau ngày bắt đầu.";
    if (!form.usageLimit || form.usageLimit <= 0) e.usageLimit = "Nhập số lần dùng tối đa.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: coupon?.id || Date.now(), value: Number(form.value), minOrder: Number(form.minOrder), maxDiscount: Number(form.maxDiscount), usageLimit: Number(form.usageLimit) });
  };

  return (
    <div className="pr-overlay" onClick={onClose}>
      <div className="pr-modal" onClick={e => e.stopPropagation()}>
        <div className="pr-modal-header">
          <h2>{isEdit ? "Chỉnh sửa mã KM" : "Tạo mã khuyến mãi mới"}</h2>
          <button className="pr-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="pr-modal-body">
          <div className="pr-form-grid">
            {/* Col 1 */}
            <div className="pr-form-col">
              <div className="pr-field">
                <label>Mã khuyến mãi *</label>
                <div className="pr-code-input-row">
                  <input className={errors.code ? "error" : ""} value={form.code}
                    onChange={e => set("code", e.target.value.toUpperCase())} placeholder="SUMMER25…" />
                  <button className="pr-btn pr-btn-secondary" type="button" onClick={() => set("code", genCode("KM"))}>Tạo tự động</button>
                </div>
                {errors.code && <span className="pr-error">{errors.code}</span>}
              </div>

              <div className="pr-field">
                <label>Mô tả</label>
                <input value={form.desc} onChange={e => set("desc", e.target.value)} placeholder="Mô tả chương trình khuyến mãi…" />
              </div>

              <div className="pr-field-row">
                <div className="pr-field">
                  <label>Loại giảm giá</label>
                  <select value={form.type} onChange={e => set("type", e.target.value)}>
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền cố định (₫)</option>
                  </select>
                </div>
                <div className="pr-field">
                  <label>Giá trị giảm *</label>
                  <div className="pr-input-suffix">
                    <input type="number" min={1} max={form.type === "percent" ? 50 : undefined} className={errors.value ? "error" : ""}
                      value={form.value} onChange={e => set("value", e.target.value)} />
                    <span>{TYPE_LABEL[form.type]}</span>
                  </div>
                  {errors.value && <span className="pr-error">{errors.value}</span>}
                </div>
              </div>

              <div className="pr-field-row">
                <div className="pr-field">
                  <label>Đơn tối thiểu (₫)</label>
                  <input type="number" min={0} value={form.minOrder} onChange={e => set("minOrder", e.target.value)} />
                </div>
                <div className="pr-field">
                  <label>Giảm tối đa (₫)</label>
                  <input type="number" min={0} value={form.maxDiscount} onChange={e => set("maxDiscount", e.target.value)} placeholder="Không giới hạn" />
                </div>
              </div>
            </div>

            {/* Col 2 */}
            <div className="pr-form-col">
              <div className="pr-field-row">
                <div className="pr-field">
                  <label>Ngày bắt đầu *</label>
                  <input type="date" className={errors.startDate ? "error" : ""} value={form.startDate} onChange={e => set("startDate", e.target.value)} />
                  {errors.startDate && <span className="pr-error">{errors.startDate}</span>}
                </div>
                <div className="pr-field">
                  <label>Ngày kết thúc *</label>
                  <input type="date" className={errors.endDate ? "error" : ""} value={form.endDate} onChange={e => set("endDate", e.target.value)} />
                  {errors.endDate && <span className="pr-error">{errors.endDate}</span>}
                </div>
              </div>

              <div className="pr-field-row">
                <div className="pr-field">
                  <label>Số lần dùng tối đa *</label>
                  <input type="number" min={1} className={errors.usageLimit ? "error" : ""} value={form.usageLimit} onChange={e => set("usageLimit", e.target.value)} />
                  {errors.usageLimit && <span className="pr-error">{errors.usageLimit}</span>}
                </div>
                <div className="pr-field">
                  <label>Áp dụng cho</label>
                  <select value={form.applicableTo} onChange={e => set("applicableTo", e.target.value)}>
                    <option value="all">Tất cả</option>
                    <option value="new">Khách mới</option>
                    <option value="vip">Thành viên VIP</option>
                    <option value="imax">Suất chiếu IMAX</option>
                  </select>
                </div>
              </div>

              <div className="pr-field">
                <label>Trạng thái</label>
                <select value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Chưa kích hoạt</option>
                </select>
              </div>

              {/* Preview */}
              {form.value > 0 && (
                <div className="pr-preview-card">
                  <div className="pr-preview-badge">{fmtVal(form.type, form.value)} OFF</div>
                  <div className="pr-preview-code">{form.code || "MÃ KM"}</div>
                  <div className="pr-preview-meta">
                    {form.minOrder > 0 && <span>Đơn tối thiểu {fmtMoney(form.minOrder)}</span>}
                    {form.endDate && <span>HSD: {form.endDate}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pr-modal-footer">
          <button className="pr-btn pr-btn-add pr-btn-lg" onClick={handleSave}>{isEdit ? "Lưu thay đổi" : "Tạo mã"}</button>
          <button className="pr-btn pr-btn-secondary pr-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

// ─── Voucher Form Modal ───────────────────────────────────────────────────────
function VoucherForm({ voucher, users, onClose, onSave }) {
  const isEdit = !!voucher;
  const [form, setForm] = useState(voucher ? { ...voucher } : { ...EMPTY_VOUCHER, code: genCode("VCH"), issuedDate: new Date().toISOString().slice(0, 10) });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

  const validate = () => {
    const e = {};
    if (!form.code.trim())              e.code       = "Nhập mã voucher.";
    if (!form.value || form.value <= 0) e.value      = "Nhập giá trị.";
    if (form.type === "percent" && form.value > 50) e.value = "Phần trăm không được vượt quá 50%.";
    if (!form.issuedTo.trim())          e.issuedTo   = "Chọn hoặc nhập tên người nhận.";
    if (!form.issuedDate)               e.issuedDate = "Chọn ngày cấp.";
    if (!form.expiryDate)               e.expiryDate = "Chọn ngày hết hạn.";
    if (form.issuedDate && form.expiryDate && form.issuedDate > form.expiryDate) e.expiryDate = "Ngày hết hạn phải sau ngày cấp.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: voucher?.id || Date.now(), value: Number(form.value), minOrder: Number(form.minOrder || 0), maxDiscount: Number(form.maxDiscount || 0) });
  };

  return (
    <div className="pr-overlay" onClick={onClose}>
      <div className="pr-modal" onClick={e => e.stopPropagation()}>
        <div className="pr-modal-header">
          <h2>{isEdit ? "Chỉnh sửa voucher" : "Cấp voucher mới"}</h2>
          <button className="pr-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="pr-modal-body">
          <div className="pr-form-grid">
            <div className="pr-form-col">
              <div className="pr-field">
                <label>Mã voucher *</label>
                <div className="pr-code-input-row">
                  <input className={errors.code ? "error" : ""} value={form.code}
                    onChange={e => set("code", e.target.value.toUpperCase())} />
                  <button className="pr-btn pr-btn-secondary" type="button" onClick={() => set("code", genCode("VCH"))}>Tạo tự động</button>
                </div>
                {errors.code && <span className="pr-error">{errors.code}</span>}
              </div>

              <div className="pr-field">
                <label>Cấp cho khách hàng *</label>
                <select className={errors.issuedTo ? "error" : ""}
                  value={form.userId}
                  onChange={e => {
                    const u = users.find(x => String(x.id) === e.target.value);
                    set("userId", e.target.value);
                    set("issuedTo", u?.full_name || "");
                  }}>
                  <option value="">-- Chọn khách hàng --</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
                {errors.issuedTo && <span className="pr-error">{errors.issuedTo}</span>}
              </div>

              <div className="pr-field">
                <label>Mô tả / Lý do cấp</label>
                <input value={form.desc} onChange={e => set("desc", e.target.value)} placeholder="Sinh nhật, bồi thường, sự kiện…" />
              </div>

              <div className="pr-field-row">
                <div className="pr-field">
                  <label>Loại giảm giá</label>
                  <select value={form.type} onChange={e => set("type", e.target.value)}>
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền (₫)</option>
                  </select>
                </div>
                <div className="pr-field">
                  <label>Giá trị *</label>
                  <div className="pr-input-suffix">
                    <input type="number" min={1} max={form.type === "percent" ? 50 : undefined} className={errors.value ? "error" : ""}
                      value={form.value} onChange={e => set("value", e.target.value)} />
                    <span>{TYPE_LABEL[form.type]}</span>
                  </div>
                  {errors.value && <span className="pr-error">{errors.value}</span>}
                </div>
              </div>
            </div>

            <div className="pr-form-col">
              <div className="pr-field-row">
                <div className="pr-field">
                  <label>Ngày cấp *</label>
                  <input type="date" className={errors.issuedDate ? "error" : ""} value={form.issuedDate} onChange={e => set("issuedDate", e.target.value)} />
                  {errors.issuedDate && <span className="pr-error">{errors.issuedDate}</span>}
                </div>
                <div className="pr-field">
                  <label>Ngày hết hạn *</label>
                  <input type="date" className={errors.expiryDate ? "error" : ""} value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} />
                  {errors.expiryDate && <span className="pr-error">{errors.expiryDate}</span>}
                </div>
              </div>

              <div className="pr-field-row">
                <div className="pr-field">
                  <label>Đơn tối thiểu (₫)</label>
                  <input type="number" min={0} value={form.minOrder} onChange={e => set("minOrder", e.target.value)} />
                </div>
                <div className="pr-field">
                  <label>Giảm tối đa (₫)</label>
                  <input type="number" min={0} value={form.maxDiscount} onChange={e => set("maxDiscount", e.target.value)} placeholder="Không giới hạn" />
                </div>
              </div>

              <div className="pr-field">
                <label>Trạng thái</label>
                <select value={form.status} onChange={e => set("status", e.target.value)}>
                  <option value="active">Kích hoạt</option>
                  <option value="inactive">Chưa kích hoạt</option>
                </select>
              </div>

              {form.value > 0 && form.issuedTo && (
                <div className="pr-voucher-preview">
                  <div className="pr-voucher-preview-left">
                    <div className="pr-voucher-preview-val">{fmtVal(form.type, form.value)}</div>
                    <div className="pr-voucher-preview-off">GIẢM GIÁ</div>
                  </div>
                  <div className="pr-voucher-preview-right">
                    <div className="pr-voucher-preview-code">{form.code}</div>
                    <div className="pr-voucher-preview-to">Cấp cho: <strong>{form.issuedTo}</strong></div>
                    {form.expiryDate && <div className="pr-voucher-preview-exp">HSD: {form.expiryDate}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="pr-modal-footer">
          <button className="pr-btn pr-btn-add pr-btn-lg" onClick={handleSave}>{isEdit ? "Lưu thay đổi" : "Cấp voucher"}</button>
          <button className="pr-btn pr-btn-secondary pr-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function Confirm({ message, onClose, onConfirm }) {
  return (
    <div className="pr-overlay" onClick={onClose}>
      <div className="pr-modal pr-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="pr-modal-header"><h2>Xác nhận xóa</h2><button className="pr-modal-close" onClick={onClose}>✕</button></div>
        <div className="pr-modal-body">
          <div className="pr-delete-warn">⚠️ {message}</div>
        </div>
        <div className="pr-modal-footer">
          <button className="pr-btn pr-btn-delete pr-btn-lg" onClick={onConfirm}>Xóa</button>
          <button className="pr-btn pr-btn-secondary pr-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="pr-toast">
      {message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Coupon Tab ───────────────────────────────────────────────────────────────
function CouponTab({ coupons, onAdd, onEdit, onDelete }) {
  const [search, setSearch]     = useState("");
  const [filterStatus, setFS]   = useState("all");

  const filtered = coupons.filter(c => {
    const q = search.toLowerCase();
    return (c.code.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q)) &&
           (filterStatus === "all" || c.status === filterStatus);
  });

  return (
    <div className="pr-section">
      <div className="pr-toolbar">
        <input className="pr-search" placeholder="Tìm mã, mô tả…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="pr-select" value={filterStatus} onChange={e => setFS(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Chưa kích hoạt</option>
          <option value="expired">Hết hạn</option>
        </select>
        <button className="pr-btn pr-btn-add" onClick={onAdd}>+ Tạo mã KM</button>
      </div>

      <div className="pr-coupon-grid">
        {filtered.length === 0 ? (
          <div className="pr-empty">Không tìm thấy mã khuyến mãi nào.</div>
        ) : filtered.map(c => {
          const st  = PROMO_STATUS[c.status] || PROMO_STATUS.inactive;
          const pct = usagePct(c.usedCount, c.usageLimit);
          const isExpired = c.status === "expired";
          return (
            <div className={`pr-coupon-card${isExpired ? " expired" : ""}`} key={c.id}>
              {/* Header với badge giảm */}
              <div className="pr-coupon-badge-row">
                <div className="pr-coupon-badge">
                  <span className="pr-coupon-val">{fmtVal(c.type, c.value)}</span>
                  <span className="pr-coupon-off">OFF</span>
                </div>
                <span className={`status-pill ${st.cls}`}>{st.label}</span>
              </div>

              {/* Mã code */}
              <div className="pr-coupon-code-box">
                <span className="pr-coupon-code">{c.code}</span>
                <button className="pr-copy-btn" title="Sao chép" onClick={() => navigator.clipboard?.writeText(c.code)}>⎘</button>
              </div>

              <p className="pr-coupon-desc">{c.desc}</p>

              {/* Meta info */}
              <div className="pr-coupon-meta">
                {c.minOrder > 0 && <span>Đơn từ {fmtMoney(c.minOrder)}</span>}
                {c.maxDiscount > 0 && <span>Tối đa {fmtMoney(c.maxDiscount)}</span>}
                <span>📅 {c.startDate} → {c.endDate}</span>
                <span className="pr-applicable">
                  {{ all: "Tất cả", new: "Khách mới", vip: "Thành viên VIP", imax: "Suất IMAX" }[c.applicableTo]}
                </span>
              </div>

              {/* Usage bar */}
              <div className="pr-usage-wrap">
                <div className="pr-usage-label">
                  <span>Đã dùng</span>
                  <span>{c.usedCount} / {c.usageLimit} lần ({pct}%)</span>
                </div>
                <div className="pr-usage-bar-bg">
                  <div className="pr-usage-bar" style={{ width: `${pct}%`, background: pct >= 90 ? "#f87171" : pct >= 60 ? "#fbbf24" : "#4ade80" }} />
                </div>
              </div>

              <div className="pr-card-actions">
                <button className="pr-btn pr-btn-edit"   onClick={() => onEdit(c)}>Sửa</button>
                <button className="pr-btn pr-btn-delete" onClick={() => onDelete(c)}>Xóa</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pr-footer-count">Hiển thị <strong>{filtered.length}</strong> / {coupons.length} mã</div>
    </div>
  );
}

// ─── Voucher Tab ──────────────────────────────────────────────────────────────
function VoucherTab({ vouchers, users, onAdd, onEdit, onDelete }) {
  const [search, setSearch]   = useState("");
  const [filterStatus, setFS] = useState("all");
  const [filterUser, setFU]   = useState("all");

  const filtered = vouchers.filter(v => {
    const q = search.toLowerCase();
    return (v.code.toLowerCase().includes(q) || v.issuedTo.toLowerCase().includes(q) || v.desc.toLowerCase().includes(q)) &&
           (filterStatus === "all" || v.status === filterStatus) &&
           (filterUser === "all" || String(v.userId) === filterUser);
  });

  return (
    <div className="pr-section">
      <div className="pr-toolbar">
        <input className="pr-search" placeholder="Tìm mã, tên khách hàng…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="pr-select" value={filterStatus} onChange={e => setFS(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Kích hoạt</option>
          <option value="used">Đã dùng</option>
          <option value="expired">Hết hạn</option>
          <option value="inactive">Chưa kích hoạt</option>
        </select>
        <select className="pr-select" value={filterUser} onChange={e => setFU(e.target.value)}>
          <option value="all">Tất cả khách hàng</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <button className="pr-btn pr-btn-add" onClick={onAdd}>+ Cấp voucher</button>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Mã voucher</th>
              <th>Khách hàng</th>
              <th>Giá trị</th>
              <th>Đơn tối thiểu</th>
              <th>Mô tả</th>
              <th>Ngày cấp</th>
              <th>Hết hạn</th>
              <th>Ngày dùng</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}>Không tìm thấy voucher nào.</td></tr>
            ) : filtered.map(v => {
              const st = PROMO_STATUS[v.status] || PROMO_STATUS.inactive;
              return (
                <tr key={v.id}>
                  <td>
                    <div className="pr-voucher-code-cell">
                      <span className="pr-code-tag">{v.code}</span>
                      <button className="pr-copy-btn sm" onClick={() => navigator.clipboard?.writeText(v.code)} title="Sao chép">⎘</button>
                    </div>
                  </td>
                  <td><span style={{ color: "#c0d0ff", fontSize: 13 }}>{v.issuedTo}</span></td>
                  <td><span className="pr-val-badge">{fmtVal(v.type, v.value)}</span></td>
                  <td><span style={{ color: "#8fa6ff", fontSize: 13 }}>{v.minOrder > 0 ? fmtMoney(v.minOrder) : "—"}</span></td>
                  <td><span style={{ color: "#b0c0e8", fontSize: 13 }}>{v.desc}</span></td>
                  <td><span style={{ color: "#7a8fc0", fontSize: 13 }}>{v.issuedDate}</span></td>
                  <td><span style={{ color: "#7a8fc0", fontSize: 13 }}>{v.expiryDate}</span></td>
                  <td><span style={{ color: v.usedDate ? "#4ade80" : "#5a6e9e", fontSize: 13 }}>{v.usedDate || "—"}</span></td>
                  <td><span className={`status-pill ${st.cls}`}>{st.label}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="pr-btn pr-btn-edit"   onClick={() => onEdit(v)}>Sửa</button>
                      <button className="pr-btn pr-btn-delete" onClick={() => onDelete(v)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pr-footer-count">Hiển thị <strong>{filtered.length}</strong> / {vouchers.length} voucher</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPromotions() {
  const [coupons,  setCoupons]  = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [activeTab, setActiveTab] = useState("coupon");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [couponForm,  setCouponForm]  = useState(undefined); // undefined=closed, null=new, obj=edit
  const [voucherForm, setVoucherForm] = useState(undefined);
  const [deleteTarget, setDeleteTarget] = useState(null); // {type, item}
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [promotionData, userData] = await Promise.all([
        adminPromotionService.getAll(),
        adminPromotionService.getRecipients(),
      ]);
      setCoupons(Array.isArray(promotionData?.coupons) ? promotionData.coupons : []);
      setVouchers(Array.isArray(promotionData?.vouchers) ? promotionData.vouchers : []);
      setUsers(Array.isArray(userData?.users) ? userData.users : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể tải dữ liệu khuyến mãi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Coupon handlers
  const handleSaveCoupon = async (data) => {
    try {
      if (coupons.find(c => c.id === data.id)) {
        await adminPromotionService.updateCoupon(data.id, data);
        showToast(`Đã cập nhật mã "${data.code}".`);
      } else {
        await adminPromotionService.createCoupon(data);
        showToast(`Đã tạo mã khuyến mãi "${data.code}".`);
      }
      setCouponForm(undefined);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể lưu mã khuyến mãi.");
    }
  };

  // Voucher handlers
  const handleSaveVoucher = async (data) => {
    try {
      if (vouchers.find(v => v.id === data.id)) {
        await adminPromotionService.updateVoucher(data.id, data);
        showToast(`Đã cập nhật voucher "${data.code}".`);
      } else {
        await adminPromotionService.createVoucher(data);
        showToast(`Đã cấp voucher "${data.code}" cho ${data.issuedTo}.`);
      }
      setVoucherForm(undefined);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể lưu voucher.");
    }
  };

  const handleConfirmDelete = async () => {
    const { type, item } = deleteTarget;
    try {
      await adminPromotionService.delete(item.id);
      if (type === "coupon") {
        setCoupons(p => p.filter(c => c.id !== item.id));
        showToast(`Đã xóa mã "${item.code}".`);
      } else {
        setVouchers(p => p.filter(v => v.id !== item.id));
        showToast(`Đã xóa voucher "${item.code}".`);
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể xóa khuyến mãi.");
    }
  };

  // Stats
  const stats = [
    { label: "Tổng mã KM",        value: coupons.length,                                       color: "#7c61ff" },
    { label: "Mã đang hoạt động", value: coupons.filter(c => c.status === "active").length,    color: "#4ade80" },
    { label: "Tổng voucher",      value: vouchers.length,                                      color: "#5bcad4" },
    { label: "Voucher đã dùng",   value: vouchers.filter(v => v.status === "used").length,     color: "#fbbf24" },
  ];

  const TABS = [
    { key: "coupon",  label: "🎟 Mã khuyến mãi" },
    { key: "voucher", label: "🎫 Voucher"         },
  ];

  return (
    <div className="admin-promotions-page">
      <div className="pr-page-header">
        <h2>Quản lý khuyến mãi</h2>
        <p>Quản lý mã khuyến mãi dùng chung và voucher cấp riêng cho khách hàng</p>
      </div>

      {error && (
        <div className="pr-empty" style={{ padding: 18, textAlign: "left", color: "#fecaca" }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="pr-stats-row">
        {stats.map(s => (
          <div className="pr-stat-pill" key={s.label}>
            <span>{s.label}</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="pr-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`pr-tab${activeTab === t.key ? " active" : ""}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "coupon" && (
        <CouponTab
          coupons={coupons}
          onAdd={() => setCouponForm(null)}
          onEdit={c => setCouponForm(c)}
          onDelete={c => setDeleteTarget({ type: "coupon", item: c })}
        />
      )}
      {activeTab === "voucher" && (
        <VoucherTab
          vouchers={vouchers}
          users={users}
          onAdd={() => setVoucherForm(null)}
          onEdit={v => setVoucherForm(v)}
          onDelete={v => setDeleteTarget({ type: "voucher", item: v })}
        />
      )}

      {/* Modals */}
      {couponForm  !== undefined && <CouponForm  coupon={couponForm}   onClose={() => setCouponForm(undefined)}  onSave={handleSaveCoupon}  />}
      {voucherForm !== undefined && <VoucherForm voucher={voucherForm} users={users} onClose={() => setVoucherForm(undefined)} onSave={handleSaveVoucher} />}
      {deleteTarget && (
        <Confirm
          message={`Bạn có chắc muốn xóa ${deleteTarget.type === "coupon" ? `mã khuyến mãi` : "voucher"} "${deleteTarget.item.code}"? Hành động này không thể hoàn tác.`}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleConfirmDelete}
        />
      )}

      {loading && <div className="pr-empty">Đang tải dữ liệu khuyến mãi...</div>}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
