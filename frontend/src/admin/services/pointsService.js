const BASE = import.meta.env.VITE_API_URL || "/api";
import { clearStoredSession, getValidStoredToken } from "../../utils/auth";

function getAuthHeaders() {
  const token = getValidStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401) {
      clearStoredSession();
      window.location.assign("/admin/login");
    }
    throw new Error(data?.message || `API error ${res.status}`);
  }
  return data;
}

export const pointsService = {
  getDashboard: () => apiFetch("/points/dashboard"),
  getHistory: ({ search = "", page = 1, limit = 10 } = {}) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    return apiFetch(`/points/history?${params.toString()}`);
  },
  getSettings: () => apiFetch("/points/settings"),
  getUserSummary: (userId) => apiFetch(`/points/users/${encodeURIComponent(userId)}`),
  adjustUserPoints: (userId, payload) => apiFetch(`/points/users/${encodeURIComponent(userId)}/adjust`, { method: "POST", body: JSON.stringify(payload) }),
  createLevel: (payload) => apiFetch("/points/levels", { method: "POST", body: JSON.stringify(payload) }),
  updateLevel: (levelId, payload) => apiFetch(`/points/levels/${encodeURIComponent(levelId)}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteLevel: (levelId) => apiFetch(`/points/levels/${encodeURIComponent(levelId)}`, { method: "DELETE" }),
  createRule: (payload) => apiFetch("/points/rules", { method: "POST", body: JSON.stringify(payload) }),
  updateRule: (ruleId, payload) => apiFetch(`/points/rules/${encodeURIComponent(ruleId)}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteRule: (ruleId) => apiFetch(`/points/rules/${encodeURIComponent(ruleId)}`, { method: "DELETE" }),
  createReward: (payload) => apiFetch("/points/rewards", { method: "POST", body: JSON.stringify(payload) }),
  updateReward: (rewardId, payload) => apiFetch(`/points/rewards/${encodeURIComponent(rewardId)}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteReward: (rewardId) => apiFetch(`/points/rewards/${encodeURIComponent(rewardId)}`, { method: "DELETE" }),
};
