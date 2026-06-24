const BASE = import.meta.env.VITE_API_URL || "/api";

// ─── Helper ───────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `API error ${res.status}`);
  return data;
}

// ─── Movies ───────────────────────────────────────────────────────────────────
export const adminMovieService = {
  getAllMovies: (trash = false) => apiFetch(`/admin/movies?trash=${trash}`),
  createMovie: (formData) => {
    return fetch(`${BASE}/admin/movies`, {
      method: "POST",
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error("API error");
      return res.json();
    });
  },
  updateMovie: (id, formData) => {
    return fetch(`${BASE}/admin/movies/${id}`, {
      method: "PUT",
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new Error("API error");
      return res.json();
    });
  },
  deleteMovie: (id) => apiFetch(`/admin/movies/${id}`, { method: "DELETE" }),
  restoreMovie: (id) =>
    apiFetch(`/admin/movies/${id}/restore`, { method: "PUT" }),
  permanentDeleteMovie: (id) =>
    apiFetch(`/admin/movies/${id}/permanent`, { method: "DELETE" }),
  toggleHideMovie: (id) =>
    apiFetch(`/admin/movies/${id}/toggle-hide`, { method: "PUT" }),
};

// ─── Movie Categories ───────────────────────────────────────────────────────────
export const adminCategoryService = {
  getAllCategories: () => apiFetch("/admin/categories"),
  createCategory: (data) =>
    apiFetch("/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCategory: (id, data) =>
    apiFetch(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id) =>
    apiFetch(`/admin/categories/${id}`, { method: "DELETE" }),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const adminUserService = {
  getAllUsers: () => apiFetch("/admin/users"),
  lockUser: (id) => apiFetch(`/admin/users/${id}/lock`, { method: "PUT" }),
  unlockUser: (id) => apiFetch(`/admin/users/${id}/unlock`, { method: "PUT" }),
};

// ─── Bookings ─────────────────────────────────────────────────────────────────
export const adminBookingService = {
  /**
   * Danh sách vé
   * @param {{ status?: string, search?: string, page?: number, limit?: number }} params
   */
  getAllBookings: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      ),
    ).toString();
    return apiFetch(`/admin/bookings${q ? `?${q}` : ""}`);
  },

  /** Chi tiết vé */
  getBookingDetail: (orderId) => apiFetch(`/admin/bookings/${orderId}`),

  /** Hoàn vé */
  refundBooking: (orderId, { reason, refundMethod }) =>
    apiFetch(`/admin/bookings/${orderId}/refund`, {
      method: "PUT",
      body: JSON.stringify({ reason, refundMethod }),
    }),

  /** Kiểm tra & check-in vé */
  checkInBooking: (orderId, code) =>
    apiFetch(`/admin/bookings/${orderId}/check-in`, {
      method: "PUT",
      body: JSON.stringify({ code }),
    }),

  /** Xác minh mã vé / QR */
  verifyCode: (code) =>
    apiFetch(`/admin/bookings/verify/${encodeURIComponent(code)}`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const adminDashboardService = {
  getDashboardStats: () => apiFetch("/admin/dashboard"),
};

// ─── Showtimes ────────────────────────────────────────────────────────────────
export const adminShowtimeService = {
  /** Lấy danh sách rạp */
  getCinemas: () => apiFetch("/admin/showtimes/cinemas"),

  /** Lấy phòng chiếu (có thể lọc theo cinemaId) */
  getRooms: (cinemaId) =>
    apiFetch(
      `/admin/showtimes/rooms${cinemaId ? `?cinemaId=${cinemaId}` : ""}`,
    ),

  /** Danh sách suất chiếu */
  getAll: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      ),
    ).toString();
    return apiFetch(`/admin/showtimes${q ? `?${q}` : ""}`);
  },

  /** Chi tiết suất chiếu */
  getById: (id) => apiFetch(`/admin/showtimes/${id}`),

  /** Tạo mới */
  create: (data) =>
    apiFetch("/admin/showtimes", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  /** Cập nhật */
  update: (id, data) =>
    apiFetch(`/admin/showtimes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  /** Xóa */
  delete: (id) => apiFetch(`/admin/showtimes/${id}`, { method: "DELETE" }),

  /** Hủy */
  cancel: (id) => apiFetch(`/admin/showtimes/${id}/cancel`, { method: "PUT" }),
};

// ─── Cinemas ──────────────────────────────────────────────────────────────────
export const adminCinemaService = {
  getAllCinemas: () => apiFetch("/admin/cinemas"),
  getCinemaById: (id) => apiFetch(`/admin/cinemas/${id}`),
  createCinema: (formData) => {
    return fetch(`${BASE}/admin/cinemas`, {
      method: "POST",
      body: formData,
    }).then((res) => {
      return res.json().then((data) => {
        if (!res.ok)
          throw new Error(data?.message || "Network response was not ok");
        return data;
      });
    });
  },
  updateCinema: (id, formData) => {
    return fetch(`${BASE}/admin/cinemas/${id}`, {
      method: "PUT",
      body: formData,
    }).then((res) => {
      return res.json().then((data) => {
        if (!res.ok)
          throw new Error(data?.message || "Network response was not ok");
        return data;
      });
    });
  },
  deleteCinema: (id) => apiFetch(`/admin/cinemas/${id}`, { method: "DELETE" }),
};

// ─── Rooms ────────────────────────────────────────────────────────────────────
export const adminRoomService = {
  getRoomsByCinema: (cinemaId) =>
    apiFetch(`/admin/rooms?cinemaId=${encodeURIComponent(cinemaId)}`),
};

// ─── Seats ────────────────────────────────────────────────────────────────────
export const adminSeatService = {
  getSeatsByRoom: (roomId) =>
    apiFetch(`/admin/seats?roomId=${encodeURIComponent(roomId)}`),
  bulkUpdate: (roomId, seatIds, changes) =>
    apiFetch("/admin/seats/bulk", {
      method: "PUT",
      body: JSON.stringify({ roomId, seatIds, changes }),
    }),
};
