export const adminMovieService = {
  getAllMovies: async () => ({ movies: [] }),
  createMovie: async () => ({ message: 'Movie created' }),
  updateMovie: async () => ({ message: 'Movie updated' }),
  deleteMovie: async () => ({ message: 'Movie deleted' })
};

export const adminUserService = {
  getAllUsers: async () => ({ users: [] }),
  deactivateUser: async () => ({ message: 'User deactivated' })
};

export const adminBookingService = {
  getAllBookings: async () => ({ bookings: [] })
};

export const adminDashboardService = {
  getDashboardStats: async () => ({ totalUsers: 0, totalBookings: 0, totalRevenue: 0, totalMovies: 0, recentActivity: [] })
};
