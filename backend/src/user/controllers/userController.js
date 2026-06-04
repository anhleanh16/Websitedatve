export const userGetProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    res.json({ user: { id: userId, name: '', email: '' } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userUpdateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, address } = req.body;
    res.json({ message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userGetBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    res.json({ bookings: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const userCreateBooking = async (req, res) => {
  try {
    const { userId } = req.params;
    const { movieId, showId, seats } = req.body;
    res.status(201).json({ bookingId: 1, message: 'Booking created' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
