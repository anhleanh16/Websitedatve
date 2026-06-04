export const userAuthMiddleware = (req, res, next) => {
  // Check if user is authenticated
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized. Please login.' });
  }
  
  next();
};

export const userValidationMiddleware = (req, res, next) => {
  // Validate user data
  next();
};
