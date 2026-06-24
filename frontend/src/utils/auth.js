export function parseJwt(token) {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

export function clearStoredSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getValidStoredToken() {
  const token = localStorage.getItem("token");
  if (!token) return null;
  if (isTokenExpired(token)) {
    clearStoredSession();
    return null;
  }
  return token;
}
