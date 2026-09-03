import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import './staff.css';
import AdminPagination, { useAdminPagination } from "../../components/AdminPagination.jsx";
import AdminModalPortal from "../../components/AdminModalPortal.jsx";
import { BIRTH_DATE_ERROR, getBirthDateBounds, isValidBirthDate } from "../../../utils/birthDate.js";
import {
  adminUserService,
  adminEmployeeService,
} from "../../services/adminApi.js";

const DEPARTMENTS = [
  { id: 1, name: "Vé & Quầy thu ngân" },
  { id: 2, name: "Kỹ thuật chiếu phim" },
  { id: 3, name: "Phục vụ & F&B" },
  { id: 4, name: "Bảo vệ & An ninh" },
  { id: 5, name: "Quản lý rạp" },
  { id: 6, name: "Phục vụ khách hàng" },
  { id: 7, name: "Thực phẩm & Đồ uống" },
  { id: 8, name: "Vận hành rạp" },
  { id: 9, name: "An ninh & Sảnh" },
  { id: 10, name: "Âm thanh & Ánh sáng" },
  { id: 11, name: "Điện & Thiết bị" },
  { id: 12, name: "Hệ thống & Mạng" },
  { id: 13, name: "Bảo trì phòng chiếu" },
];

const CINEMAS = [
  { id: 1, name: "Sweetstar Movie CGV Hà Nội" },
  { id: 2, name: "Sweetstar Movie Lotte TP.HCM" },
  { id: 3, name: "Sweetstar Movie CGV Đà Nẵng" },
  { id: 4, name: "Sweetstar Movie BHD TP.HCM" },
];

const SHIFTS = [
  { id: "morning",   label: "Ca sáng",  time: "06:00 – 14:00" },
  { id: "afternoon", label: "Ca chiều", time: "14:00 – 22:00" },
  { id: "night",     label: "Ca đêm",   time: "22:00 – 06:00" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  active:   { label: "Đang làm việc", cls: "confirmed" },
  inactive: { label: "Nghỉ việc",     cls: "cancelled" },
  leave:    { label: "Nghỉ phép",     cls: "pending"   },
};
const ROLE_MAP = {
  staff:      { label: "Nhân viên",      icon: "👤" },
  technician: { label: "Kỹ thuật viên",  icon: "🔧" },
  manager:    { label: "Quản lý",        icon: "👑" },
};
const TYPE_MAP = {
  full_time: { label: "Toàn thời gian", color: "#7c61ff" },
  part_time: { label: "Bán thời gian",  color: "#5bcad4" },
};
const TASK_STATUS = {
  pending:     { label: "Chưa bắt đầu", cls: "pending"   },
  in_progress: { label: "Đang làm",     cls: "confirmed" },
  done:        { label: "Hoàn thành",   cls: "completed" },
};
const ATT_STATUS = {
  present: { label: "Có mặt", cls: "att-present", icon: "✓" },
  late:    { label: "Đi trễ", cls: "att-late",    icon: "!" },
  absent:  { label: "Vắng",   cls: "att-absent",  icon: "✗" },
};
const ATTENDANCE_RECORDS_KEY = "admin_attendance_records";
const readAttendanceRecords = () => {
  try { return JSON.parse(localStorage.getItem(ATTENDANCE_RECORDS_KEY) || "[]"); } catch { return []; }
};

const getInitials = (name) => name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase();
const fmtSalary   = (type, n) => type === "part_time" ? `${n.toLocaleString()} ₫/giờ` : `${n.toLocaleString()} ₫/tháng`;
const getToday = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
};
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^(?:\+84|0)(?:3|5|7|8|9)\d{8}$/;
const EMPLOYEE_CODE_PATTERN = /^[A-Za-z0-9_-]{2,30}$/;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const normalizePhone = (value) => String(value || "").replace(/[\s.()-]/g, "");
const isFutureDate = (value) => Boolean(value && value > new Date().toISOString().slice(0, 10));

const EMPTY_STAFF = {
  userId: "", name: "", code: "", email: "", phone: "",
  dob: "", sex: "Nam", address: "",
  citizenId: "", idCardFront: "", idCardBack: "",
  cinemaId: "", departmentId: "",
  role: "staff", type: "full_time",
  salary: "", baseSalary: "",
  status: "active", hireDate: "",
  avatar: "",
  shifts: [], tasks: [], attendance: [],
};

const mapDepartmentId = (departmentName) => {
  const match = DEPARTMENTS.find((item) => item.name === departmentName);
  return match ? match.id : "";
};

const getStaffRoleFromPosition = (position) => {
  const normalized = String(position || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (normalized.includes("quan ly") || normalized.includes("manager")) return "manager";
  if (normalized.includes("ky thuat") || normalized.includes("technician") || normalized.includes("technical")) return "technician";
  return "staff";
};

const mapEmployeeToStaff = (employee) => ({
  id: employee.id,
  userId: employee.userId || "",
  name: employee.name || "",
  code: employee.code || "",
  email: employee.email || "",
  phone: employee.phone || "",
  dob: employee.dob || "",
  sex: employee.sex || "Nam",
  address: employee.address || "",
  citizenId: employee.citizenId || "",
  idCardFront: employee.idCardFrontUrl || "",
  idCardBack: employee.idCardBackUrl || "",
  avatar: employee.avatarUrl || employee.avatar || "",
  cinemaId: employee.cinemaId ?? "",
  departmentId: mapDepartmentId(employee.department) || "",
  role: getStaffRoleFromPosition(employee.position),
  type: employee.type || "full_time",
  salary: employee.salary ?? "",
  baseSalary: employee.salary ?? "",
  status: employee.status || "active",
  hireDate: employee.hireDate || "",
  shifts: Array.isArray(employee.shifts) ? employee.shifts : [],
  tasks: [],
  attendance: [],
  position: employee.position || "",
});

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="sf-toast">
      {message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Confirm ─────────────────────────────────────────────────────────────────
function Confirm({ message, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AdminModalPortal>
    <div className="sf-overlay" onClick={onClose}>
      <div className="sf-modal sf-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="sf-modal-header"><h2>Xác nhận</h2><button className="sf-modal-close" onClick={onClose}>✕</button></div>
        <div className="sf-modal-body"><div className="sf-warn">⚠️ {message}</div></div>
        <div className="sf-modal-footer">
          <button className="sf-btn sf-btn-delete sf-btn-lg" onClick={handleConfirm} disabled={isDeleting}>{isDeleting ? "Đang xóa..." : "Xác nhận"}</button>
          <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={onClose} disabled={isDeleting}>Hủy</button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

// ─── Staff Form ───────────────────────────────────────────────────────────────
function StaffForm({ staff, customerAccounts = [], onClose, onSave, canCreateManager = true, allowedCinemaId = null }) {
  const isEdit = !!staff;
  const [form, setForm] = useState(() => {
    const initial = staff ? { ...staff } : { ...EMPTY_STAFF };
    return !isEdit && allowedCinemaId !== null ? { ...initial, cinemaId: allowedCinemaId } : initial;
  });
  const [errors, setErrors] = useState({});
  const [avatarFile, setAvatarFile] = useState(null);
  const [idCardFrontFile, setIdCardFrontFile] = useState(null);
  const [idCardBackFile, setIdCardBackFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

  const toggleShift = (id) => set("shifts", form.shifts.includes(id) ? form.shifts.filter(s => s !== id) : [...form.shifts, id]);

  const handleAvatarFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrors(previous => ({ ...previous, avatar: "Ảnh đại diện phải là tệp hình ảnh." }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setErrors(previous => ({ ...previous, avatar: "Ảnh đại diện không được vượt quá 5MB." }));
      return;
    }
    setAvatarFile(file);
    set("avatar", URL.createObjectURL(file));
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    set("avatar", "");
  };
  const handleIdCardFile = (side, file) => {
    if (!file) return;
    const errorKey = side === "front" ? "idCardFront" : "idCardBack";
    if (!file.type.startsWith("image/")) {
      setErrors(previous => ({ ...previous, [errorKey]: "Ảnh CCCD phải là tệp hình ảnh." }));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setErrors(previous => ({ ...previous, [errorKey]: "Ảnh CCCD không được vượt quá 5MB." }));
      return;
    }
    if (side === "front") setIdCardFrontFile(file);
    else setIdCardBackFile(file);
    set(side === "front" ? "idCardFront" : "idCardBack", URL.createObjectURL(file));
  };

  const selectCustomerAccount = (userId) => {
    const account = customerAccounts.find((item) => String(item.user_id) === String(userId));
    if (!account) {
      set("userId", "");
      return;
    }
    setForm((previous) => ({
      ...previous,
      userId: account.user_id,
      name: account.full_name || previous.name,
      email: account.email || previous.email,
      phone: account.phone_number || previous.phone,
      dob: String(account.birthday || "").slice(0, 10),
      sex: account.sex || previous.sex,
      avatar: account.avatar || previous.avatar,
    }));
    setErrors((previous) => ({ ...previous, name: undefined, email: undefined, phone: undefined }));
  };

  const validate = () => {
    const e = {};
    const name = String(form.name || "").trim();
    const code = String(form.code || "").trim();
    const email = String(form.email || "").trim();
    const phone = normalizePhone(form.phone);
    const salary = Number(form.salary);
    if (!isEdit && !form.userId) e.userId = "Chọn tài khoản người dùng để tạo nhân viên.";
    if (!name) e.name = "Nhập họ tên.";
    else if (name.length < 2 || name.length > 100) e.name = "Họ tên phải từ 2 đến 100 ký tự.";
    if (isEdit && !code) e.code = "Nhập mã nhân viên.";
    else if (isEdit && !EMPLOYEE_CODE_PATTERN.test(code)) e.code = "Mã nhân viên chỉ gồm 2–30 chữ, số, gạch ngang hoặc gạch dưới.";
    if (!email) e.email = "Nhập email.";
    else if (!EMAIL_PATTERN.test(email)) e.email = "Email không hợp lệ.";
    if (!phone) e.phone = "Nhập số điện thoại.";
    else if (!PHONE_PATTERN.test(phone)) e.phone = "Số điện thoại Việt Nam không hợp lệ.";
    if (!form.cinemaId)        e.cinemaId = "Chọn rạp.";
    if (!form.departmentId)    e.departmentId = "Chọn bộ phận.";
    if (!Number.isFinite(salary) || salary <= 0) e.salary = "Mức lương phải lớn hơn 0.";
    else if (salary > 1_000_000_000) e.salary = "Mức lương không được vượt quá 1 tỷ đồng.";
    if (!form.hireDate)        e.hireDate = "Chọn ngày vào làm.";
    else if (isFutureDate(form.hireDate)) e.hireDate = "Ngày vào làm không được ở tương lai.";
    if (form.dob && !isValidBirthDate(form.dob)) e.dob = BIRTH_DATE_ERROR;
    if (form.citizenId && !/^\d{12}$/.test(String(form.citizenId))) e.citizenId = "CCCD phải gồm đúng 12 chữ số.";
    if (String(form.address || "").trim().length > 255) e.address = "Địa chỉ không được vượt quá 255 ký tự.";
    if (!Array.isArray(form.shifts) || form.shifts.length === 0) e.shifts = "Chọn ít nhất một ca.";
    return e;
  };

  const handleSave = async () => {
    if (isSaving) return;
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const data = {
      ...form,
      name: form.name.trim(),
      code: String(form.code || "").trim(),
      email: form.email.trim().toLowerCase(),
      phone: normalizePhone(form.phone),
      address: String(form.address || "").trim(),
      id: staff?.id || Date.now(),
      baseSalary: Number(form.salary),
      salary: Number(form.salary),
    };
    if (avatarFile) {
      data.avatarFile = avatarFile;
    }
    if (idCardFrontFile) data.idCardFrontFile = idCardFrontFile;
    if (idCardBackFile) data.idCardBackFile = idCardBackFile;
    setIsSaving(true);
    try {
      await onSave(data);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminModalPortal>
    <div className="sf-overlay" onClick={onClose}>
      <div className="sf-modal sf-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="sf-modal-header">
          <h2>{isEdit ? "Chỉnh sửa nhân viên" : "Thêm tài khoản nhân viên"}</h2>
          <button className="sf-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sf-modal-body">
          <div className="sf-form-grid">
            {/* Col 1 */}
            <div className="sf-form-col">
              <div className="sf-form-section-title">Thông tin cá nhân & hồ sơ</div>
              <div className="sf-field sf-account-field">
                <label>Tài khoản người dùng *</label>
                <select
                  className={errors.userId ? "error" : ""}
                  value={form.userId || ""}
                  onChange={(e) => selectCustomerAccount(e.target.value)}
                  disabled={isEdit}
                >
                  <option value="">-- Chọn tài khoản khách hàng để đồng bộ --</option>
                  {customerAccounts.map((account) => (
                    <option key={account.user_id} value={account.user_id}>
                      {account.full_name} · {account.email}
                    </option>
                  ))}
                </select>
                <small className="sf-account-hint">
                  {isEdit ? "Tài khoản liên kết không thể thay đổi khi đang chỉnh sửa." : "Tên, email, số điện thoại, ngày sinh và giới tính sẽ được điền tự động."}
                </small>
                {errors.userId && <span className="sf-error">{errors.userId}</span>}
              </div>
              <div className="sf-field-row">
                <div className="sf-field">
                  <label>Mã nhân viên</label>
                  <input
                    className={errors.code ? "error" : ""}
                    value={isEdit ? form.code : "Tự động tạo sau khi lưu"}
                    onChange={e => set("code", e.target.value)}
                    placeholder="Tự động tạo"
                    disabled={!isEdit}
                  />
                  {errors.code && <span className="sf-error">{errors.code}</span>}
                </div>
                <div className="sf-field">
                  <label>Họ và tên *</label>
                  <input className={errors.name ? "error" : ""} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Nguyễn Văn A…" />
                  {errors.name && <span className="sf-error">{errors.name}</span>}
                </div>
              </div>

              <div className="sf-field-row">
                <div className="sf-field">
                  <label>Email *</label>
                  <input type="email" className={errors.email ? "error" : ""} value={form.email} onChange={e => set("email", e.target.value)} placeholder="nv@sweetstar.vn" />
                  {errors.email && <span className="sf-error">{errors.email}</span>}
                </div>
                <div className="sf-field">
                  <label>Số điện thoại *</label>
                  <input className={errors.phone ? "error" : ""} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="09xxxxxxxx" />
                  {errors.phone && <span className="sf-error">{errors.phone}</span>}
                </div>
              </div>

              <div className="sf-field-row">
                <div className="sf-field">
                  <label>Ngày sinh</label>
                  <input type="date" className={errors.dob ? "error" : ""} value={form.dob} min={getBirthDateBounds().min} max={getBirthDateBounds().max} onChange={e => set("dob", e.target.value)} />
                  {errors.dob && <span className="sf-error">{errors.dob}</span>}
                </div>
                <div className="sf-field">
                  <label>Giới tính</label>
                  <select value={form.sex} onChange={e => set("sex", e.target.value)}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              <div className="sf-field">
                <label>Địa chỉ</label>
                <input className={errors.address ? "error" : ""} value={form.address} onChange={e => set("address", e.target.value)} placeholder="Số nhà, đường, quận, tỉnh…" />
                {errors.address && <span className="sf-error">{errors.address}</span>}
              </div>

              <div className="sf-field">
                <label>Số CCCD</label>
                <input className={errors.citizenId ? "error" : ""} value={form.citizenId} maxLength={12} inputMode="numeric" onChange={e => set("citizenId", e.target.value.replace(/\D/g, ""))} placeholder="12 chữ số" />
                {errors.citizenId && <span className="sf-error">{errors.citizenId}</span>}
              </div>

              <div className="sf-field">
                <label>Ảnh đại diện</label>
                <div
                  className="sf-avatar-upload-zone"
                  onClick={() => document.getElementById("avatar-file-input").click()}
                >
                  {form.avatar ? (
                    <>
                      <img src={form.avatar} alt="Avatar preview" className="sf-avatar-preview" />
                      <button
                        type="button"
                        className="sf-avatar-remove"
                        onClick={(e) => { e.stopPropagation(); removeAvatar(); }}
                      >✕</button>
                    </>
                  ) : (
                    <div className="sf-avatar-placeholder">
                      <span className="sf-avatar-icon">📸</span>
                      <span>Chọn ảnh đại diện</span>
                    </div>
                  )}
                </div>
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleAvatarFile(e.target.files?.[0])}
                />
                {errors.avatar && <span className="sf-error">{errors.avatar}</span>}
              </div>

              <div className="sf-field">
                <label>Ảnh CCCD (mặt trước / mặt sau)</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[['front', 'Mặt trước', form.idCardFront], ['back', 'Mặt sau', form.idCardBack]].map(([side, label, image]) => (
                    <label key={side} className="sf-avatar-upload-zone" style={{ minHeight: 112, cursor: "pointer" }}>
                      {image ? <img src={image} alt={`CCCD ${label}`} style={{ width: "100%", height: 108, objectFit: "cover", borderRadius: 9 }} /> : <div className="sf-avatar-placeholder"><span className="sf-avatar-icon">📇</span><span>{label}</span></div>}
                      <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleIdCardFile(side, e.target.files?.[0])} />
                    </label>
                  ))}
                </div>
                <small className="sf-account-hint">Ảnh dùng để đối chiếu hồ sơ nhân viên.</small>
                {errors.idCardFront && <span className="sf-error">Mặt trước: {errors.idCardFront}</span>}
                {errors.idCardBack && <span className="sf-error">Mặt sau: {errors.idCardBack}</span>}
              </div>

              <div className="sf-field sf-shifts-field">
                <label>Ca làm việc *</label>
                {errors.shifts && <span className="sf-error">{errors.shifts}</span>}
                <div className="sf-shift-check-group">
                  {SHIFTS.map(sh => (
                    <label key={sh.id} className={`sf-shift-chip${form.shifts.includes(sh.id) ? " checked" : ""}`}>
                      <input type="checkbox" checked={form.shifts.includes(sh.id)} onChange={() => toggleShift(sh.id)} />
                      <span>{sh.label}</span>
                      <span className="sf-shift-time">{sh.time}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Col 2 */}
            <div className="sf-form-col">
              <div className="sf-form-section-title">Thông tin công việc</div>
              <div className="sf-field-row">
                <div className="sf-field">
                  <label>Rạp phụ trách *</label>
                  <select className={errors.cinemaId ? "error" : ""} value={form.cinemaId} onChange={e => set("cinemaId", Number(e.target.value))} disabled={allowedCinemaId !== null}>
                    <option value="">-- Chọn rạp --</option>
                    {CINEMAS.filter(c => allowedCinemaId === null || c.id === Number(allowedCinemaId)).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.cinemaId && <span className="sf-error">{errors.cinemaId}</span>}
                </div>
                <div className="sf-field">
                  <label>Bộ phận *</label>
                  <select className={errors.departmentId ? "error" : ""} value={form.departmentId} onChange={e => set("departmentId", Number(e.target.value))}>
                    <option value="">-- Chọn bộ phận --</option>
                    {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  {errors.departmentId && <span className="sf-error">{errors.departmentId}</span>}
                </div>
              </div>

              <div className="sf-field-row">
                <div className="sf-field">
                  <label>Chức vụ</label>
                  <select value={form.role} onChange={e => set("role", e.target.value)}>
                    <option value="staff">Nhân viên</option>
                    <option value="technician">Kỹ thuật viên</option>
                    {canCreateManager && <option value="manager">Quản lý</option>}
                  </select>
                </div>
                <div className="sf-field">
                  <label>Hình thức</label>
                  <select value={form.type} onChange={e => set("type", e.target.value)}>
                    <option value="full_time">Toàn thời gian</option>
                    <option value="part_time">Bán thời gian</option>
                  </select>
                </div>
              </div>

              <div className="sf-field-row">
                <div className="sf-field">
                  <label>Mức lương * {form.type === "part_time" ? "(₫/giờ)" : "(₫/tháng)"}</label>
                  <input type="number" min={0} className={errors.salary ? "error" : ""} value={form.salary}
                    onChange={e => set("salary", e.target.value)} placeholder={form.type === "part_time" ? "45000" : "8500000"} />
                  {errors.salary && <span className="sf-error">{errors.salary}</span>}
                </div>
                <div className="sf-field">
                  <label>Trạng thái</label>
                  <select value={form.status} onChange={e => set("status", e.target.value)}>
                    <option value="active">Đang làm việc</option>
                    <option value="leave">Nghỉ phép</option>
                    <option value="inactive">Nghỉ việc</option>
                  </select>
                </div>
              </div>

              <div className="sf-field">
                <label>Ngày vào làm *</label>
                <input type="date" className={errors.hireDate ? "error" : ""} value={form.hireDate} onChange={e => set("hireDate", e.target.value)} />
                {errors.hireDate && <span className="sf-error">{errors.hireDate}</span>}
              </div>

              {/* Preview */}
              {form.name && (
                <div className="sf-preview-card">
                  <div className="sf-preview-avatar">
                    {form.avatar ? <img src={form.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(form.name)}
                  </div>
                  <div className="sf-preview-info">
                    <strong>{form.name}</strong>
                    <span>{ROLE_MAP[form.role]?.icon} {ROLE_MAP[form.role]?.label} · {TYPE_MAP[form.type]?.label}</span>
                    {form.salary && <span style={{ color: "#fbbf24" }}>{fmtSalary(form.type, Number(form.salary))}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="sf-modal-footer">
          <button className="sf-btn sf-btn-add sf-btn-lg" onClick={handleSave} disabled={isSaving}>{isSaving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm nhân viên"}</button>
          <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={onClose} disabled={isSaving}>Hủy</button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

// ─── Task Assign Modal ────────────────────────────────────────────────────────
function TaskModal({ staff, onClose, onSave }) {
  const [tasks, setTasks] = useState(staff ? [...staff.tasks] : []);
  const [form, setForm]   = useState({ title: "", status: "pending", deadline: "" });
  const [err, setErr]     = useState("");

  const addTask = () => {
    if (!form.title.trim()) { setErr("Nhập tên công việc."); return; }
    if (!form.deadline)     { setErr("Chọn hạn hoàn thành."); return; }
    setTasks(p => [...p, { ...form, id: Date.now() }]);
    setForm({ title: "", status: "pending", deadline: "" });
    setErr("");
  };

  const removeTask = (id) => setTasks(p => p.filter(t => t.id !== id));
  const updateTaskStatus = (id, status) => setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));

  return (
    <AdminModalPortal>
    <div className="sf-overlay" onClick={onClose}>
      <div className="sf-modal sf-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="sf-modal-header">
          <h2>Phân công công việc – {staff?.name}</h2>
          <button className="sf-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sf-modal-body">
          {/* Add task form */}
          <div className="sf-task-add-form">
            <div className="sf-field" style={{ flex: 2 }}>
              <label>Tên công việc *</label>
              <input value={form.title} onChange={e => { setForm(p => ({ ...p, title: e.target.value })); setErr(""); }}
                placeholder="Mô tả công việc cần làm…" />
            </div>
            <div className="sf-field">
              <label>Hạn hoàn thành *</label>
              <input type="date" value={form.deadline} onChange={e => { setForm(p => ({ ...p, deadline: e.target.value })); setErr(""); }} />
            </div>
            <div className="sf-field">
              <label>Trạng thái</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="pending">Chưa bắt đầu</option>
                <option value="in_progress">Đang làm</option>
              </select>
            </div>
            <button className="sf-btn sf-btn-add" style={{ marginTop: 22 }} onClick={addTask}>+ Thêm</button>
          </div>
          {err && <span className="sf-error">{err}</span>}

          {/* Task list */}
          <div className="sf-task-list">
            {tasks.length === 0 ? (
              <div className="sf-empty-tasks">Chưa có công việc nào được phân công.</div>
            ) : tasks.map(t => {
              const ts = TASK_STATUS[t.status] || TASK_STATUS.pending;
              return (
                <div key={t.id} className="sf-task-row">
                  <div className="sf-task-info">
                    <span className="sf-task-title">{t.title}</span>
                    <span className="sf-task-deadline">Hạn: {t.deadline}</span>
                  </div>
                  <select
                    className={`sf-task-status-sel status-pill ${ts.cls}`}
                    value={t.status}
                    onChange={e => updateTaskStatus(t.id, e.target.value)}
                  >
                    <option value="pending">Chưa bắt đầu</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="done">Hoàn thành</option>
                  </select>
                  <button className="sf-btn sf-btn-delete sm" onClick={() => removeTask(t.id)}>Xóa</button>
                </div>
              );
            })}
          </div>
        </div>
        <div className="sf-modal-footer">
          <button className="sf-btn sf-btn-add sf-btn-lg" onClick={() => onSave({ ...staff, tasks })}>Lưu phân công</button>
          <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

// ─── Attendance Modal ─────────────────────────────────────────────────────────
function AttendanceModal({ staff, onClose, onSave }) {
  const [records, setRecords] = useState(staff ? [...staff.attendance] : []);
  const [today, setToday] = useState(getToday);
  const [form, setForm] = useState({ date: getToday(), shiftId: "morning", status: "present" });
  const [err,  setErr]  = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setToday(getToday()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setForm((prev) => ({ ...prev, date: today }));
  }, [today]);

  const addRecord = () => {
    if (form.date !== today) { setErr("Chỉ được chấm công trong ngày hôm nay."); return; }
    if (records.find(r => r.date === form.date && r.shiftId === form.shiftId)) {
      setErr("Đã có bản ghi cho ca này trong ngày."); return;
    }
    setRecords(p => [form, ...p].sort((a, b) => b.date.localeCompare(a.date)));
    setErr("");
  };

  const totals = { present: 0, late: 0, absent: 0 };
  records.forEach(r => totals[r.status] = (totals[r.status] || 0) + 1);

  return (
    <AdminModalPortal>
    <div className="sf-overlay" onClick={onClose}>
      <div className="sf-modal sf-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="sf-modal-header">
          <h2>Chấm công – {staff?.name}</h2>
          <button className="sf-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sf-modal-body">
          {/* Summary */}
          <div className="sf-att-summary">
            <div className="sf-att-sum-item present"><span>Có mặt</span><strong>{totals.present}</strong></div>
            <div className="sf-att-sum-item late"><span>Đi trễ</span><strong>{totals.late}</strong></div>
            <div className="sf-att-sum-item absent"><span>Vắng</span><strong>{totals.absent}</strong></div>
            <div className="sf-att-sum-item total"><span>Tổng ca</span><strong>{records.length}</strong></div>
          </div>

          {/* Add record */}
          <div className="sf-task-add-form">
            <div className="sf-field">
              <label>Ngày hôm nay</label>
              <input type="date" value={today} readOnly aria-label="Ngày chấm công hôm nay" />
            </div>
            <div className="sf-field">
              <label>Ca làm việc</label>
              <select value={form.shiftId} onChange={e => setForm(p => ({ ...p, shiftId: e.target.value }))}>
                {SHIFTS.map(s => <option key={s.id} value={s.id}>{s.label} ({s.time})</option>)}
              </select>
            </div>
            <div className="sf-field">
              <label>Trạng thái</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="present">Có mặt</option>
                <option value="late">Đi trễ</option>
                <option value="absent">Vắng mặt</option>
              </select>
            </div>
            <button className="sf-btn sf-btn-add" style={{ marginTop: 22 }} onClick={addRecord}>+ Thêm</button>
          </div>
          {err && <span className="sf-error">{err}</span>}

          {/* Records */}
          <div className="table-card" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr><th>Ngày</th><th>Ca làm việc</th><th>Giờ ca</th><th>Trạng thái</th><th></th></tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", color: "#8fa6ff", padding: 24 }}>Chưa có dữ liệu chấm công.</td></tr>
                ) : records.map((r, i) => {
                  const sh = SHIFTS.find(s => s.id === r.shiftId);
                  const at = ATT_STATUS[r.status] || ATT_STATUS.present;
                  return (
                    <tr key={i}>
                      <td>{r.date}</td>
                      <td>{sh?.label}</td>
                      <td style={{ color: "#7a8fc0", fontSize: 13 }}>{sh?.time}</td>
                      <td><span className={`sf-att-badge ${at.cls}`}>{at.icon} {at.label}</span></td>
                      <td><button className="sf-btn sf-btn-delete sm" onClick={() => setRecords(p => p.filter((_, j) => j !== i))}>Xóa</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="sf-modal-footer">
          <button className="sf-btn sf-btn-add sf-btn-lg" onClick={() => onSave({ ...staff, attendance: records })}>Lưu chấm công</button>
          <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}

// ─── Staff Detail Modal ───────────────────────────────────────────────────────
function StaffDetail({ staff, onClose, onEdit, onTask, canManage = true }) {
  if (!staff) return null;
  const st  = STATUS_MAP[staff.status] || STATUS_MAP.active;
  const rl  = ROLE_MAP[staff.role]     || ROLE_MAP.staff;
  const tp  = TYPE_MAP[staff.type]     || TYPE_MAP.full_time;
  const dep = DEPARTMENTS.find(d => d.id === staff.departmentId);
  const cin = CINEMAS.find(c => c.id === staff.cinemaId);

  const totals = { present: 0, late: 0, absent: 0 };
  staff.attendance.forEach(r => totals[r.status] = (totals[r.status] || 0) + 1);

  const taskDone = staff.tasks.filter(t => t.status === "done").length;

  return (
    <AdminModalPortal>
    <div className="sf-overlay" onClick={onClose}>
      <div className="sf-modal sf-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="sf-modal-header">
          <h2>Hồ sơ nhân viên</h2>
          <button className="sf-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sf-modal-body">
          {/* Profile row */}
          <div className="sf-profile-row">
            <div className="sf-avatar-lg">
              {staff.avatar ? <img src={staff.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(staff.name)}
            </div>
            <div className="sf-profile-info">
              <h3>{staff.name} <span className="sf-code">({staff.code})</span></h3>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                <span className={`status-pill ${st.cls}`}>{st.label}</span>
                <span className="sf-role-chip">{rl.icon} {rl.label}</span>
                <span className="sf-type-chip" style={{ color: tp.color, background: tp.color + "22", borderColor: tp.color + "44" }}>{tp.label}</span>
              </div>
            </div>
          </div>

          <div className="sf-detail-grid">
            <div className="sf-detail-card">
              <h4>Thông tin cá nhân</h4>
              <div className="sf-detail-row"><span>Email</span><strong>{staff.email}</strong></div>
              <div className="sf-detail-row"><span>Điện thoại</span><strong>{staff.phone}</strong></div>
              <div className="sf-detail-row"><span>Ngày sinh</span><strong>{staff.dob || "—"}</strong></div>
              <div className="sf-detail-row"><span>Giới tính</span><strong>{staff.sex}</strong></div>
              <div className="sf-detail-row"><span>Số CCCD</span><strong>{staff.citizenId || "—"}</strong></div>
              <div className="sf-detail-row"><span>Địa chỉ</span><strong>{staff.address || "—"}</strong></div>
            </div>
            <div className="sf-detail-card">
              <h4>Thông tin công việc</h4>
              <div className="sf-detail-row"><span>Rạp</span><strong>{cin?.name || "—"}</strong></div>
              <div className="sf-detail-row"><span>Bộ phận</span><strong>{dep?.name || "—"}</strong></div>
              <div className="sf-detail-row"><span>Ngày vào làm</span><strong>{staff.hireDate}</strong></div>
              <div className="sf-detail-row"><span>Mức lương</span><strong style={{ color: "#fbbf24" }}>{fmtSalary(staff.type, staff.salary)}</strong></div>
              <div className="sf-detail-row">
                <span>Ca làm việc</span>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {staff.shifts.map(s => {
                    const sh = SHIFTS.find(x => x.id === s);
                    return <span key={s} className="sf-shift-tag">{sh?.label}</span>;
                  })}
                </div>
              </div>
            </div>
          </div>
          {(staff.idCardFront || staff.idCardBack) && (
            <div className="sf-detail-card" style={{ marginTop: 14 }}>
              <h4>Ảnh CCCD</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
                {staff.idCardFront && <a href={staff.idCardFront} target="_blank" rel="noreferrer"><img src={staff.idCardFront} alt="CCCD mặt trước" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10 }} /></a>}
                {staff.idCardBack && <a href={staff.idCardBack} target="_blank" rel="noreferrer"><img src={staff.idCardBack} alt="CCCD mặt sau" style={{ width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 10 }} /></a>}
              </div>
            </div>
          )}

          {/* Activity stats */}
          <div className="sf-activity-row">
            <div className="sf-act-card present">
              <div className="sf-act-num">{totals.present}</div>
              <div className="sf-act-label">Có mặt</div>
            </div>
            <div className="sf-act-card late">
              <div className="sf-act-num">{totals.late}</div>
              <div className="sf-act-label">Đi trễ</div>
            </div>
            <div className="sf-act-card absent">
              <div className="sf-act-num">{totals.absent}</div>
              <div className="sf-act-label">Vắng</div>
            </div>
            <div className="sf-act-card task">
              <div className="sf-act-num">{taskDone}/{staff.tasks.length}</div>
              <div className="sf-act-label">Công việc xong</div>
            </div>
          </div>

          {/* Recent tasks */}
          {staff.tasks.length > 0 && (
            <div className="sf-detail-card" style={{ marginTop: 14 }}>
              <h4>Công việc gần đây</h4>
              {staff.tasks.slice(0, 4).map(t => {
                const ts = TASK_STATUS[t.status] || TASK_STATUS.pending;
                return (
                  <div key={t.id} className="sf-task-mini-row">
                    <span className="sf-task-mini-title">{t.title}</span>
                    <span className="sf-task-mini-dead">Hạn: {t.deadline}</span>
                    <span className={`status-pill ${ts.cls}`} style={{ fontSize: 11 }}>{ts.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="sf-modal-footer">
          {canManage && <button className="sf-btn sf-btn-edit sf-btn-lg"   onClick={() => onEdit(staff)}>Sửa thông tin</button>}
          {canManage && <button className="sf-btn sf-btn-task sf-btn-lg"   onClick={() => onTask(staff)}>Phân công</button>}
          <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
    </AdminModalPortal>
  );
}


// ─── Staff List Tab ───────────────────────────────────────────────────────────
function StaffList({ staff, onView, onEdit, onTask, onDelete, canManage = true }) {
  const [search, setSearch]   = useState("");
  const [filterCinema, setFC] = useState("all");
  const [filterType,   setFT] = useState("all");
  const [filterStatus, setFS] = useState("all");
  const [filterDept,   setFD] = useState("all");

  const filtered = staff.filter(s => {
    const q = search.toLowerCase();
    const matchQ = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const matchC = filterCinema === "all" || String(s.cinemaId) === filterCinema;
    const matchT = filterType   === "all" || s.type   === filterType;
    const matchS = filterStatus === "all" || s.status === filterStatus;
    const matchD = filterDept   === "all" || String(s.departmentId) === filterDept;
    return matchQ && matchC && matchT && matchS && matchD;
  });
  const { page, setPage, totalPages, pageItems } = useAdminPagination(filtered);

  return (
    <div className="sf-section">
      <div className="sf-toolbar">
        <input className="sf-search" placeholder="Tìm tên, mã, email…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="sf-select" value={filterCinema} onChange={e => setFC(e.target.value)}>
          <option value="all">Tất cả rạp</option>
          {CINEMAS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="sf-select" value={filterDept} onChange={e => setFD(e.target.value)}>
          <option value="all">Tất cả bộ phận</option>
          {DEPARTMENTS.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="sf-select" value={filterType} onChange={e => setFT(e.target.value)}>
          <option value="all">Tất cả hình thức</option>
          <option value="full_time">Toàn thời gian</option>
          <option value="part_time">Bán thời gian</option>
        </select>
        <select className="sf-select" value={filterStatus} onChange={e => setFS(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang làm</option>
          <option value="leave">Nghỉ phép</option>
          <option value="inactive">Nghỉ việc</option>
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Bộ phận / Rạp</th>
              <th>Chức vụ</th>
              <th>Hình thức</th>
              <th>Mức lương</th>
              <th>Ca làm việc</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}>Không tìm thấy nhân viên nào.</td></tr>
            ) : pageItems.map(s => {
              const st  = STATUS_MAP[s.status] || STATUS_MAP.active;
              const rl  = ROLE_MAP[s.role]     || ROLE_MAP.staff;
              const tp  = TYPE_MAP[s.type]     || TYPE_MAP.full_time;
              const dep = DEPARTMENTS.find(d => d.id === s.departmentId);
              const cin = CINEMAS.find(c => c.id === s.cinemaId);
              return (
                <tr key={s.id}>
                  <td>
                    <div className="sf-user-cell">
                      <div className="sf-avatar-sm">
                        {s.avatar ? <img src={s.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(s.name)}
                      </div>
                      <div>
                        <strong>{s.name}</strong>
                        <span>{s.code} · {s.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ color: "#c0d0ff", fontSize: 13 }}>{dep?.name || "—"}</span>
                      <span style={{ color: "#7a8fc0", fontSize: 12 }}>{cin?.name || "—"}</span>
                    </div>
                  </td>
                  <td><span className="sf-role-chip">{rl.icon} {rl.label}</span></td>
                  <td><span className="sf-type-chip" style={{ color: tp.color, background: tp.color + "22", borderColor: tp.color + "44" }}>{tp.label}</span></td>
                  <td><span style={{ color: "#fbbf24", fontWeight: 600, fontSize: 13 }}>{fmtSalary(s.type, s.salary)}</span></td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {s.shifts.map(sh => {
                        const shift = SHIFTS.find(x => x.id === sh);
                        return <span key={sh} className="sf-shift-tag">{shift?.label}</span>;
                      })}
                    </div>
                  </td>
                  <td><span className={`status-pill ${st.cls}`}>{st.label}</span></td>
                  <td>
                    <div className="sf-actions">
                      <button className="sf-btn sf-btn-view"   onClick={() => onView(s)}>Xem</button>
                      {canManage && <button className="sf-btn sf-btn-edit"   onClick={() => onEdit(s)}>Sửa</button>}
                      {canManage && <button className="sf-btn sf-btn-task"   onClick={() => onTask(s)}>Việc</button>}
                      {canManage && <button className="sf-btn sf-btn-delete" onClick={() => onDelete(s)}>Xóa</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <AdminPagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={10} onPageChange={setPage} />
      <div className="sf-footer-count">Hiển thị <strong>{filtered.length}</strong> / {staff.length} nhân viên</div>
    </div>
  );
}

// ─── Attendance Overview Tab ──────────────────────────────────────────────────
function AttendanceOverview({ staff, onAttend, currentUserId, canAttendSelf = true, fixedCinemaId = null }) {
  const [filterCinema, setFC] = useState(fixedCinemaId == null ? "all" : String(fixedCinemaId));
  const [filterDate, setFD] = useState(getToday);

  const filtered = staff.filter(s => filterCinema === "all" || String(s.cinemaId) === filterCinema);

  return (
    <div className="sf-section">
      <div className="sf-toolbar">
        <select className="sf-select" value={filterCinema} onChange={e => setFC(e.target.value)} disabled={fixedCinemaId != null}>
          {fixedCinemaId == null && <option value="all">Tất cả rạp</option>}
          {CINEMAS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input
          type="date"
          className="sf-select"
          value={filterDate}
          onChange={event => setFD(event.target.value)}
          aria-label="Xem ngày chấm công"
        />
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Nhân viên</th>
              <th>Ca làm việc</th>
              <th>Tổng ca</th>
              <th>Có mặt</th>
              <th>Đi trễ</th>
              <th>Vắng mặt</th>
              <th>Tỷ lệ chuyên cần</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const att = filterDate
                ? s.attendance.filter(a => a.date === filterDate)
                : s.attendance;
              const total   = att.length;
              const present = att.filter(a => a.status === "present").length;
              const late    = att.filter(a => a.status === "late").length;
              const absent  = att.filter(a => a.status === "absent").length;
              const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
              return (
                <tr key={s.id}>
                  <td>
                    <div className="sf-user-cell">
                      <div className="sf-avatar-sm">
                        {s.avatar ? <img src={s.avatar} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(s.name)}
                      </div>
                      <div><strong>{s.name}</strong><span>{s.code}</span></div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {s.shifts.map(sh => {
                        const shift = SHIFTS.find(x => x.id === sh);
                        return <span key={sh} className="sf-shift-tag">{shift?.label}</span>;
                      })}
                    </div>
                  </td>
                  <td><strong>{total}</strong></td>
                  <td><span className="sf-att-badge att-present">✓ {present}</span></td>
                  <td><span className="sf-att-badge att-late">! {late}</span></td>
                  <td><span className="sf-att-badge att-absent">✗ {absent}</span></td>
                  <td>
                    <div className="sf-att-rate-wrap">
                      <div className="sf-att-rate-bar" style={{ width: `${rate}%`, background: rate >= 80 ? "#4ade80" : rate >= 60 ? "#fbbf24" : "#f87171" }} />
                      <span>{rate}%</span>
                    </div>
                  </td>
                  <td>
                    {(!canAttendSelf && Number(s.userId) === Number(currentUserId)) ? (
                      <span className="sf-att-self-label">Tài khoản của bạn</span>
                    ) : (
                      <button className="sf-btn sf-btn-attend sm" onClick={() => onAttend(s)}>Chấm công</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Task Overview Tab ────────────────────────────────────────────────────────
function TaskOverview({ staff }) {
  const allTasks = staff.flatMap(s => s.tasks.map(t => ({ ...t, staffName: s.name, staffCode: s.code })));
  const [filterStatus, setFS] = useState("all");
  const filtered = allTasks.filter(t => filterStatus === "all" || t.status === filterStatus);

  return (
    <div className="sf-section">
      <div className="sf-toolbar">
        <select className="sf-select" value={filterStatus} onChange={e => setFS(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chưa bắt đầu</option>
          <option value="in_progress">Đang làm</option>
          <option value="done">Hoàn thành</option>
        </select>
      </div>
      <div className="table-card">
        <table>
          <thead>
            <tr><th>Công việc</th><th>Nhân viên</th><th>Hạn hoàn thành</th><th>Trạng thái</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}>Không có công việc nào.</td></tr>
            ) : filtered.map(t => {
              const ts = TASK_STATUS[t.status] || TASK_STATUS.pending;
              return (
                <tr key={t.id}>
                  <td style={{ color: "#eef4ff" }}>{t.title}</td>
                  <td style={{ color: "#c0d0ff", fontSize: 13 }}>{t.staffName} ({t.staffCode})</td>
                  <td style={{ color: "#7a8fc0", fontSize: 13 }}>{t.deadline}</td>
                  <td><span className={`status-pill ${ts.cls}`}>{ts.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sf-footer-count">Tổng: <strong>{filtered.length}</strong> / {allTasks.length} công việc</div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminStaff() {
  const reduxProfile = useSelector((state) => state.user.profile);
  const profile = { ...(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })(), ...(reduxProfile || {}) };
  const role = String(profile.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const isManager = role === "manager" || (role === "employee" && /quản lý|quan ly|manager/i.test(String(profile.employee_position || profile.position || "")));
  const canManageStaff = isAdmin || isManager;
  const [staffList, setStaffList] = useState(() => {
    return [];
  });
  const [managerCinemaId, setManagerCinemaId] = useState(isManager ? undefined : null);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [activeTab,  setActiveTab]  = useState("list");

  const [viewStaff,   setViewStaff]   = useState(null);
  const [editStaff,   setEditStaff]   = useState(undefined); // undefined=closed, null=new
  const [taskStaff,   setTaskStaff]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  const loadEmployees = async () => {
    try {
      const response = await adminEmployeeService.getAll();
      const serverEmployees = (response?.employees || []).map(mapEmployeeToStaff);
      setStaffList(serverEmployees);
      if (isManager) {
        const currentManager = serverEmployees.find((staff) => Number(staff.userId) === Number(profile.id || profile.userId));
        setManagerCinemaId(currentManager?.cinemaId ?? null);
      }
    } catch (err) {
      showToast(`Không thể tải dữ liệu nhân viên: ${err.message}`);
    }
  };

  useEffect(() => {
    loadEmployees();
    adminUserService.getAllUsers()
      .then((response) => setCustomerAccounts(
        (response?.users || []).filter((user) => String(user?.role || "").toLowerCase() === "user"),
      ))
      .catch((err) => showToast(`Không thể tải tài khoản người dùng: ${err.message}`));
  }, []);

  const handleSave = async (data) => {
    const isManagedStaff = staffList.some((staff) => staff.id === data.id
      && Number(staff.userId) !== Number(profile.id || profile.userId)
      && staff.role !== "manager"
      && Number(staff.cinemaId) === Number(managerCinemaId));
    if (isManager && (managerCinemaId === null || managerCinemaId === undefined || (data.id && !isManagedStaff) || data.role === "manager")) {
      showToast("Quản lý chỉ được thêm hoặc sửa nhân viên cấp dưới.");
      return;
    }
    try {
      const { id, avatarFile, idCardFrontFile, idCardBackFile, ...rest } = data;
      let payload = { ...rest };

      if (data.avatar) {
        payload.avatarUrl = data.avatar;
      }

      payload.code = (payload.code || "").trim();
      payload.name = (payload.name || "").trim();
      payload.email = (payload.email || "").trim();
      payload.phone = (payload.phone || "").trim();
      if (isManager) payload.role = payload.role === "technician" ? "technician" : "staff";
      payload.position = payload.role === "manager"
        ? "Quản lý"
        : payload.role === "technician"
          ? "Kỹ thuật viên"
          : "Nhân viên";
      payload.department = DEPARTMENTS.find((item) => item.id === Number(payload.departmentId))?.name || "";
      payload.cinemaId = isManager ? Number(managerCinemaId) : (payload.cinemaId ? Number(payload.cinemaId) : null);
      payload.type = payload.type || "full_time";
      payload.status = payload.status || "active";
      payload.salary = Number(payload.salary || 0);
      payload.shifts = Array.isArray(payload.shifts) ? payload.shifts : [];
      payload.hireDate = payload.hireDate || null;
      payload.dob = payload.dob || null;
      payload.sex = payload.sex || "Nam";
      payload.address = payload.address || "";

      if (id && String(id).length < 12) {
        await adminEmployeeService.update(id, payload, { avatarFile, idCardFrontFile, idCardBackFile });
        showToast(`Đã cập nhật nhân viên "${payload.name}".`);
      } else {
        const created = await adminEmployeeService.create(payload, { avatarFile, idCardFrontFile, idCardBackFile });
        if (created?.employee?.id) {
          payload.id = created.employee.id;
        }
        showToast(`Đã thêm nhân viên "${payload.name}".`);
      }

      await loadEmployees();
      setEditStaff(undefined);
      setViewStaff(null);
    } catch (err) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  const handleSaveTasks = (data) => {
    const updatedList = staffList.map(s => s.id === data.id ? data : s);
    setStaffList(updatedList);
    showToast(`Đã cập nhật phân công cho "${data.name}".`);
    setTaskStaff(null); setViewStaff(null);
  };

  const handleConfirmDelete = async () => {
    try {
      if (isManager && (!deleteTarget || Number(deleteTarget.userId) === Number(profile.id || profile.userId) || deleteTarget.role === "manager" || Number(deleteTarget.cinemaId) !== Number(managerCinemaId))) {
        showToast("Quản lý không được xóa tài khoản quản lý.");
        setDeleteTarget(null);
        return;
      }
      await adminEmployeeService.delete(deleteTarget.id);
      await loadEmployees();
      showToast(`Đã xóa nhân viên "${deleteTarget.name}".`);
      setDeleteTarget(null);
    } catch (err) {
      showToast(`Lỗi: ${err.message}`);
    }
  };

  const openEdit = (s) => {
    if (isManager && (Number(s.userId) === Number(profile.id || profile.userId) || s.role === "manager" || Number(s.cinemaId) !== Number(managerCinemaId))) return;
    setViewStaff(null);
    setEditStaff(s);
  };
  const openTask = (s) => { setViewStaff(null); setTaskStaff(s); };

  const visibleStaffList = isManager
    ? staffList.filter((staff) => managerCinemaId !== undefined
      && Number(staff.cinemaId) === Number(managerCinemaId)
      && Number(staff.userId) !== Number(profile.id || profile.userId)
      && staff.role !== "manager")
    : staffList;

  const stats = [
    { label: "Tổng nhân viên",   value: visibleStaffList.length,                                      color: "#7c61ff" },
    { label: "Đang làm việc",    value: visibleStaffList.filter(s => s.status === "active").length,  color: "#4ade80" },
    { label: "Toàn thời gian",   value: visibleStaffList.filter(s => s.type === "full_time").length, color: "#5bcad4" },
    { label: "Bán thời gian",    value: visibleStaffList.filter(s => s.type === "part_time").length, color: "#fbbf24" },
  ];

  const TABS = [
    { key: "list",  label: "Danh sách nhân viên" },
    { key: "tasks", label: "Tổng quan công việc" },
  ];

  return (
    <div className="admin-staff-page">
      <div className="sf-page-header">
        <div>
          <h2>Quản lý nhân viên</h2>
          <p>Quản lý tài khoản, phân công, chấm công ca và mức lương nhân viên</p>
        </div>
        {canManageStaff && <button className="sf-btn sf-btn-add sf-btn-lg" onClick={() => setEditStaff(null)}>+ Thêm nhân viên</button>}
      </div>

      <div className="sf-stats-row">
        {stats.map(s => (
          <div className="sf-stat-pill" key={s.label}>
            <span>{s.label}</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>

      <div className="sf-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`sf-tab${activeTab === t.key ? " active" : ""}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "list"       && <StaffList staffList={visibleStaffList} staff={visibleStaffList} onView={setViewStaff} onEdit={openEdit} onTask={openTask} onDelete={setDeleteTarget} canManage={canManageStaff} />}
      {activeTab === "tasks"      && <TaskOverview staff={visibleStaffList} />}

      {viewStaff   && <StaffDetail staff={viewStaff} onClose={() => setViewStaff(null)} onEdit={openEdit} onTask={openTask} canManage={canManageStaff} />}
      {editStaff  !== undefined && <StaffForm  staff={editStaff} customerAccounts={customerAccounts} onClose={() => setEditStaff(undefined)} onSave={handleSave} canCreateManager={isAdmin} allowedCinemaId={isManager ? managerCinemaId : null} />}
      {taskStaff   && <TaskModal   staff={taskStaff}   onClose={() => setTaskStaff(null)}   onSave={handleSaveTasks} />}
      {deleteTarget && <Confirm message={`Xóa nhân viên "${deleteTarget.name}"? Hành động này không thể hoàn tác.`} onClose={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}

export function AdminAttendance() {
  const [staffList, setStaffList] = useState([]);
  const [managerCinemaId, setManagerCinemaId] = useState(undefined);
  const [attendStaff, setAttendStaff] = useState(null);
  const [toast, setToast] = useState("");
  const [profile] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  });
  const role = String(profile.role || "").toLowerCase();
  const isManager = role === "manager" || (role === "employee" && /quản lý|quan ly|manager/i.test(String(profile.employee_position || profile.position || "")));

  const showToast = (message) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  };

  const handleSaveAttend = (data) => {
    setStaffList((current) => current.map((staff) => staff.id === data.id ? data : staff));
    setAttendStaff(null);
    showToast(`Đã cập nhật chấm công cho "${data.name}".`);
  };

  useEffect(() => {
    const loadAttendance = () => adminEmployeeService.getAll()
      .then((response) => {
        const records = readAttendanceRecords();
        const employees = (response?.employees || []).map((employee) => {
          const staff = mapEmployeeToStaff(employee);
          return {
            ...staff,
            attendance: records
              .filter((record) => Number(record.employeeId) === Number(staff.userId) || Number(record.employeeId) === Number(staff.id))
              .map(({ id, employeeId, ...record }) => ({ id, ...record })),
          };
        });
        if (isManager) {
          const currentManager = employees.find((staff) => Number(staff.userId) === Number(profile.id || profile.userId || profile.user_id));
          setManagerCinemaId(currentManager?.cinemaId ?? null);
        }
        setStaffList(employees);
      });
    loadAttendance()
      .catch((err) => showToast(`Không thể tải dữ liệu chấm công: ${err.message}`));
    const timer = window.setInterval(loadAttendance, 30000);
    window.addEventListener("storage", loadAttendance);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("storage", loadAttendance);
    };
  }, [isManager, profile.id, profile.userId, profile.user_id]);

  return (
    <div className="admin-staff-page">
      <div className="sf-page-header">
        <div>
          <h2>Chấm công nhân viên</h2>
          <p>Theo dõi chấm công theo ngày hôm nay và theo từng rạp</p>
        </div>
      </div>
      <AttendanceOverview
        staff={isManager
          ? staffList.filter((staff) => Number(staff.cinemaId) === Number(managerCinemaId)
            && Number(staff.userId) !== Number(profile.id || profile.userId || profile.user_id)
            && staff.role !== "manager")
          : staffList}
        onAttend={setAttendStaff}
        currentUserId={profile.id || profile.userId || profile.user_id}
        canAttendSelf={String(profile.role || "").toLowerCase() === "admin"}
        fixedCinemaId={isManager ? managerCinemaId : null}
      />
      {attendStaff && (
        <AttendanceModal
          staff={attendStaff}
          onClose={() => setAttendStaff(null)}
          onSave={handleSaveAttend}
        />
      )}
      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
