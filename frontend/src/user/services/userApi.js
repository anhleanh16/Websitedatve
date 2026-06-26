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
      window.location.assign("/login");
    }
    throw new Error(data?.message || `API error ${res.status}`);
  }
  return data;
}

export const userNotificationService = {
  getAll: (userId) => apiFetch(`/user/${encodeURIComponent(userId)}/notifications`),
  markAsRead: (userId, notificationId) =>
    apiFetch(
      `/user/${encodeURIComponent(userId)}/notifications/${encodeURIComponent(notificationId)}/read`,
      { method: "PUT" },
    ),
  markAllAsRead: (userId) =>
    apiFetch(`/user/${encodeURIComponent(userId)}/notifications/read-all`, {
      method: "PUT",
    }),
  deleteOne: (userId, notificationId) =>
    apiFetch(
      `/user/${encodeURIComponent(userId)}/notifications/${encodeURIComponent(notificationId)}`,
      { method: "DELETE" },
    ),
  clearAll: (userId) =>
    apiFetch(`/user/${encodeURIComponent(userId)}/notifications`, {
      method: "DELETE",
    }),
};

export const userPromotionService = {
  getAll: (userId) => apiFetch(`/user/${encodeURIComponent(userId)}/promotions`),
  getToday: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      ),
    ).toString();
    return apiFetch(`/user/promotions/today${q ? `?${q}` : ""}`);
  },
};

export const userCinemaService = {
  getAll: () => apiFetch('/user/cinemas'),
  getById: (id) => apiFetch(`/user/cinemas/${encodeURIComponent(id)}`),
};

export const userComboService = {
  getAll: () => apiFetch('/user/combos'),
};

export const userBookingService = {
  getAll: (userId) => apiFetch(`/user/${encodeURIComponent(userId)}/bookings`),
  create: (userId, data) =>
    apiFetch(`/user/${encodeURIComponent(userId)}/bookings`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const userNewsService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      ),
    ).toString();
    return apiFetch(`/user/news${q ? `?${q}` : ""}`);
  },
  getBySlug: (slug) => apiFetch(`/user/news/${encodeURIComponent(slug)}`),
};
