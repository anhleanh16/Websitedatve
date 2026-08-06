const BASE = import.meta.env.VITE_API_URL || "/api";
import { clearStoredSession, getValidStoredToken } from "../../utils/auth";

// ─── Helper ───────────────────────────────────────────────────────────────────
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

async function uploadFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { ...getAuthHeaders(), ...options.headers },
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

// ─── Movies ───────────────────────────────────────────────────────────────────
export const adminMovieService = {
  getAllMovies: (trash = false) => apiFetch(`/admin/movies?trash=${trash}`),
  createMovie: (formData) =>
    uploadFetch(`/admin/movies`, {
      method: "POST",
      body: formData,
    }),
  updateMovie: (id, formData) =>
    uploadFetch(`/admin/movies/${id}`, {
      method: "PUT",
      body: formData,
    }),
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
  searchUsers: (query) =>
    apiFetch(
      `/admin/users/search?query=${encodeURIComponent(query || "")}`,
    ),
  createUser: (data) =>
    apiFetch("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  resetPassword: (id, data) =>
    apiFetch(`/admin/users/${id}/reset-password`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deactivateUser: (id) =>
    apiFetch(`/admin/users/${id}/deactivate`, { method: "PUT" }),
  lockUser: (id) => apiFetch(`/admin/users/${id}/lock`, { method: "PUT" }),
  unlockUser: (id) => apiFetch(`/admin/users/${id}/unlock`, { method: "PUT" }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const adminNotificationService = {
  getAll: () => apiFetch("/admin/notifications"),
  getRecipients: () => apiFetch("/admin/notifications/recipients"),
  getDetail: (id) => apiFetch(`/admin/notifications/${id}`),
  create: (data) =>
    apiFetch("/admin/notifications", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiFetch(`/admin/notifications/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) => apiFetch(`/admin/notifications/${id}`, { method: "DELETE" }),
};

// ─── Promotions ───────────────────────────────────────────────────────────────
export const adminPromotionService = {
  getAll: () => apiFetch("/admin/promotions"),
  getRecipients: () => apiFetch("/admin/promotions/recipients"),
  createCoupon: (data) =>
    apiFetch("/admin/promotions/coupons", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateCoupon: (id, data) =>
    apiFetch(`/admin/promotions/coupons/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  createVoucher: (data) =>
    apiFetch("/admin/promotions/vouchers", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateVoucher: (id, data) =>
    apiFetch(`/admin/promotions/vouchers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) => apiFetch(`/admin/promotions/${id}`, { method: "DELETE" }),
};

// ─── News ─────────────────────────────────────────────────────────────────────
export const adminNewsService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      ),
    ).toString();
    return apiFetch(`/admin/news${q ? `?${q}` : ""}`);
  },
  getById: (id) => apiFetch(`/admin/news/${id}`),
  create: (formData) =>
    uploadFetch("/admin/news", {
      method: "POST",
      body: formData,
    }),
  update: (id, formData) =>
    uploadFetch(`/admin/news/${id}`, {
      method: "PUT",
      body: formData,
    }),
  delete: (id) => apiFetch(`/admin/news/${id}`, { method: "DELETE" }),
};

// ─── Combos ───────────────────────────────────────────────────────────────────
export const adminComboService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      ),
    ).toString();
    return apiFetch(`/admin/combos${q ? `?${q}` : ""}`);
  },
  getById: (id) => apiFetch(`/admin/combos/${id}`),
  create: (data) =>
    apiFetch("/admin/combos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    apiFetch(`/admin/combos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id) => apiFetch(`/admin/combos/${id}`, { method: "DELETE" }),
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

  /** Nhân viên đặt vé (hỗ trợ khách đã có TK hoặc tạo TK mới) */
  staffCreateBooking: (payload) =>
    apiFetch("/admin/bookings/staff-create", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  /** Chi tiết vé */
  getBookingDetail: (orderId) => apiFetch(`/admin/bookings/${orderId}`),

  /** Kiểm tra & check-in vé */
  checkInBooking: (orderId, payload = {}) =>
    apiFetch(`/admin/bookings/${orderId}/check-in`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  /** Xác minh mã vé / QR */
  verifyCode: (code) =>
    apiFetch(`/admin/bookings/verify/${encodeURIComponent(code)}`),

  /** Lấy danh sách ghế đã bán theo suất chiếu */
  getSoldSeats: (showtimeId) =>
    apiFetch(`/admin/showtimes/${encodeURIComponent(showtimeId)}/sold-seats`),
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const adminDashboardService = {
  getDashboardStats: () => apiFetch("/admin/dashboard"),
};

// ─── Statistics ───────────────────────────────────────────────────────────────
export const adminStatisticsService = {
  getStatistics: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
      ),
    ).toString();
    return apiFetch(`/admin/statistics${q ? `?${q}` : ""}`);
  },
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

  /** Tạo lịch chiếu lặp lại theo khung giờ cố định */
  createRecurring: (data) =>
    apiFetch("/admin/showtimes/recurring", {
      method: "POST",
      body: JSON.stringify(data),
    }),

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
      headers: getAuthHeaders(),
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
      headers: getAuthHeaders(),
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

// ─── Employees ────────────────────────────────────────────────────────────────
const buildEmployeeFormData = (data = {}, files = {}) => {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    formData.append(key, Array.isArray(value) ? value.join(",") : String(value));
  });
  if (files.avatarFile) formData.append("avatar", files.avatarFile);
  if (files.idCardFrontFile) formData.append("idCardFront", files.idCardFrontFile);
  if (files.idCardBackFile) formData.append("idCardBack", files.idCardBackFile);
  return formData;
};

export const adminEmployeeService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null),
      ),
    ).toString();
    return apiFetch(`/admin/employees${q ? `?${q}` : ""}`);
  },
  getById: (id) => apiFetch(`/admin/employees/${id}`),
  create: (data, files) =>
    uploadFetch("/admin/employees", { method: "POST", body: buildEmployeeFormData(data, files) }),
  update: (id, data, files) =>
    uploadFetch(`/admin/employees/${id}`, { method: "PUT", body: buildEmployeeFormData(data, files) }),
  delete: (id) =>
    apiFetch(`/admin/employees/${id}`, { method: "DELETE" }),
};
