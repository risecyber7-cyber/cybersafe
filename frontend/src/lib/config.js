const rawBackendUrl = process.env.REACT_APP_BACKEND_URL?.trim();

function normalizeLocalUrl(url) {
  return url.replace("://localhost", "://127.0.0.1");
}

export function getBackendUrl() {
  if (!rawBackendUrl) {
    return "";
  }
  return normalizeLocalUrl(rawBackendUrl.replace(/\/$/, ""));
}

export function getApiBase() {
  const backendUrl = getBackendUrl();
  return backendUrl ? `${backendUrl}/api` : "/api";
}

export function getWebSocketBase() {
  const backendUrl = getBackendUrl() || window.location.origin;
  const normalized = normalizeLocalUrl(backendUrl);
  return normalized.replace(/^http/, "ws");
}

export const BACKEND_URL = getBackendUrl();
export const API_BASE = getApiBase();
export const IS_VERCEL = window.location.hostname.endsWith(".vercel.app");
export const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL?.trim() || "support@example.com";
export const SSH_HOST_LABEL = process.env.REACT_APP_SSH_HOST?.trim() || "remote-host";
