import axios from 'axios';

const API_BASE = 'http://localhost:4000/api';

export const movieService = {
  getAllMovies: async () => {
    const response = await axios.get(`${API_BASE}/movies`);
    return response.data;
  },
  getMovieById: async (id) => {
    const response = await axios.get(`${API_BASE}/movies/${id}`);
    return response.data;
  }
};

export const bookingService = {
  createBooking: async (bookingData) => {
    const response = await axios.post(`${API_BASE}/bookings`, bookingData);
    return response.data;
  },
  getBookingById: async (id) => {
    const response = await axios.get(`${API_BASE}/bookings/${id}`);
    return response.data;
  }
};

export const authService = {
  login: async (email, password) => {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return response.data;
  },
  register: async (userData) => {
    const response = await axios.post(`${API_BASE}/auth/register`, userData);
    return response.data;
  }
};

export const paymentService = {
  processPayment: async (paymentData) => {
    const response = await axios.post(`${API_BASE}/payments`, paymentData);
    return response.data;
  }
};
