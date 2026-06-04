export const initialState = {
  movies: [],
  selectedMovie: null,
  selectedSeats: [],
  showtime: null
};

export const bookingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_MOVIES':
      return { ...state, movies: action.payload };
    case 'SELECT_MOVIE':
      return { ...state, selectedMovie: action.payload };
    case 'SELECT_SEATS':
      return { ...state, selectedSeats: action.payload };
    case 'SELECT_SHOWTIME':
      return { ...state, showtime: action.payload };
    default:
      return state;
  }
};
