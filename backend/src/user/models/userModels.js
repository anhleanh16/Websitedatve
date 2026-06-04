export const UserProfileSchema = {
  userId: Number,
  name: String,
  email: String,
  phone: String,
  address: String,
  avatar: String,
  createdAt: Date,
  updatedAt: Date
};

export const BookingSchema = {
  bookingId: Number,
  userId: Number,
  movieId: Number,
  showId: Number,
  seats: Array,
  totalPrice: Number,
  status: String,
  createdAt: Date,
  updatedAt: Date
};
