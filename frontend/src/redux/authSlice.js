export const initialState = {
  user: null,
  isLoggedIn: false,
  token: null
};

export const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        isLoggedIn: true,
        token: action.payload.token
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isLoggedIn: false,
        token: null
      };
    default:
      return state;
  }
};
