import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'sweetstar_selected_cinema';

const getInitial = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const cinemaSlice = createSlice({
  name: 'cinema',
  initialState: {
    selectedCinema: getInitial(), // { id, name, city } | null
  },
  reducers: {
    setSelectedCinema: (state, action) => {
      state.selectedCinema = action.payload; // { id, name, city } | null
      try {
        if (action.payload) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(action.payload));
        } else {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {}
    },
  },
});

export const { setSelectedCinema } = cinemaSlice.actions;
export default cinemaSlice.reducer;
