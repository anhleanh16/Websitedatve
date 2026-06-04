export const MovieSchema = {
  id: Number,
  title: String,
  description: String,
  poster: String,
  rating: Number,
  genre: String,
  duration: Number,
  releaseDate: Date,
  status: String, // 'active', 'archived'
  createdAt: Date,
  updatedAt: Date
};

export const UserSchema = {
  id: Number,
  name: String,
  email: String,
  phone: String,
  status: String, // 'active', 'inactive', 'banned'
  role: String, // 'user', 'admin'
  createdAt: Date,
  updatedAt: Date
};

export const BookingSchema = {
  id: Number,
  userId: Number,
  movieId: Number,
  showId: Number,
  seats: Array,
  totalPrice: Number,
  status: String, // 'pending', 'confirmed', 'cancelled'
  createdAt: Date,
  updatedAt: Date
};
