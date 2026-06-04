export const adminDashboard = async (req, res) => {
  res.json({ totalUsers: 0, totalBookings: 0, totalRevenue: 0, totalMovies: 0, recentActivity: [] });
};

export const getAdminUsers = async (req, res) => {
  res.json({ users: [] });
};

export const getAdminBookings = async (req, res) => {
  res.json({ bookings: [] });
};

export const getAdminMovies = async (req, res) => {
  res.json({ movies: [] });
};

export const createMovie = async (req, res) => {
  res.status(201).json({ message: 'Movie created' });
};

export const updateMovie = async (req, res) => {
  res.json({ message: 'Movie updated' });
};

export const deleteMovie = async (req, res) => {
  res.json({ message: 'Movie deleted' });
};

export const deactivateAdminUser = async (req, res) => {
  res.json({ message: 'User deactivated' });
};
