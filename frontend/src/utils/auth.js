function base64UrlDecode(str) {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  try {
    return atob(padded);
  } catch {
    return null;
  }
}

export function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return null;
  const decoded = base64UrlDecode(parts[1]);
  if (!decoded) return null;

  try {
    return JSON.parse(decoded);
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
