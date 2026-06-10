import { useState } from "react";

// ─── Sample Data ──────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { id: 1, name: "Vé & Quầy thu ngân" },
  { id: 2, name: "Kỹ thuật chiếu phim" },
  { id: 3, name: "Phục vụ & F&B" },
  { id: 4, name: "Bảo vệ & An ninh" },
  { id: 5, name: "Quản lý rạp" },
];

const CINEMAS = [
  { id: 1, name: "Lunexa CGV Hà Nội" },
  { id: 2, name: "Lunexa Lotte TP.HCM" },
  { id: 3, name: "Lunexa CGV Đà Nẵng" },
  { id: 4, name: "Lunexa BHD TP.HCM" },
];

const SHIFTS = [
  { id: "morning",   label: "Ca sáng",  time: "06:00 – 14:00" },
  { id: "afternoon", label: "Ca chiều", time: "14:00 – 22:00" },
  { id: "night",     label: "Ca đêm",   time: "22:00 – 06:00" },
];

const SAMPLE_STAFF = [
  {
    id: 1, name: "Trần Văn Bình", code: "NV001",
    email: "binh.tran@lunexa.vn", phone: "0901111001",
    dob: "1998-04-12", sex: "Nam", address: "Hà Nội",
    avatar: "",
    cinemaId: 1, departmentId: 1,
    role: "staff", type: "full_time",
    salary: 8500000, baseSalary: 8500000,
    status: "active",
    hireDate: "2024-01-15",
    shifts: ["morning", "afternoon"],
    tasks: [
      { id: 1, title: "Phụ trách quầy vé buổi sáng",    status: "done",    deadline: "08/06/2026" },
      { id: 2, title: "Kiểm tra máy bán vé tự động",   status: "pending", deadline: "10/06/2026" },
    ],
    attendance: [
      { date: "2026-06-01", shiftId: "morning",   status: "present" },
      { date: "2026-06-02", shiftId: "morning",   status: "present" },
      { date: "2026-06-03", shiftId: "afternoon", status: "late"    },
      { date: "2026-06-04", shiftId: "morning",   status: "absent"  },
      { date: "2026-06-05", shiftId: "morning",   status: "present" },
    ],
  },
  {
    id: 2, name: "Lê Thị Hương", code: "NV002",
    email: "huong.le@lunexa.vn", phone: "0901111002",
    dob: "2000-09-22", sex: "Nữ", address: "TP.HCM",
    avatar: "",
    cinemaId: 2, departmentId: 3,
    role: "staff", type: "part_time",
    salary: 45000, baseSalary: 45000,
    status: "active",
    hireDate: "2025-03-01",
    shifts: ["afternoon"],
    tasks: [
      { id: 3, title: "Phục vụ khu vực F&B tầng 2",    status: "in_progress", deadline: "09/06/2026" },
      { id: 4, title: "Kiểm kê tồn kho đồ ăn nhẹ",     status: "pending",     deadline: "12/06/2026" },
    ],
    attendance: [
      { date: "2026-06-01", shiftId: "afternoon", status: "present" },
      { date: "2026-06-02", shiftId: "afternoon", status: "present" },
      { date: "2026-06-03", shiftId: "afternoon", status: "present" },
      { date: "2026-06-04", shiftId: "afternoon", status: "absent"  },
      { date: "2026-06-05", shiftId: "afternoon", status: "present" },
    ],
  },
  {
    id: 3, name: "Nguyễn Quốc Dũng", code: "NV003",
    email: "dung.nguyen@lunexa.vn", phone: "0901111003",
    dob: "1995-12-05", sex: "Nam", address: "Đà Nẵng",
    avatar: "",
    cinemaId: 3, departmentId: 2,
    role: "technician", type: "full_time",
    salary: 12000000, baseSalary: 12000000,
    status: "active",
    hireDate: "2023-08-10",
    shifts: ["morning", "afternoon", "night"],
    tasks: [
      { id: 5, title: "Bảo trì máy chiếu phòng IMAX",  status: "done",        deadline: "07/06/2026" },
      { id: 6, title: "Kiểm tra hệ thống âm thanh P02", status: "in_progress", deadline: "11/06/2026" },
    ],
    attendance: [
      { date: "2026-06-01", shiftId: "morning",   status: "present" },
      { date: "2026-06-02", shiftId: "morning",   status: "present" },
      { date: "2026-06-03", shiftId: "morning",   status: "present" },
      { date: "2026-06-04", shiftId: "morning",   status: "present" },
      { date: "2026-06-05", shiftId: "morning",   status: "present" },
    ],
  },
  {
    id: 4, name: "Phạm Thu Trang", code: "NV004",
    email: "trang.pham@lunexa.vn", phone: "0901111004",
    dob: "1997-06-18", sex: "Nữ", address: "TP.HCM",
    avatar: "",
    cinemaId: 4, departmentId: 5,
    role: "manager", type: "full_time",
    salary: 20000000, baseSalary: 20000000,
    status: "active",
    hireDate: "2022-11-01",
    shifts: ["morning", "afternoon"],
    tasks: [
      { id: 7, title: "Họp sơ kết tháng 6",                 status: "pending",     deadline: "15/06/2026" },
      { id: 8, title: "Phê duyệt lịch làm việc tháng 7",    status: "pending",     deadline: "20/06/2026" },
      { id: 9, title: "Đánh giá nhân viên quý 2",           status: "in_progress", deadline: "30/06/2026" },
    ],
    attendance: [
      { date: "2026-06-01", shiftId: "morning", status: "present" },
      { date: "2026-06-02", shiftId: "morning", status: "present" },
      { date: "2026-06-03", shiftId: "morning", status: "present" },
      { date: "2026-06-04", shiftId: "morning", status: "late"    },
      { date: "2026-06-05", shiftId: "morning", status: "present" },
    ],
  },
  {
    id: 5, name: "Hoàng Minh Khoa", code: "NV005",
    email: "khoa.hoang@lunexa.vn", phone: "0901111005",
    dob: "2002-03-30", sex: "Nam", address: "Hà Nội",
    avatar: "",
    cinemaId: 1, departmentId: 4,
    role: "staff", type: "part_time",
    salary: 40000, baseSalary: 40000,
    status: "inactive",
    hireDate: "2025-09-01",
    shifts: ["night"],
    tasks: [],
    attendance: [
      { date: "2026-06-01", shiftId: "night", status: "absent"  },
      { date: "2026-06-02", shiftId: "night", status: "absent"  },
      { date: "2026-06-03", shiftId: "night", status: "absent"  },
    ],
  },
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

const getInitials = (name) => name.split(" ").slice(-2).map(w => w[0]).join("").toUpperCase();
const fmtSalary   = (type, n) => type === "part_time" ? `${n.toLocaleString()} ₫/giờ` : `${n.toLocaleString()} ₫/tháng`;

const EMPTY_STAFF = {
  name: "", code: "", email: "", phone: "",
  dob: "", sex: "Nam", address: "",
  cinemaId: "", departmentId: "",
  role: "staff", type: "full_time",
  salary: "", baseSalary: "",
  status: "active", hireDate: "",
  shifts: [], tasks: [], attendance: [],
};

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
  return (
    <div className="sf-overlay" onClick={onClose}>
      <div className="sf-modal sf-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="sf-modal-header"><h2>Xác nhận</h2><button className="sf-modal-close" onClick={onClose}>✕</button></div>
        <div className="sf-modal-body"><div className="sf-warn">⚠️ {message}</div></div>
        <div className="sf-modal-footer">
          <button className="sf-btn sf-btn-delete sf-btn-lg" onClick={onConfirm}>Xác nhận</button>
          <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

// ─── Staff Form ───────────────────────────────────────────────────────────────
function StaffForm({ staff, onClose, onSave }) {
  const isEdit = !!staff;
  const [form, setForm] = useState(staff ? { ...staff } : { ...EMPTY_STAFF });
  const [errors, setErrors] = useState({});

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: undefined })); };

  const toggleShift = (id) => set("shifts", form.shifts.includes(id) ? form.shifts.filter(s => s !== id) : [...form.shifts, id]);

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = "Nhập họ tên.";
    if (!form.code.trim())     e.code     = "Nhập mã nhân viên.";
    if (!form.email.trim())    e.email    = "Nhập email.";
    if (!form.phone.trim())    e.phone    = "Nhập số điện thoại.";
    if (!form.cinemaId)        e.cinemaId = "Chọn rạp.";
    if (!form.departmentId)    e.departmentId = "Chọn bộ phận.";
    if (!form.salary || form.salary <= 0) e.salary = "Nhập mức lương.";
    if (!form.hireDate)        e.hireDate = "Chọn ngày vào làm.";
    if (form.shifts.length === 0) e.shifts = "Chọn ít nhất một ca.";
    return e;
  };

  const handleSave = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    onSave({ ...form, id: staff?.id || Date.now(), baseSalary: Number(form.salary), salary: Number(form.salary) });
  };

  return (
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
              <div className="sf-field-row">
                <div className="sf-field">
                  <label>Mã nhân viên *</label>
                  <input className={errors.code ? "error" : ""} value={form.code} onChange={e => set("code", e.target.value)} placeholder="NV001…" />
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
                  <input type="email" className={errors.email ? "error" : ""} value={form.email} onChange={e => set("email", e.target.value)} placeholder="nv@lunexa.vn" />
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
                  <input type="date" value={form.dob} onChange={e => set("dob", e.target.value)} />
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
                <input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Số nhà, đường, quận, tỉnh…" />
              </div>

              <div className="sf-field">
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
              <div className="sf-field-row">
                <div className="sf-field">
                  <label>Rạp phụ trách *</label>
                  <select className={errors.cinemaId ? "error" : ""} value={form.cinemaId} onChange={e => set("cinemaId", Number(e.target.value))}>
                    <option value="">-- Chọn rạp --</option>
                    {CINEMAS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
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
                    <option value="manager">Quản lý</option>
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
                  <div className="sf-preview-avatar">{getInitials(form.name)}</div>
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
          <button className="sf-btn sf-btn-add sf-btn-lg" onClick={handleSave}>{isEdit ? "Lưu thay đổi" : "Thêm nhân viên"}</button>
          <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
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
  );
}

// ─── Attendance Modal ─────────────────────────────────────────────────────────
function AttendanceModal({ staff, onClose, onSave }) {
  const [records, setRecords] = useState(staff ? [...staff.attendance] : []);
  const [form, setForm] = useState({ date: "", shiftId: "morning", status: "present" });
  const [err,  setErr]  = useState("");

  const addRecord = () => {
    if (!form.date) { setErr("Chọn ngày."); return; }
    if (records.find(r => r.date === form.date && r.shiftId === form.shiftId)) {
      setErr("Đã có bản ghi cho ca này trong ngày."); return;
    }
    setRecords(p => [form, ...p].sort((a, b) => b.date.localeCompare(a.date)));
    setErr("");
  };

  const totals = { present: 0, late: 0, absent: 0 };
  records.forEach(r => totals[r.status] = (totals[r.status] || 0) + 1);

  return (
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
              <label>Ngày *</label>
              <input type="date" value={form.date} onChange={e => { setForm(p => ({ ...p, date: e.target.value })); setErr(""); }} />
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
  );
}

// ─── Staff Detail Modal ───────────────────────────────────────────────────────
function StaffDetail({ staff, onClose, onEdit, onTask, onAttend }) {
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
    <div className="sf-overlay" onClick={onClose}>
      <div className="sf-modal sf-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="sf-modal-header">
          <h2>Hồ sơ nhân viên</h2>
          <button className="sf-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="sf-modal-body">
          {/* Profile row */}
          <div className="sf-profile-row">
            <div className="sf-avatar-lg">{getInitials(staff.name)}</div>
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
          <button className="sf-btn sf-btn-edit sf-btn-lg"   onClick={() => onEdit(staff)}>Sửa thông tin</button>
          <button className="sf-btn sf-btn-task sf-btn-lg"   onClick={() => onTask(staff)}>Phân công</button>
          <button className="sf-btn sf-btn-attend sf-btn-lg" onClick={() => onAttend(staff)}>Chấm công</button>
          <button className="sf-btn sf-btn-secondary sf-btn-lg" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── Staff List Tab ───────────────────────────────────────────────────────────
function StaffList({ staff, onView, onEdit, onTask, onAttend, onDelete }) {
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
            ) : filtered.map(s => {
              const st  = STATUS_MAP[s.status] || STATUS_MAP.active;
              const rl  = ROLE_MAP[s.role]     || ROLE_MAP.staff;
              const tp  = TYPE_MAP[s.type]     || TYPE_MAP.full_time;
              const dep = DEPARTMENTS.find(d => d.id === s.departmentId);
              const cin = CINEMAS.find(c => c.id === s.cinemaId);
              return (
                <tr key={s.id}>
                  <td>
                    <div className="sf-user-cell">
                      <div className="sf-avatar-sm">{getInitials(s.name)}</div>
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
                      <button className="sf-btn sf-btn-edit"   onClick={() => onEdit(s)}>Sửa</button>
                      <button className="sf-btn sf-btn-task"   onClick={() => onTask(s)}>Việc</button>
                      <button className="sf-btn sf-btn-attend" onClick={() => onAttend(s)}>Công</button>
                      <button className="sf-btn sf-btn-delete" onClick={() => onDelete(s)}>Xóa</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sf-footer-count">Hiển thị <strong>{filtered.length}</strong> / {staff.length} nhân viên</div>
    </div>
  );
}

// ─── Attendance Overview Tab ──────────────────────────────────────────────────
function AttendanceOverview({ staff }) {
  const [filterCinema, setFC] = useState("all");
  const [filterDate,   setFD] = useState("");

  const filtered = staff.filter(s => filterCinema === "all" || String(s.cinemaId) === filterCinema);

  return (
    <div className="sf-section">
      <div className="sf-toolbar">
        <select className="sf-select" value={filterCinema} onChange={e => setFC(e.target.value)}>
          <option value="all">Tất cả rạp</option>
          {CINEMAS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" className="sf-select" value={filterDate} onChange={e => setFD(e.target.value)} />
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
                      <div className="sf-avatar-sm">{getInitials(s.name)}</div>
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
  const [staffList, setStaffList] = useState(SAMPLE_STAFF);
  const [activeTab,  setActiveTab]  = useState("list");

  const [viewStaff,   setViewStaff]   = useState(null);
  const [editStaff,   setEditStaff]   = useState(undefined); // undefined=closed, null=new
  const [taskStaff,   setTaskStaff]   = useState(null);
  const [attendStaff, setAttendStaff] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3200); };

  const handleSave = (data) => {
    if (staffList.find(s => s.id === data.id)) {
      setStaffList(p => p.map(s => s.id === data.id ? data : s));
      showToast(`Đã cập nhật nhân viên "${data.name}".`);
    } else {
      setStaffList(p => [data, ...p]);
      showToast(`Đã thêm nhân viên "${data.name}".`);
    }
    setEditStaff(undefined);
    setViewStaff(null);
  };

  const handleSaveTasks = (data) => {
    setStaffList(p => p.map(s => s.id === data.id ? data : s));
    showToast(`Đã cập nhật phân công cho "${data.name}".`);
    setTaskStaff(null); setViewStaff(null);
  };

  const handleSaveAttend = (data) => {
    setStaffList(p => p.map(s => s.id === data.id ? data : s));
    showToast(`Đã cập nhật chấm công cho "${data.name}".`);
    setAttendStaff(null); setViewStaff(null);
  };

  const handleConfirmDelete = () => {
    setStaffList(p => p.filter(s => s.id !== deleteTarget.id));
    showToast(`Đã xóa nhân viên "${deleteTarget.name}".`);
    setDeleteTarget(null);
  };

  const openEdit = (s) => { setViewStaff(null); setEditStaff(s); };
  const openTask = (s) => { setViewStaff(null); setTaskStaff(s); };
  const openAtt  = (s) => { setViewStaff(null); setAttendStaff(s); };

  const stats = [
    { label: "Tổng nhân viên",   value: staffList.length,                                          color: "#7c61ff" },
    { label: "Đang làm việc",    value: staffList.filter(s => s.status === "active").length,        color: "#4ade80" },
    { label: "Toàn thời gian",   value: staffList.filter(s => s.type === "full_time").length,       color: "#5bcad4" },
    { label: "Bán thời gian",    value: staffList.filter(s => s.type === "part_time").length,       color: "#fbbf24" },
  ];

  const TABS = [
    { key: "list",       label: "Danh sách nhân viên"  },
    { key: "attendance", label: "Theo dõi chấm công"   },
    { key: "tasks",      label: "Tổng quan công việc"  },
  ];

  return (
    <div className="admin-staff-page">
      <div className="sf-page-header">
        <div>
          <h2>Quản lý nhân viên</h2>
          <p>Quản lý tài khoản, phân công, chấm công ca và mức lương nhân viên</p>
        </div>
        <button className="sf-btn sf-btn-add sf-btn-lg" onClick={() => setEditStaff(null)}>+ Thêm nhân viên</button>
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

      {activeTab === "list"       && <StaffList staffList={staffList} staff={staffList} onView={setViewStaff} onEdit={openEdit} onTask={openTask} onAttend={openAtt} onDelete={setDeleteTarget} />}
      {activeTab === "attendance" && <AttendanceOverview staff={staffList} />}
      {activeTab === "tasks"      && <TaskOverview staff={staffList} />}

      {viewStaff   && <StaffDetail staff={viewStaff} onClose={() => setViewStaff(null)} onEdit={openEdit} onTask={openTask} onAttend={openAtt} />}
      {editStaff  !== undefined && <StaffForm  staff={editStaff}  onClose={() => setEditStaff(undefined)} onSave={handleSave} />}
      {taskStaff   && <TaskModal   staff={taskStaff}   onClose={() => setTaskStaff(null)}   onSave={handleSaveTasks} />}
      {attendStaff && <AttendanceModal staff={attendStaff} onClose={() => setAttendStaff(null)} onSave={handleSaveAttend} />}
      {deleteTarget && <Confirm message={`Xóa nhân viên "${deleteTarget.name}"? Hành động này không thể hoàn tác.`} onClose={() => setDeleteTarget(null)} onConfirm={handleConfirmDelete} />}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
