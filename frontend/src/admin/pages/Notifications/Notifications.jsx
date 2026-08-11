import { useEffect, useMemo, useState } from "react";
import { adminNotificationService } from "../../services/adminApi";
import { useSelector } from "react-redux";

const TYPE_OPTIONS = [
  { value: "system", label: "Hệ thống" },
  { value: "promo", label: "Khuyến mãi" },
  { value: "movie", label: "Phim" },
  { value: "ticket", label: "Vé" },
];

const EMPTY_FORM = {
  title: "",
  content: "",
  type: "system",
  audienceScope: "all",
  recipientIds: [],
};

function NotificationDetailModal({ detail, onClose }) {
  const [filter, setFilter] = useState("all");

  if (!detail) return null;

  const recipients = Array.isArray(detail.recipients) ? detail.recipients : [];
  const filteredRecipients = recipients.filter((recipient) => {
    if (filter === "read") return Boolean(recipient.is_read);
    if (filter === "unread") return !recipient.is_read;
    return true;
  });

  return (
    <div className="pr-overlay" onClick={onClose}>
      <div className="pr-modal" onClick={(e) => e.stopPropagation()}>
        <div className="pr-modal-header">
          <h2>Chi tiết thông báo</h2>
          <button className="pr-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="pr-modal-body" style={{ display: "grid", gap: 14 }}>
          <div className="report-card" style={{ margin: 0 }}>
            <h3 style={{ marginTop: 0 }}>{detail.notification.title}</h3>
            <p style={{ marginBottom: 8 }}>{detail.notification.content}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", color: "#8fa6ff", fontSize: 13 }}>
              <span>Loại: {detail.notification.type}</span>
              <span>Đối tượng: {detail.notification.audience_scope === "all" ? "Toàn bộ" : "Đã chọn"}</span>
              <span>Người nhận: {detail.notification.recipient_count}</span>
              <span>Đã đọc: {detail.notification.read_count}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className={`pr-btn ${filter === "all" ? "pr-btn-add" : "pr-btn-secondary"}`} onClick={() => setFilter("all")}>
              Tất cả
            </button>
            <button className={`pr-btn ${filter === "read" ? "pr-btn-add" : "pr-btn-secondary"}`} onClick={() => setFilter("read")}>
              Đã đọc
            </button>
            <button className={`pr-btn ${filter === "unread" ? "pr-btn-add" : "pr-btn-secondary"}`} onClick={() => setFilter("unread")}>
              Chưa đọc
            </button>
          </div>

          <div className="table-card" style={{ margin: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Khách hàng</th>
                  <th>Email</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", padding: 24 }}>
                      Không có người nhận trong bộ lọc này.
                    </td>
                  </tr>
                ) : (
                  filteredRecipients.map((recipient) => (
                    <tr key={recipient.id}>
                      <td>{recipient.full_name}</td>
                      <td>{recipient.email}</td>
                      <td>
                        <span className={`status-pill ${recipient.is_read ? "confirmed" : "pending"}`}>
                          {recipient.is_read ? "Đã đọc" : "Chưa đọc"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Notifications() {
  const profile = useSelector((state) => state.user.profile);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoadingId, setDetailLoadingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [notificationData, userData] = await Promise.all([
        adminNotificationService.getAll(),
        adminNotificationService.getRecipients(),
      ]);
      setNotifications(Array.isArray(notificationData?.notifications) ? notificationData.notifications : []);
      setUsers(Array.isArray(userData?.users) ? userData.users : []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể tải dữ liệu thông báo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Tổng thông báo", value: notifications.length, color: "#7c61ff" },
      {
        label: "Gửi toàn hệ thống",
        value: notifications.filter((item) => item.audience_scope === "all").length,
        color: "#4ade80",
      },
      {
        label: "Khuyến mãi",
        value: notifications.filter((item) => item.type === "promo").length,
        color: "#f59e0b",
      },
      {
        label: "Lượt đã đọc",
        value: notifications.reduce((sum, item) => sum + Number(item.read_count || 0), 0),
        color: "#5bcad4",
      },
    ],
    [notifications],
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const startEdit = (item) => {
    setEditingId(item.notification_id);
    setForm({
      title: item.title || "",
      content: item.content || "",
      type: item.type || "system",
      audienceScope: item.audience_scope || "all",
      recipientIds: [],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleViewDetail = async (id) => {
    setDetailLoadingId(id);
    setError("");
    try {
      const data = await adminNotificationService.getDetail(id);
      setDetail(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể tải chi tiết thông báo.");
    } finally {
      setDetailLoadingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (editingId) {
        await adminNotificationService.update(editingId, form);
        setMessage("Đã cập nhật thông báo đã gửi.");
      } else {
        await adminNotificationService.create({
          ...form,
          createdBy: profile?.id || null,
        });
        setMessage("Đã gửi thông báo cho người dùng.");
      }
      resetForm();
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể lưu thông báo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa thông báo này?")) return;
    setMessage("");
    setError("");

    try {
      await adminNotificationService.delete(id);
      setNotifications((prev) => prev.filter((item) => item.notification_id !== id));
      setMessage("Đã xóa thông báo.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Không thể xóa thông báo.");
    }
  };

  return (
    <div className="admin-promotions-page">
      <div className="pr-page-header">
        <h2>Quản lý thông báo</h2>
        <p>Tạo và gửi thông báo trực tiếp cho toàn bộ người dùng hoặc từng tài khoản cụ thể.</p>
      </div>

      <div className="pr-stats-row">
        {stats.map((item) => (
          <div className="pr-stat-pill" key={item.label}>
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

      <div className="report-card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>{editingId ? "Sửa thông báo đã gửi" : "Gửi thông báo mới"}</h3>
          {editingId && (
            <button className="pr-btn pr-btn-secondary" type="button" onClick={resetForm}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr 1fr", gap: 12 }}>
            <input
              className="pr-search"
              placeholder="Tiêu đề thông báo"
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
            />
            <select
              className="pr-select"
              value={form.type}
              onChange={(e) => setField("type", e.target.value)}
            >
              {TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <select
              className="pr-select"
              value={form.audienceScope}
              disabled={Boolean(editingId)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  audienceScope: e.target.value,
                  recipientIds: e.target.value === "all" ? [] : prev.recipientIds,
                }))
              }
            >
              <option value="all">Gửi toàn bộ người dùng</option>
              <option value="selected">Gửi người dùng cụ thể</option>
            </select>
          </div>

          {editingId && (
            <div style={{ color: "#8fa6ff", fontSize: 13 }}>
              Chế độ chỉnh sửa chỉ cập nhật nội dung thông báo, không thay đổi danh sách người nhận cũ.
            </div>
          )}

          {form.audienceScope === "selected" && !editingId && (
            <select
              className="pr-select"
              multiple
              value={form.recipientIds.map(String)}
              onChange={(e) =>
                setField(
                  "recipientIds",
                  Array.from(e.target.selectedOptions).map((option) => Number(option.value)),
                )
              }
              style={{ minHeight: 140 }}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name} - {user.email}
                </option>
              ))}
            </select>
          )}

          <textarea
            className="pr-search"
            placeholder="Nội dung thông báo"
            value={form.content}
            onChange={(e) => setField("content", e.target.value)}
            style={{ minHeight: 120, resize: "vertical" }}
          />

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ color: "#8fa6ff", fontSize: 13 }}>
              {form.audienceScope === "all"
                ? `Thông báo sẽ gửi đến ${users.length} người dùng đang hoạt động.`
                : `Đã chọn ${form.recipientIds.length} người dùng.`}
            </div>
            <button className="pr-btn pr-btn-add pr-btn-lg" type="submit" disabled={saving}>
              {saving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Gửi thông báo"}
            </button>
          </div>
        </form>
      </div>

      <div className="table-card">
        <table>
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Loại</th>
              <th>Đối tượng</th>
              <th>Người nhận</th>
              <th>Đã đọc</th>
              <th>Thời gian</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32 }}>
                  Đang tải thông báo...
                </td>
              </tr>
            ) : notifications.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 32 }}>
                  Chưa có thông báo nào.
                </td>
              </tr>
            ) : (
              notifications.map((item) => (
                <tr key={item.notification_id}>
                  <td>
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong style={{ color: "#eef4ff" }}>{item.title}</strong>
                      <span style={{ color: "#8fa6ff", fontSize: 13 }}>{item.content}</span>
                    </div>
                  </td>
                  <td>
                    <span className="status-pill confirmed">{item.type}</span>
                  </td>
                  <td>{item.audience_scope === "all" ? "Toàn bộ" : "Đã chọn"}</td>
                  <td>{item.recipient_count}</td>
                  <td>{item.read_count}</td>
                  <td>{new Date(item.created_at).toLocaleString("vi-VN")}</td>
                  <td style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button className="pr-btn pr-btn-secondary" onClick={() => handleViewDetail(item.notification_id)}>
                      {detailLoadingId === item.notification_id ? "Đang tải..." : "Chi tiết"}
                    </button>
                    <button className="pr-btn pr-btn-secondary" onClick={() => startEdit(item)}>
                      Sửa
                    </button>
                    <button className="pr-btn pr-btn-delete" onClick={() => handleDelete(item.notification_id)}>
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <NotificationDetailModal detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
