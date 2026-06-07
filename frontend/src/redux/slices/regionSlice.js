import { createSlice } from '@reduxjs/toolkit';

// Khớp với cinema IDs trong MovieDetail.jsx
const initialState = {
  selectedRegion: 'danang', // Mặc định Đà Nẵng
};

const regionSlice = createSlice({
  name: 'region',
  initialState,
  reducers: {
    setRegion: (state, action) => {
      state.selectedRegion = action.payload;
    },
  },
});

export const { setRegion } = regionSlice.actions;
export default regionSlice.reducer;