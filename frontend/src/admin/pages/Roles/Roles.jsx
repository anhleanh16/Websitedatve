import { useEffect, useState } from "react";
import { adminUserService } from "../../services/adminApi.js";

const ROLE_META = {
  admin: { label: "Quản trị viên", color: "#fbbf24" },
  user: { label: "Khách hàng", color: "#60a5fa" },
  employee: { label: "Nhân viên", color: "#5bcad4" },
};

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    adminUserService.getRoleSummary()
      .then((data) => setRoles(Array.isArray(data?.roles) ? data.roles : []))
      .catch((err) => setError(err.message || "Không thể tải tổng quan vai trò."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="us-page">
      <div className="us-page-header">
        <div>
          <h1>Quản lý phân quyền</h1>
          <p>Thống kê tài khoản theo vai trò trong hệ thống</p>
        </div>
      </div>

      {loading && <div>Đang tải...</div>}
      {error && <div className="error-message">{error}</div>}
      {!loading && !error && (
        <div className="us-detail-grid">
          {roles.map((role) => {
            const meta = ROLE_META[role.name] || { label: role.name, color: "#94a3b8" };
            return (
              <div className="us-detail-card" key={role.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <h3 style={{ color: meta.color, margin: 0 }}>{meta.label}</h3>
                    <p style={{ color: "#9cb2ff", margin: "8px 0 0" }}>{role.description || "Chưa có mô tả"}</p>
                  </div>
                  <strong style={{ color: meta.color, fontSize: 32 }}>{role.totalUsers}</strong>
                </div>
                <p style={{ color: "#7a8fc0", marginBottom: 0 }}>tài khoản</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
