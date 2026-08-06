import { useState, useEffect } from "react";
import { adminUserService } from "../services/adminApi.js";
import AdminPagination, { useAdminPagination } from "../components/AdminPagination.jsx";
import { BIRTH_DATE_ERROR, getBirthDateBounds, isValidBirthDate } from "../../utils/birthDate.js";
import "./users.css";

const MEMBERSHIP_LEVELS = [
  {
    id: 1,
    name: "Đồng",
    minPoints: 0,
    maxPoints: 499,
    color: "#cd7f32",
    discount: 0,
  },
  {
    id: 2,
    name: "Bạc",
    minPoints: 500,
    maxPoints: 1499,
    color: "#9ca3af",
    discount: 5,
  },
  {
    id: 3,
    name: "Vàng",
    minPoints: 1500,
    maxPoints: 2999,
    color: "#fbbf24",
    discount: 10,
  },
  {
    id: 4,
    name: "Kim Cương",
    minPoints: 3000,
    maxPoints: 99999,
    color: "#60a5fa",
    discount: 15,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  active: { label: "Hoạt động", cls: "confirmed" },
  inactive: { label: "Không hoạt động", cls: "pending" },
  blocked: { label: "Bị khóa", cls: "cancelled" },
};
const ROLE_MAP = {
  user: { label: "Khách hàng", cls: "role-user" },
  staff: { label: "Nhân viên", cls: "role-staff" },
  manager: { label: "Quản lý", cls: "role-manager" },
  technician: { label: "Kỹ thuật viên", cls: "role-technician" },
  admin: { label: "Quản trị viên", cls: "role-admin" },
};

function getMemberLevel(points) {
  return (
    [...MEMBERSHIP_LEVELS].reverse().find((l) => points >= l.minPoints) ||
    MEMBERSHIP_LEVELS[0]
  );
}
function formatMoney(n) {
  if (n === 0) return "—";
  const abs = Math.abs(n).toLocaleString("vi-VN");
  return (n < 0 ? "−" : "+") + abs + " ₫";
}
function getInitials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .slice(-2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustPointsUser, setAdjustPointsUser] = useState(null);
  const [resetPwUser, setResetPwUser] = useState(null);
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminUserService.getAllUsers();
      const processedUsers = data.users.map((u) => ({
        ...u,
        id: u.user_id,
        name: u.full_name,
        phone: u.phone_number,
        createdAt: new Date(u.created_at).toLocaleDateString("vi-VN"),
        points: u.points || 0,
        birthday: u.birthday || "N/A",
        sex: u.sex || "N/A",
        transactions: u.transactions || [],
        employee_position: u.employee_position || null,
      }));
      setUsers(processedUsers);
      setError(null);
    } catch (err) {
      setError("Không thể tải danh sách người dùng.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    if (!user.can_be_locked) return;
    try {
      if (user.status === "blocked") {
        await adminUserService.unlockUser(user.id);
      } else {
        await adminUserService.lockUser(user.id);
      }
      fetchUsers();
    } catch (error) {
      console.error("Failed to toggle user status", error);
    }
  };

  const handleAdjustPoints = (user) => {
    setAdjustPointsUser(user);
  };

  const handleResetPassword = (user) => {
    setResetPwUser(user);
  };

  if (loading)
    return (
      <div className="us-page">
        <h1>Quản lý người dùng</h1>
        <div>Đang tải...</div>
      </div>
    );
  if (error)
    return (
      <div className="us-page">
        <h1>Quản lý người dùng</h1>
        <div>{error}</div>
      </div>
    );

  return (
    <div className="us-page">
      <div className="us-page-header">
        <h1>Quản lý người dùng</h1>
        <button
          className="us-btn us-btn-primary"
          onClick={() => setCreateUserOpen(true)}
        >
          + Thêm người dùng
        </button>
      </div>

      <UserList
        users={users}
        onView={setSelectedUser}
        onToggleStatus={handleToggleStatus}
        onResetPassword={handleResetPassword}
      />

      <UserDetail
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onToggleStatus={handleToggleStatus}
        onAdjustPoints={handleAdjustPoints}
        onResetPassword={handleResetPassword}
      />

      {adjustPointsUser && (
        <AdjustPointsModal
          user={adjustPointsUser}
          onClose={() => setAdjustPointsUser(null)}
          onConfirm={() => {
            fetchUsers(); // Refresh list after adjusting points
            setAdjustPointsUser(null);
          }}
        />
      )}

      {resetPwUser && (
        <ResetPasswordModal
          user={resetPwUser}
          onClose={() => setResetPwUser(null)}
          onConfirm={() => setResetPwUser(null)}
        />
      )}

      {createUserOpen && (
        <CreateUserModal
          onClose={() => setCreateUserOpen(false)}
          onConfirm={() => {
            fetchUsers();
            setCreateUserOpen(false);
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 1. Danh sách khách hàng */
function UserList({ users, onView, onToggleStatus, onResetPassword }) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFS] = useState("all");
  const [filterRole, setFR] = useState("all");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.phone && u.phone.includes(q));
    const matchS = filterStatus === "all" || u.status === filterStatus;
    const matchR = filterRole === "all" || u.role === filterRole;
    return matchQ && matchS && matchR;
  });
  const { page, setPage, totalPages, pageItems } = useAdminPagination(filtered);

  return (
    <div className="us-section">
      <div className="us-toolbar">
        <input
          className="us-search"
          placeholder="Tìm tên, email, số điện thoại…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="us-select"
          value={filterStatus}
          onChange={(e) => setFS(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Không hoạt động</option>
          <option value="blocked">Bị khóa</option>
        </select>
        <select
          className="us-select"
          value={filterRole}
          onChange={(e) => setFR(e.target.value)}
        >
          <option value="all">Tất cả vai trò</option>
          <option value="user">Khách hàng</option>
          <option value="staff">Nhân viên</option>
          <option value="manager">Quản lý</option>
          <option value="technician">Kỹ thuật viên</option>
          <option value="admin">Quản trị viên</option>
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Liên hệ</th>
              <th>Vai trò</th>
              <th>Hạng thành viên</th>
              <th>Điểm</th>
              <th>Trạng thái</th>
              <th>Ngày tạo</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}
                >
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            ) : (
              pageItems.map((u) => {
                const st = STATUS_MAP[u.status] || STATUS_MAP.inactive;
                const rl = ROLE_MAP[u.role] || ROLE_MAP.user;
                const roleLabel = rl.label;
                const roleCls = rl.cls;
                const lvl = getMemberLevel(u.points);
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="us-user-cell">
                        <div
                          className="us-avatar"
                          style={{
                            background: `${lvl.color}22`,
                            color: lvl.color,
                          }}
                        >
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <strong>{u.name}</strong>
                          <span>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: "#9cb2ff", fontSize: 13 }}>
                        {u.phone || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className={`us-role-badge ${roleCls}`}>
                        {roleLabel}
                      </span>
                    </td>
                    <td>
                      <span
                        className="us-member-badge"
                        style={{
                          color: lvl.color,
                          borderColor: `${lvl.color}44`,
                          background: `${lvl.color}18`,
                        }}
                      >
                        ★ {lvl.name}
                      </span>
                    </td>
                    <td>
                      <span className="us-points">
                        {u.points.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "#7a8fc0", fontSize: 13 }}>
                        {u.createdAt}
                      </span>
                    </td>
                    <td>
                      <div className="us-actions">
                        <button
                          className="us-btn us-btn-view"
                          onClick={() => onView(u)}
                        >
                          Chi tiết
                        </button>
                        <button
                          className="us-btn us-btn-secondary"
                          onClick={() => onResetPassword(u)}
                        >
                          Cấp lại MK
                        </button>
                        {u.can_be_locked && (
                          <button
                            className={`us-btn ${u.status === "blocked" ? "us-btn-unblock" : "us-btn-block"}`}
                            onClick={() => onToggleStatus(u)}
                          >
                            {u.status === "blocked" ? "Mở khóa" : "Khóa"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <AdminPagination page={page} totalPages={totalPages} totalItems={filtered.length} pageSize={10} onPageChange={setPage} />
      <div className="us-footer-count">
        Hiển thị <strong>{filtered.length}</strong> / {users.length} người dùng
      </div>
    </div>
  );
}

/** Chi tiết người dùng (modal) */
function UserDetail({ user, onClose, onToggleStatus, onAdjustPoints, onResetPassword }) {
  if (!user) return null;
  const st = STATUS_MAP[user.status] || STATUS_MAP.inactive;
  const rl = ROLE_MAP[user.role] || ROLE_MAP.user;
  const roleLabel = rl.label;
  const roleCls = rl.cls;
  const lvl = getMemberLevel(user.points);
  const nextLvl = MEMBERSHIP_LEVELS.find((l) => l.minPoints > user.points);
  const pctToNext = nextLvl
    ? Math.round(
        ((user.points - lvl.minPoints) / (nextLvl.minPoints - lvl.minPoints)) *
          100,
      )
    : 100;

  return (
    <div className="us-modal-overlay" onClick={onClose}>
      <div className="us-modal" onClick={(e) => e.stopPropagation()}>
        <div className="us-modal-header">
          <h2>Chi tiết khách hàng</h2>
          <button className="us-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="us-modal-body">
          <div className="us-profile-row">
            <div
              className="us-avatar lg"
              style={{ background: `${lvl.color}22`, color: lvl.color }}
            >
              {getInitials(user.name)}
            </div>
            <div className="us-profile-info">
              <h3>{user.name}</h3>
              <span className={`us-role-badge ${roleCls}`}>{roleLabel}</span>
              <span
                className={`status-pill ${st.cls}`}
                style={{ marginLeft: 8 }}
              >
                {st.label}
              </span>
            </div>
          </div>

          <div className="us-detail-grid">
            <div className="us-detail-card">
              <h4>Thông tin cá nhân</h4>
              <div className="us-detail-row">
                <span>Email</span>
                <strong>{user.email}</strong>
              </div>
              <div className="us-detail-row">
                <span>Điện thoại</span>
                <strong>{user.phone}</strong>
              </div>
              <div className="us-detail-row">
                <span>Ngày sinh</span>
                <strong>{user.birthday}</strong>
              </div>
              <div className="us-detail-row">
                <span>Giới tính</span>
                <strong>{user.sex}</strong>
              </div>
              <div className="us-detail-row">
                <span>Ngày tạo</span>
                <strong>{user.createdAt}</strong>
              </div>
            </div>

            <div className="us-detail-card">
              <h4>Thành viên & Điểm</h4>
              <div className="us-member-showcase" style={{ "--mc": lvl.color }}>
                <div className="us-member-icon" style={{ color: lvl.color }}>
                  ★
                </div>
                <div>
                  <div className="us-member-lv" style={{ color: lvl.color }}>
                    {lvl.name}
                  </div>
                  <div className="us-member-pts">
                    {user.points.toLocaleString()} điểm
                  </div>
                </div>
              </div>
              {nextLvl && (
                <div className="us-progress-wrap">
                  <div className="us-progress-label">
                    <span>Tiến độ lên {nextLvl.name}</span>
                    <span style={{ color: nextLvl.color }}>{pctToNext}%</span>
                  </div>
                  <div className="us-progress-bar-bg">
                    <div
                      className="us-progress-bar-fill"
                      style={{ width: `${pctToNext}%`, background: lvl.color }}
                    />
                  </div>
                  <div className="us-progress-remain">
                    Còn {(nextLvl.minPoints - user.points).toLocaleString()}{" "}
                    điểm
                  </div>
                </div>
              )}
              <div className="us-detail-row" style={{ marginTop: 10 }}>
                <span>Ưu đãi hiện tại</span>
                <strong style={{ color: lvl.color }}>
                  Giảm {lvl.discount}%
                </strong>
              </div>
            </div>
          </div>

          <div className="us-detail-card" style={{ marginTop: 14 }}>
            <h4>Giao dịch gần đây</h4>
            {user.transactions.length > 0 ? (
              user.transactions.slice(0, 4).map((t) => (
                <div className="us-tx-mini-row" key={t.id}>
                  <span className="us-tx-mini-icon">
                    {t.type === "booking"
                      ? "🎟"
                      : t.type === "refund"
                        ? "↩"
                        : "⭐"}
                  </span>
                  <span className="us-tx-mini-desc">{t.desc}</span>
                  <span className="us-tx-mini-date">{t.date}</span>
                  <span
                    style={{
                      color: t.points > 0 ? "#fbbf24" : "#f87171",
                      fontWeight: 600,
                      fontSize: 12,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {t.points > 0 ? "+" : ""}
                    {t.points} pts
                  </span>
                </div>
              ))
            ) : (
              <p>Không có giao dịch nào.</p>
            )}
          </div>
        </div>
        <div className="us-modal-footer">
          {user.can_be_locked ? (
            <button
              className={`us-btn us-btn-lg ${user.status === "blocked" ? "us-btn-unblock" : "us-btn-block"}`}
              onClick={() => onToggleStatus(user)}
            >
              {user.status === "blocked"
                ? "Mở khóa tài khoản"
                : "Khóa tài khoản"}
            </button>
          ) : (
            <div style={{ color: "#fbbf71", padding: "10px 0", fontSize: 13 }}>
              Tài khoản quản trị viên gốc không thể bị khóa.
            </div>
          )}
          <button
            className="us-btn us-btn-secondary us-btn-lg"
            onClick={() => onResetPassword(user)}
          >
            Cấp lại mật khẩu
          </button>
          <button
            className="us-btn us-btn-view us-btn-lg"
            onClick={() => onAdjustPoints(user)}
          >
            Điều chỉnh điểm
          </button>
          <button
            className="us-btn us-btn-secondary us-btn-lg"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/** Modal điều chỉnh điểm */
function AdjustPointsModal({ user, onClose, onConfirm }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  if (!user) return null;
  const num = Number(delta);

  const handleSave = () => {
    if (!num || !reason) {
      setError("Vui lòng nhập số điểm và lý do.");
      return;
    }
    // onConfirm({ userId: user.id, delta: num, reason });
  };

  return (
    <div className="us-modal-overlay" onClick={onClose}>
      <div className="us-modal" onClick={(e) => e.stopPropagation()}>
        <div className="us-modal-header">
          <h2>Điều chỉnh điểm: {user.name}</h2>
          <button className="us-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="us-modal-body">
          <p>
            Điểm hiện tại: <strong>{user.points.toLocaleString()}</strong>
          </p>
          <input
            type="number"
            className="us-input"
            placeholder="Nhập số điểm cộng hoặc trừ (ví dụ: 100, -50)"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
          />
          <input
            type="text"
            className="us-input"
            placeholder="Lý do điều chỉnh"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {error && <p style={{ color: "red" }}>{error}</p>}
        </div>
        <div className="us-modal-footer">
          <button className="us-btn us-btn-primary" onClick={handleSave}>
            Lưu thay đổi
          </button>
          <button className="us-btn us-btn-secondary" onClick={onClose}>
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

/** Modal cấp lại mật khẩu - yêu cầu nhập đủ thông tin xác minh */
function ResetPasswordModal({ user, onClose, onConfirm }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    birthday: "",
    new_password: "",
    confirm_password: "",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) {
      setErrors((e) => ({ ...e, [k]: undefined }));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Nhập họ tên.";
    if (!form.email.trim()) e.email = "Nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ.";
    if (!form.phone.trim()) e.phone = "Nhập số điện thoại.";
    if (!form.birthday) e.birthday = "Chọn ngày sinh.";
    else if (!isValidBirthDate(form.birthday)) e.birthday = BIRTH_DATE_ERROR;
    if (!form.new_password) e.new_password = "Nhập mật khẩu mới.";
    else if (form.new_password.length < 6)
      e.new_password = "Mật khẩu mới ít nhất 6 ký tự.";
    if (!form.confirm_password) e.confirm_password = "Xác nhận mật khẩu mới.";
    else if (form.confirm_password !== form.new_password)
      e.confirm_password = "Mật khẩu xác nhận không trùng khớp.";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    setApiError("");
    setSuccess(false);
    try {
      await adminUserService.resetPassword(user.id, {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        birthday: form.birthday,
        new_password: form.new_password,
      });
      setSuccess(true);
      setTimeout(() => {
        onConfirm && onConfirm();
      }, 1200);
    } catch (err) {
      console.error("Failed to reset password", err);
      setApiError(
        err?.message || "Không thể cấp lại mật khẩu. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="us-modal-overlay" onClick={onClose}>
      <div
        className="us-modal us-modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="us-modal-header">
            <h2>Cấp lại mật khẩu: {user.name}</h2>
            <button
              type="button"
              className="us-modal-close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <div className="us-modal-body">
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(147,197,253,0.12)",
                color: "#93c5fd",
                fontSize: 13,
                marginBottom: 14,
              }}
            >
              ⓘ Vui lòng nhập đầy đủ thông tin cá nhân của khách hàng để xác
              minh trước khi cấp lại mật khẩu.
            </div>

            <div className="us-detail-grid">
              <div className="us-detail-card">
                <h4>Thông tin xác minh *</h4>
                <div className="us-form-field">
                  <label>Họ và tên</label>
                  <input
                    type="text"
                    className={`us-input ${errors.full_name ? "error" : ""}`}
                    placeholder="Trùng khớp với thông tin tài khoản"
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                  />
                  {errors.full_name && (
                    <span className="us-field-error">{errors.full_name}</span>
                  )}
                </div>

                <div className="us-form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    className={`us-input ${errors.email ? "error" : ""}`}
                    placeholder="Trùng khớp với thông tin tài khoản"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                  {errors.email && (
                    <span className="us-field-error">{errors.email}</span>
                  )}
                </div>

                <div className="us-form-field">
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    className={`us-input ${errors.phone ? "error" : ""}`}
                    placeholder="Trùng khớp với thông tin tài khoản"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                  {errors.phone && (
                    <span className="us-field-error">{errors.phone}</span>
                  )}
                </div>

                <div className="us-form-field">
                  <label>Ngày sinh</label>
                  <input
                    type="date"
                    className={`us-input ${errors.birthday ? "error" : ""}`}
                    value={form.birthday}
                    min={getBirthDateBounds().min}
                    max={getBirthDateBounds().max}
                    onChange={(e) => set("birthday", e.target.value)}
                  />
                  {errors.birthday && (
                    <span className="us-field-error">{errors.birthday}</span>
                  )}
                </div>
              </div>

              <div className="us-detail-card">
                <h4>Mật khẩu mới *</h4>
                <div className="us-form-field">
                  <label>Mật khẩu mới</label>
                  <input
                    type="password"
                    className={`us-input ${errors.new_password ? "error" : ""}`}
                    placeholder="Ít nhất 6 ký tự"
                    value={form.new_password}
                    onChange={(e) => set("new_password", e.target.value)}
                  />
                  {errors.new_password && (
                    <span className="us-field-error">
                      {errors.new_password}
                    </span>
                  )}
                </div>

                <div className="us-form-field">
                  <label>Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    className={`us-input ${errors.confirm_password ? "error" : ""}`}
                    placeholder="Nhập lại mật khẩu mới"
                    value={form.confirm_password}
                    onChange={(e) => set("confirm_password", e.target.value)}
                  />
                  {errors.confirm_password && (
                    <span className="us-field-error">
                      {errors.confirm_password}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {success && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(52,211,153,0.12)",
                  color: "#34d399",
                  fontSize: 13,
                }}
              >
                ✓ Cấp lại mật khẩu thành công. Đang đóng...
              </div>
            )}

            {apiError && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(248,113,113,0.12)",
                  color: "#f87171",
                  fontSize: 13,
                }}
              >
                {apiError}
              </div>
            )}
          </div>
          <div className="us-modal-footer">
            <button
              type="submit"
              className="us-btn us-btn-primary"
              disabled={submitting || success}
            >
              {submitting ? "Đang xử lý..." : "Xác nhận cấp lại"}
            </button>
            <button
              type="button"
              className="us-btn us-btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Modal tạo người dùng mới */
function CreateUserModal({ onClose, onConfirm }) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    birthday: "",
    sex: "",
    status: "active",
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) {
      setErrors((e) => ({ ...e, [k]: undefined }));
    }
  };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = "Nhập họ tên.";
    if (!form.email.trim()) e.email = "Nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "Email không hợp lệ.";
    if (!form.password) e.password = "Nhập mật khẩu.";
    else if (form.password.length < 6)
      e.password = "Mật khẩu ít nhất 6 ký tự.";
    if (form.birthday && !isValidBirthDate(form.birthday)) e.birthday = BIRTH_DATE_ERROR;
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    setApiError("");
    try {
      await adminUserService.createUser({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
        birthday: form.birthday || null,
        sex: form.sex || null,
        role: "user",
        status: form.status,
      });
      onConfirm && onConfirm();
    } catch (err) {
      console.error("Failed to create user", err);
      setApiError(err?.message || "Không thể tạo người dùng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="us-modal-overlay" onClick={onClose}>
      <div
        className="us-modal us-modal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
          <div className="us-modal-header">
            <h2>Thêm người dùng mới</h2>
            <button
              type="button"
              className="us-modal-close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <div className="us-modal-body">
            <p className="us-create-role-note">Tài khoản mới được tạo với vai trò Khách hàng. Vai trò sẽ tự đổi thành Nhân viên khi tài khoản được thêm vào danh sách nhân viên.</p>
            <div className="us-detail-grid">
              <div className="us-detail-card">
                <h4>Thông tin cơ bản *</h4>
                <div className="us-form-field">
                  <label>Họ và tên</label>
                  <input
                    type="text"
                    className={`us-input ${errors.full_name ? "error" : ""}`}
                    placeholder="Nguyễn Văn A"
                    value={form.full_name}
                    onChange={(e) => set("full_name", e.target.value)}
                  />
                  {errors.full_name && (
                    <span className="us-field-error">{errors.full_name}</span>
                  )}
                </div>

                <div className="us-form-field">
                  <label>Email</label>
                  <input
                    type="email"
                    className={`us-input ${errors.email ? "error" : ""}`}
                    placeholder="example@email.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                  {errors.email && (
                    <span className="us-field-error">{errors.email}</span>
                  )}
                </div>

                <div className="us-form-field">
                  <label>Mật khẩu</label>
                  <input
                    type="password"
                    className={`us-input ${errors.password ? "error" : ""}`}
                    placeholder="Ít nhất 6 ký tự"
                    value={form.password}
                    onChange={(e) => set("password", e.target.value)}
                  />
                  {errors.password && (
                    <span className="us-field-error">{errors.password}</span>
                  )}
                </div>

                <div className="us-form-field">
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    className="us-input"
                    placeholder="09xxxxxxxx"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
              </div>

              <div className="us-detail-card">
                <h4>Thông tin bổ sung</h4>
                <div className="us-form-field">
                  <label>Ngày sinh</label>
                  <input
                    type="date"
                    className="us-input"
                    value={form.birthday}
                    min={getBirthDateBounds().min}
                    max={getBirthDateBounds().max}
                    onChange={(e) => set("birthday", e.target.value)}
                  />
                </div>

                <div className="us-form-field">
                  <label>Giới tính</label>
                  <select
                    className="us-select"
                    value={form.sex}
                    onChange={(e) => set("sex", e.target.value)}
                  >
                    <option value="">Không chọn</option>
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </div>

                <div className="us-form-field">
                  <label>Trạng thái</label>
                  <select
                    className="us-select"
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                    <option value="blocked">Bị khóa</option>
                  </select>
                </div>
              </div>
            </div>

            {apiError && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  borderRadius: 8,
                  background: "rgba(248,113,113,0.12)",
                  color: "#f87171",
                  fontSize: 13,
                }}
              >
                {apiError}
              </div>
            )}
          </div>
          <div className="us-modal-footer">
            <button
              type="submit"
              className="us-btn us-btn-primary"
              disabled={submitting}
            >
              {submitting ? "Đang lưu..." : "Tạo người dùng"}
            </button>
            <button
              type="button"
              className="us-btn us-btn-secondary"
              onClick={onClose}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
