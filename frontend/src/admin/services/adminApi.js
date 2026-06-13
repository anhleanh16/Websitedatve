const BASE = import.meta.env.VITE_API_URL || '/api';

// ─── Helper ───────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ─── Movies ───────────────────────────────────────────────────────────────────
export const adminMovieService = {
  getAllMovies:  ()         => apiFetch('/admin/movies'),
  createMovie:  (data)     => apiFetch('/admin/movies', { method: 'POST', body: JSON.stringify(data) }),
  updateMovie:  (id, data) => apiFetch(`/admin/movies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMovie:  (id)       => apiFetch(`/admin/movies/${id}`, { method: 'DELETE' }),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const adminUserService = {
  getAllUsers:     ()       => apiFetch('/admin/users'),
  deactivateUser: (userId) => apiFetch(`/admin/users/${userId}/deactivate`, { method: 'PUT' }),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const adminBookingService = {
  /**
   * Danh sách vé
   * @param {{ status?: string, search?: string, page?: number, limit?: number }} params
   */
  getAllBookings: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== ''))
    ).toString();
    return apiFetch(`/admin/bookings${q ? `?${q}` : ''}`);
  },

  /** Chi tiết vé */
  getBookingDetail: (orderId) => apiFetch(`/admin/bookings/${orderId}`),

  /** Hoàn vé */
  refundBooking: (orderId, { reason, refundMethod }) =>
    apiFetch(`/admin/bookings/${orderId}/refund`, {
      method: 'PUT',
      body: JSON.stringify({ reason, refundMethod }),
    }),

  /** Kiểm tra & check-in vé */
  checkInBooking: (orderId, code) =>
    apiFetch(`/admin/bookings/${orderId}/check-in`, {
      method: 'PUT',
      body: JSON.stringify({ code }),
    }),

  /** Xác minh mã vé / QR */
  verifyCode: (code) => apiFetch(`/admin/bookings/verify/${encodeURIComponent(code)}`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const adminDashboardService = {
  getDashboardStats: () => apiFetch('/admin/dashboard'),
};
