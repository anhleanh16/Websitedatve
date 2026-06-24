import { createSlice } from '@reduxjs/toolkit';

const REGION_STORAGE_KEY = 'selectedRegion';

const getInitialRegion = () => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(REGION_STORAGE_KEY) || '';
};

const initialState = {
  selectedRegion: getInitialRegion(),
};

const regionSlice = createSlice({
  name: 'region',
  initialState,
  reducers: {
    setRegion: (state, action) => {
      state.selectedRegion = action.payload;
      if (typeof window !== 'undefined') {
        if (action.payload) {
          localStorage.setItem(REGION_STORAGE_KEY, action.payload);
        } else {
          localStorage.removeItem(REGION_STORAGE_KEY);
        }
      }
    },
  },
});

export const { setRegion } = regionSlice.actions;
export default regionSlice.reducer;
