export const adminAuthMiddleware = (req, res, next) => {
  // Check if user is admin
  const isAdmin = req.user && req.user.role === 'admin';
  
  if (!isAdmin) {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  
  next();
};

export const adminLoggingMiddleware = (req, res, next) => {
  console.log(`[ADMIN] ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
};
