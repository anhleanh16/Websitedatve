import { useState, useEffect } from "react";
import { adminUserService } from '../services/adminApi.js';
import './users.css';

const MEMBERSHIP_LEVELS = [
  { id: 1, name: "Đồng",   minPoints: 0,    maxPoints: 499,  color: "#cd7f32", discount: 0  },
  { id: 2, name: "Bạc",    minPoints: 500,  maxPoints: 1499, color: "#9ca3af", discount: 5  },
  { id: 3, name: "Vàng",   minPoints: 1500, maxPoints: 2999, color: "#fbbf24", discount: 10 },
  { id: 4, name: "Kim Cương", minPoints: 3000, maxPoints: 99999, color: "#60a5fa", discount: 15 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  active:   { label: "Hoạt động", cls: "confirmed" },
  inactive: { label: "Không hoạt động", cls: "pending" },
  blocked:  { label: "Bị khóa",   cls: "cancelled" },
};
const ROLE_MAP = {
  user:  { label: "Khách hàng",    cls: "role-user"  },
  admin: { label: "Quản trị viên", cls: "role-admin" },
};

function getMemberLevel(points) {
  return [...MEMBERSHIP_LEVELS].reverse().find((l) => points >= l.minPoints) || MEMBERSHIP_LEVELS[0];
}
function formatMoney(n) {
  if (n === 0) return "—";
  const abs = Math.abs(n).toLocaleString("vi-VN");
  return (n < 0 ? "−" : "+") + abs + " ₫";
}
function getInitials(name) {
  return name.split(" ").slice(-2).map((w) => w[0]).join("").toUpperCase();
}
function isDefaultAdmin(user) {
  return user?.id === 1 && user?.role === 'admin';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** 1. Danh sách khách hàng */
function UserList({ users, onView, onToggleStatus }) {
  const [search, setSearch]     = useState("");
  const [filterStatus, setFS]   = useState("all");
  const [filterRole,   setFR]   = useState("all");

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.phone.includes(q);
    const matchS = filterStatus === "all" || u.status === filterStatus;
    const matchR = filterRole   === "all" || u.role   === filterRole;
    return matchQ && matchS && matchR;
  });

  return (
    <div className="us-section">
      <div className="us-toolbar">
        <input className="us-search" placeholder="Tìm tên, email, số điện thoại…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="us-select" value={filterStatus} onChange={(e) => setFS(e.target.value)}>
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Không hoạt động</option>
          <option value="blocked">Bị khóa</option>
        </select>
        <select className="us-select" value={filterRole} onChange={(e) => setFR(e.target.value)}>
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
              <tr><td colSpan={8} style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}>Không tìm thấy người dùng nào.</td></tr>
            ) : filtered.map((u) => {
              const st  = STATUS_MAP[u.status] || STATUS_MAP.inactive;
              const rl  = ROLE_MAP[u.role]     || ROLE_MAP.user;
              const lvl = getMemberLevel(u.points);
              return (
                <tr key={u.id}>
                  <td>
                    <div className="us-user-cell">
                      <div className="us-avatar" style={{ background: `${lvl.color}22`, color: lvl.color }}>{getInitials(u.name)}</div>
                      <div><strong>{u.name}</strong><span>{u.email}</span></div>
                    </div>
                  </td>
                  <td><span style={{ color: "#9cb2ff", fontSize: 13 }}>{u.phone}</span></td>
                  <td><span className={`us-role-badge ${rl.cls}`}>{rl.label}</span></td>
                  <td>
                    <span className="us-member-badge" style={{ color: lvl.color, borderColor: `${lvl.color}44`, background: `${lvl.color}18` }}>
                      ★ {lvl.name}
                    </span>
                  </td>
                  <td><span className="us-points">{u.points.toLocaleString()}</span></td>
                  <td><span className={`status-pill ${st.cls}`}>{st.label}</span></td>
                  <td><span style={{ color: "#7a8fc0", fontSize: 13 }}>{u.createdAt}</span></td>
                  <td>
                    <div className="us-actions">
                      <button className="us-btn us-btn-view" onClick={() => onView(u)}>Chi tiết</button>
                      {!isDefaultAdmin(u) && (
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
            })}
          </tbody>
        </table>
      </div>
      <div className="us-footer-count">Hiển thị <strong>{filtered.length}</strong> / {users.length} người dùng</div>
    </div>
  );
}

/** 2. Thành viên – bảng hạng & người dùng theo hạng */
function MembershipTab({ users }) {
  const [activeLvl, setActiveLvl] = useState(null);

  const levelUsers = (lvlId) =>
    users.filter((u) => getMemberLevel(u.points).id === lvlId);

  return (
    <div className="us-section">
      {/* Level cards */}
      <div className="us-level-grid">
        {MEMBERSHIP_LEVELS.map((lvl) => {
          const count = levelUsers(lvl.id).length;
          const isActive = activeLvl === lvl.id;
          return (
            <div
              key={lvl.id}
              className={`us-level-card${isActive ? " active" : ""}`}
              style={{ "--lvl-color": lvl.color }}
              onClick={() => setActiveLvl(isActive ? null : lvl.id)}
            >
              <div className="us-level-icon" style={{ color: lvl.color }}>★</div>
              <div className="us-level-name" style={{ color: lvl.color }}>{lvl.name}</div>
              <div className="us-level-range">{lvl.minPoints.toLocaleString()} – {lvl.maxPoints >= 99999 ? "∞" : lvl.maxPoints.toLocaleString()} điểm</div>
              <div className="us-level-count"><strong style={{ color: lvl.color }}>{count}</strong> thành viên</div>
              <div className="us-level-discount">Giảm giá: <strong style={{ color: lvl.color }}>{lvl.discount}%</strong></div>
            </div>
          );
        })}
      </div>

      {/* Members of selected level */}
      {activeLvl && (
        <div className="us-level-members">
          <div className="us-level-members-header">
            <span style={{ color: MEMBERSHIP_LEVELS.find(l=>l.id===activeLvl)?.color }}>
              ★ Thành viên hạng {MEMBERSHIP_LEVELS.find(l=>l.id===activeLvl)?.name}
            </span>
            <button className="us-btn us-btn-secondary" onClick={() => setActiveLvl(null)}>✕ Đóng</button>
          </div>
          <div className="table-card">
            <table>
              <thead>
                <tr><th>Thành viên</th><th>Điểm hiện tại</th><th>Trạng thái</th><th>Ngày tạo</th></tr>
              </thead>
              <tbody>
                {levelUsers(activeLvl).map((u) => {
                  const st = STATUS_MAP[u.status] || STATUS_MAP.inactive;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="us-user-cell">
                          <div className="us-avatar" style={{ background: `${MEMBERSHIP_LEVELS.find(l=>l.id===activeLvl)?.color}22`, color: MEMBERSHIP_LEVELS.find(l=>l.id===activeLvl)?.color }}>{getInitials(u.name)}</div>
                          <div><strong>{u.name}</strong><span>{u.email}</span></div>
                        </div>
                      </td>
                      <td><span className="us-points">{u.points.toLocaleString()}</span></td>
                      <td><span className={`status-pill ${st.cls}`}>{st.label}</span></td>
                      <td><span style={{ color: "#7a8fc0", fontSize: 13 }}>{u.createdAt}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/** 3. Điểm thưởng */
function PointsTab({ users, onAdjust }) {
  const [search, setSearch] = useState("");
  const sorted = [...users]
    .filter((u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.points - a.points);

  const maxPts = Math.max(...users.map((u) => u.points));

  return (
    <div className="us-section">
      <div className="us-toolbar">
        <input className="us-search" placeholder="Tìm thành viên…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="us-points-list">
        {sorted.map((u, i) => {
          const lvl = getMemberLevel(u.points);
          const pct = Math.round((u.points / maxPts) * 100);
          return (
            <div className="us-points-row" key={u.id}>
              <div className="us-points-rank" style={{ color: i < 3 ? ["#fbbf24","#9ca3af","#cd7f32"][i] : "#5a6e9e" }}>
                #{i + 1}
              </div>
              <div className="us-avatar sm" style={{ background: `${lvl.color}22`, color: lvl.color }}>{getInitials(u.name)}</div>
              <div className="us-points-info">
                <div className="us-points-name">
                  <strong>{u.name}</strong>
                  <span className="us-member-badge sm" style={{ color: lvl.color, borderColor: `${lvl.color}44`, background: `${lvl.color}18` }}>★ {lvl.name}</span>
                </div>
                <div className="us-points-bar-wrap">
                  <div className="us-points-bar" style={{ width: `${pct}%`, background: lvl.color }} />
                </div>
              </div>
              <div className="us-points-value" style={{ color: lvl.color }}>{u.points.toLocaleString()} pts</div>
              <button className="us-btn us-btn-view" onClick={() => onAdjust(u)}>Điều chỉnh</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 4. Lịch sử giao dịch */
function TransactionTab({ users }) {
  const [search, setSearch]   = useState("");
  const [filterType, setFT]   = useState("all");
  const [selectedUser, setSU] = useState("all");

  const allTx = users.flatMap((u) =>
    u.transactions.map((t) => ({ ...t, userName: u.name, userId: u.id }))
  );

  const filtered = allTx.filter((t) => {
    const q = search.toLowerCase();
    const matchQ = t.desc.toLowerCase().includes(q) || t.userName.toLowerCase().includes(q) || t.id.toLowerCase().includes(q);
    const matchT = filterType   === "all" || t.type === filterType;
    const matchU = selectedUser === "all" || String(t.userId) === selectedUser;
    return matchQ && matchT && matchU;
  });

  const TX_TYPE = {
    booking: { label: "Đặt vé",  cls: "tx-booking", icon: "🎟" },
    refund:  { label: "Hoàn vé", cls: "tx-refund",  icon: "↩"  },
    points:  { label: "Điểm",    cls: "tx-points",  icon: "⭐"  },
  };

  return (
    <div className="us-section">
      <div className="us-toolbar">
        <input className="us-search" placeholder="Tìm mã GD, mô tả, tên khách…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="us-select" value={filterType} onChange={(e) => setFT(e.target.value)}>
          <option value="all">Tất cả loại</option>
          <option value="booking">Đặt vé</option>
          <option value="refund">Hoàn vé</option>
          <option value="points">Điểm thưởng</option>
        </select>
        <select className="us-select" value={selectedUser} onChange={(e) => setSU(e.target.value)}>
          <option value="all">Tất cả khách hàng</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Mã GD</th>
              <th>Khách hàng</th>
              <th>Loại</th>
              <th>Mô tả</th>
              <th>Số tiền</th>
              <th>Điểm</th>
              <th>Ngày</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", color: "#8fa6ff", padding: 32 }}>Không có giao dịch nào.</td></tr>
            ) : filtered.map((t) => {
              const tp = TX_TYPE[t.type] || TX_TYPE.booking;
              return (
                <tr key={t.id}>
                  <td><span className="bk-code">{t.id}</span></td>
                  <td><span style={{ color: "#c0d0ff", fontSize: 13 }}>{t.userName}</span></td>
                  <td><span className={`us-tx-type ${tp.cls}`}>{tp.icon} {tp.label}</span></td>
                  <td><span style={{ color: "#b0c0e8", fontSize: 13 }}>{t.desc}</span></td>
                  <td>
                    <span style={{ color: t.amount > 0 ? "#4ade80" : t.amount < 0 ? "#f87171" : "#7a8fc0", fontWeight: 600, fontSize: 13 }}>
                      {formatMoney(t.amount)}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: t.points > 0 ? "#fbbf24" : "#f87171", fontWeight: 600, fontSize: 13 }}>
                      {t.points > 0 ? "+" : ""}{t.points} pts
                    </span>
                  </td>
                  <td><span style={{ color: "#7a8fc0", fontSize: 13 }}>{t.date}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="us-footer-count">Hiển thị <strong>{filtered.length}</strong> / {allTx.length} giao dịch</div>
    </div>
  );
}

/** Chi tiết người dùng (modal) */
function UserDetail({ user, onClose, onToggleStatus, onAdjustPoints }) {
  if (!user) return null;
  const st  = STATUS_MAP[user.status] || STATUS_MAP.inactive;
  const rl  = ROLE_MAP[user.role]     || ROLE_MAP.user;
  const lvl = getMemberLevel(user.points);
  const nextLvl = MEMBERSHIP_LEVELS.find((l) => l.minPoints > user.points);
  const pctToNext = nextLvl ? Math.round(((user.points - lvl.minPoints) / (nextLvl.minPoints - lvl.minPoints)) * 100) : 100;

  return (
    <div className="us-modal-overlay" onClick={onClose}>
      <div className="us-modal" onClick={(e) => e.stopPropagation()}>
        <div className="us-modal-header">
          <h2>Chi tiết khách hàng</h2>
          <button className="us-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="us-modal-body">
          {/* Profile */}
          <div className="us-profile-row">
            <div className="us-avatar lg" style={{ background: `${lvl.color}22`, color: lvl.color }}>{getInitials(user.name)}</div>
            <div className="us-profile-info">
              <h3>{user.name}</h3>
              <span className={`us-role-badge ${rl.cls}`}>{rl.label}</span>
              <span className={`status-pill ${st.cls}`} style={{ marginLeft: 8 }}>{st.label}</span>
            </div>
          </div>

          <div className="us-detail-grid">
            <div className="us-detail-card">
              <h4>Thông tin cá nhân</h4>
              <div className="us-detail-row"><span>Email</span><strong>{user.email}</strong></div>
              <div className="us-detail-row"><span>Điện thoại</span><strong>{user.phone}</strong></div>
              <div className="us-detail-row"><span>Ngày sinh</span><strong>{user.birthday}</strong></div>
              <div className="us-detail-row"><span>Giới tính</span><strong>{user.sex}</strong></div>
              <div className="us-detail-row"><span>Ngày tạo</span><strong>{user.createdAt}</strong></div>
            </div>

            <div className="us-detail-card">
              <h4>Thành viên & Điểm</h4>
              <div className="us-member-showcase" style={{ "--mc": lvl.color }}>
                <div className="us-member-icon" style={{ color: lvl.color }}>★</div>
                <div>
                  <div className="us-member-lv" style={{ color: lvl.color }}>{lvl.name}</div>
                  <div className="us-member-pts">{user.points.toLocaleString()} điểm</div>
                </div>
              </div>
              {nextLvl && (
                <div className="us-progress-wrap">
                  <div className="us-progress-label">
                    <span>Tiến độ lên {nextLvl.name}</span>
                    <span style={{ color: nextLvl.color }}>{pctToNext}%</span>
                  </div>
                  <div className="us-progress-bar-bg">
                    <div className="us-progress-bar-fill" style={{ width: `${pctToNext}%`, background: lvl.color }} />
                  </div>
                  <div className="us-progress-remain">Còn {(nextLvl.minPoints - user.points).toLocaleString()} điểm</div>
                </div>
              )}
              <div className="us-detail-row" style={{ marginTop: 10 }}><span>Ưu đãi hiện tại</span><strong style={{ color: lvl.color }}>Giảm {lvl.discount}%</strong></div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="us-detail-card" style={{ marginTop: 14 }}>
            <h4>Giao dịch gần đây</h4>
            {user.transactions.slice(0, 4).map((t) => (
              <div className="us-tx-mini-row" key={t.id}>
                <span className="us-tx-mini-icon">{t.type === "booking" ? "🎟" : t.type === "refund" ? "↩" : "⭐"}</span>
                <span className="us-tx-mini-desc">{t.desc}</span>
                <span className="us-tx-mini-date">{t.date}</span>
                <span style={{ color: t.points > 0 ? "#fbbf24" : "#f87171", fontWeight: 600, fontSize: 12, whiteSpace: "nowrap" }}>
                  {t.points > 0 ? "+" : ""}{t.points} pts
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="us-modal-footer">
          {!isDefaultAdmin(user) ? (
            <button className={`us-btn us-btn-lg ${user.status === "blocked" ? "us-btn-unblock" : "us-btn-block"}`} onClick={() => onToggleStatus(user)}>
              {user.status === "blocked" ? "Mở khóa tài khoản" : "Khóa tài khoản"}
            </button>
          ) : (
            <div style={{ color: '#fbbf71', padding: '10px 0', fontSize: 13 }}>
              Tài khoản admin mặc định không thể khóa/mở khóa.
            </div>
          )}
          <button className="us-btn us-btn-view us-btn-lg" onClick={() => onAdjustPoints(user)}>Điều chỉnh điểm</button>
          <button className="us-btn us-btn-secondary us-btn-lg" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}

/** Modal điều chỉnh điểm */
function AdjustPointsModal({ user, onClose, onConfirm }) {
  const [delta, setDelta]   = useState("");
  const [reason, setReason] = useState("");
  const [error, setError]   = useState("");
  if (!user) return null;
  const num = Number(delta);

  const handleSave = () => {
    if (!delta || isNaN(num) || num === 0) { setError("Nhập số điểm cần thay đổi (khác 0)."); return; }
    if (!reason.trim()) { setError("Vui lòng nhập lý do."); return; }
    onConfirm(user, num, reason);
  };

  return (
    <div className="us-modal-overlay" onClick={onClose}>
      <div className="us-modal us-modal-sm" onClick={(e) => e.stopPropagation()}>
        <div className="us-modal-header">
          <h2>Điều chỉnh điểm thưởng</h2>
          <button className="us-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="us-modal-body">
          <div className="us-adjust-info">
            <span>{user.name}</span>
            <strong style={{ color: getMemberLevel(user.points).color }}>{user.points.toLocaleString()} pts</strong>
          </div>
          <div className="us-field">
            <label>Số điểm thay đổi (+ thêm / − trừ)</label>
            <input type="number" placeholder="Ví dụ: 100 hoặc -50" value={delta}
              onChange={(e) => { setDelta(e.target.value); setError(""); }} />
            {delta && !isNaN(num) && num !== 0 && (
              <span style={{ fontSize: 12, color: "#8fa6ff" }}>
                Sau điều chỉnh: {(user.points + num).toLocaleString()} pts
              </span>
            )}
          </div>
          <div className="us-field">
            <label>Lý do *</label>
            <input placeholder="Nhập lý do…" value={reason}
              onChange={(e) => { setReason(e.target.value); setError(""); }} />
          </div>
          {error && <span className="us-error">{error}</span>}
        </div>
        <div className="us-modal-footer">
          <button className="us-btn us-btn-view us-btn-lg" onClick={handleSave}>Xác nhận</button>
          <button className="us-btn us-btn-secondary us-btn-lg" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/** Toast */
function Toast({ message, onClose }) {
  if (!message) return null;
  return (
    <div className="us-toast">
      {message}
      <button onClick={onClose}>✕</button>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const [users, setUsers]           = useState([]);
  const [activeTab, setActiveTab]   = useState("list");
  const [viewUser, setViewUser]     = useState(null);
  const [adjustUser, setAdjustUser] = useState(null);
  const [toast, setToast]           = useState("");
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const loadUsers = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await adminUserService.getAllUsers();
      const normalized = (data.users || []).map((user) => ({
        id: user.id,
        name: user.full_name || user.name || "—",
        email: user.email || "",
        phone: user.phone || "",
        birthday: user.birthday || "",
        sex: user.sex || "",
        avatar: user.avatar || "",
        role: user.role || user.role_name || (user.role_id === 1 ? "admin" : "user"),
        status: user.status || "inactive",
        points: Number(user.point ?? user.points ?? 0),
        createdAt: user.created_at ? new Date(user.created_at).toLocaleDateString("vi-VN") : (user.createdAt || ""),
        transactions: user.transactions || [],
      }));
      setUsers(normalized);
    } catch (err) {
      console.error('Failed to load admin users', err);
      setError('Không thể tải danh sách khách hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleToggleStatus = (u) => {
    if (u.id === 1) {
      showToast('Tài khoản admin mặc định không thể thay đổi trạng thái.');
      return;
    }

    const next = u.status === "blocked" ? "active" : "blocked";
    setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, status: next } : x));
    setViewUser((v) => v?.id === u.id ? { ...v, status: next } : v);
    showToast(`Đã ${next === "blocked" ? "khóa" : "mở khóa"} tài khoản ${u.name}.`);
  };

  const handleAdjustPoints = (u, delta, reason) => {
    const newPts = Math.max(0, u.points + delta);
    const tx = { id: `T${Date.now()}`, type: "points", desc: reason, amount: 0, points: delta, date: new Date().toLocaleDateString("vi-VN") };
    setUsers((prev) => prev.map((x) => x.id === u.id
      ? { ...x, points: newPts, transactions: [tx, ...x.transactions] }
      : x
    ));
    setViewUser((v) => v?.id === u.id ? { ...v, points: newPts, transactions: [tx, ...v.transactions] } : v);
    setAdjustUser(null);
    showToast(`Đã ${delta > 0 ? "cộng" : "trừ"} ${Math.abs(delta)} điểm cho ${u.name}.`);
  };

  const stats = [
    { label: "Tổng khách hàng", value: users.length,                                   color: "#7c61ff" },
    { label: "Đang hoạt động",  value: users.filter((u) => u.status === "active").length,  color: "#4ade80" },
    { label: "Bị khóa",         value: users.filter((u) => u.status === "blocked").length, color: "#f87171" },
    { label: "Tổng điểm đã tích", value: users.reduce((s, u) => s + u.points, 0).toLocaleString(), color: "#fbbf24" },
  ];

  const TABS = [
    { key: "list",        label: "Danh sách khách hàng" },
    { key: "membership",  label: "Thành viên"           },
    { key: "points",      label: "Điểm thưởng"          },
    { key: "transaction", label: "Lịch sử giao dịch"    },
  ];

  return (
    <div className="admin-users-page">
      <div className="us-page-header">
        <h2>Quản lý khách hàng</h2>
        <p>Quản lý tài khoản, hạng thành viên, điểm thưởng và lịch sử giao dịch</p>
      </div>

      {error && (
        <div className="us-error-banner" style={{ marginBottom: 16, color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="us-stats-row">
        {stats.map((s) => (
          <div className="us-stat-pill" key={s.label}>
            <span>{s.label}</span>
            <strong style={{ color: s.color }}>{s.value}</strong>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="us-tabs">
        {TABS.map((t) => (
          <button key={t.key} className={`us-tab${activeTab === t.key ? " active" : ""}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="us-loading-state" style={{ padding: 32, textAlign: 'center', color: '#9cb2ff' }}>
          Đang tải danh sách khách hàng...
        </div>
      ) : (
        <>
          {activeTab === "list"        && <UserList        users={users} onView={setViewUser} onToggleStatus={handleToggleStatus} />}
          {activeTab === "membership"  && <MembershipTab   users={users} />}
          {activeTab === "points"      && <PointsTab       users={users} onAdjust={setAdjustUser} />}
          {activeTab === "transaction" && <TransactionTab  users={users} />}
        </>
      )}

      {viewUser   && <UserDetail user={viewUser} onClose={() => setViewUser(null)} onToggleStatus={handleToggleStatus} onAdjustPoints={(u) => { setViewUser(null); setAdjustUser(u); }} />}
      {adjustUser && <AdjustPointsModal user={adjustUser} onClose={() => setAdjustUser(null)} onConfirm={handleAdjustPoints} />}

      <Toast message={toast} onClose={() => setToast("")} />
    </div>
  );
}
