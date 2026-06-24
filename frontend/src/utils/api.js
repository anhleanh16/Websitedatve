export function getApiOrigin() {
  const base = import.meta.env.VITE_API_URL || "/api";

  if (/^https?:\/\//i.test(base)) {
    return new URL(base).origin;
  }

  if (typeof window !== "undefined") {
    return window.location.origin.replace(/:\d+$/, ":4000");
  }

  return "";
}

export function toAbsoluteAssetUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const origin = getApiOrigin();
  if (!origin) return value;

  if (value.startsWith("/")) {
    return `${origin}${value}`;
  }

  return `${origin}/${value}`;
}
