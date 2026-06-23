import { useState, useEffect } from "react";
import { adminUserService } from "../services/adminApi.js";
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
  const [activeTab, setActiveTab] = useState("list");
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustPointsUser, setAdjustPointsUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminUserService.getAllUsers(); // Correct function name
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
    const newStatus = user.status === "blocked" ? "active" : "blocked";
    try {
      if (newStatus === "blocked") {
        await adminUserService.deactivateUser(user.id);
      }
      // Note: You might need an 'activateUser' function in your service
      // For now, we just refresh the list to see the change
      fetchUsers();
    } catch (error) {
      console.error("Failed to toggle user status", error);
    }
  };

  const handleAdjustPoints = (user) => {
    setAdjustPointsUser(user);
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
      <h1>Quản lý người dùng</h1>
      <div className="us-tabs">
        <button
          className={activeTab === "list" ? "active" : ""}
          onClick={() => setActiveTab("list")}
        >
          Danh sách
        </button>
        {/* Other tabs can be added here */}
      </div>

      {activeTab === "list" && (
        <UserList
          users={users}
          onView={setSelectedUser}
          onToggleStatus={handleToggleStatus}
        />
      )}

      <UserDetail
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onToggleStatus={handleToggleStatus}
        onAdjustPoints={handleAdjustPoints}
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
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 1. Danh sách khách hàng */
function UserList({ users, onView, onToggleStatus }) {
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
              filtered.map((u) => {
                const st = STATUS_MAP[u.status] || STATUS_MAP.inactive;
                const rl = ROLE_MAP[u.role] || ROLE_MAP.user;
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
                      <span className={`us-role-badge ${rl.cls}`}>
                        {rl.label}
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
      <div className="us-footer-count">
        Hiển thị <strong>{filtered.length}</strong> / {users.length} người dùng
      </div>
    </div>
  );
}

/** Chi tiết người dùng (modal) */
function UserDetail({ user, onClose, onToggleStatus, onAdjustPoints }) {
  if (!user) return null;
  const st = STATUS_MAP[user.status] || STATUS_MAP.inactive;
  const rl = ROLE_MAP[user.role] || ROLE_MAP.user;
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
              <span className={`us-role-badge ${rl.cls}`}>{rl.label}</span>
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
