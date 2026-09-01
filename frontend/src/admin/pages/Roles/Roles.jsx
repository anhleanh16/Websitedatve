import { useCallback, useEffect, useState } from "react";
import { adminUserService } from "../../services/adminApi.js";

const ROLE_META = {
  admin: { label: "Quản trị viên", color: "#fbbf24" },
  user: { label: "Khách hàng", color: "#60a5fa" },
  employee: { label: "Nhân viên", color: "#5bcad4" },
};

export default function Roles({ embedded = false }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRoles = useCallback(async ({ retries = 2 } = {}) => {
    setLoading(true);
    setError("");

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const data = await adminUserService.getRoleSummary();
        setRoles(Array.isArray(data?.roles) ? data.roles : []);
        setLoading(false);
        return;
      } catch (err) {
        if (attempt === retries) {
          setError(err.message || "Không thể tải tổng quan vai trò.");
          setLoading(false);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 700));
      }
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  return (
    <section className={embedded ? "role-summary-section" : "us-page role-summary-page"}>
      <div className={embedded ? "role-summary-header" : "us-page-header"}>
        <div>
          {embedded ? <h2>Phân quyền tài khoản</h2> : <h1>Quản lý phân quyền</h1>}
          <p>Thống kê tài khoản theo vai trò trong hệ thống</p>
        </div>
      </div>

      {loading && <div>Đang tải...</div>}
      {error && (
        <div className="error-message" style={{ display: "flex", alignItems: "center", gap: 12, width: "fit-content" }}>
          <span>{error}</span>
          <button
            type="button"
            className="sf-btn sf-btn-secondary"
            onClick={() => loadRoles({ retries: 0 })}
          >
            Thử lại
          </button>
        </div>
      )}
      {!loading && !error && (
        <div className="role-summary-grid">
          {roles.map((role) => {
            const meta = ROLE_META[role.name] || { label: role.name, color: "#94a3b8" };
            return (
              <article className="role-summary-card" key={role.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
                  <div>
                    <h3 style={{ color: meta.color, margin: 0 }}>{meta.label}</h3>
                    <p style={{ color: "#9cb2ff", margin: "8px 0 0" }}>{role.description || "Chưa có mô tả"}</p>
                  </div>
                  <strong style={{ color: meta.color, fontSize: 32 }}>{role.totalUsers}</strong>
                </div>
                <p style={{ color: "#7a8fc0", marginBottom: 0 }}>tài khoản</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
