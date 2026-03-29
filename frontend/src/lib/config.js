const rawBackendUrl = process.env.REACT_APP_BACKEND_URL?.trim();
const sshTerminalFlag = process.env.REACT_APP_ENABLE_SSH_TERMINAL?.trim().toLowerCase();
const hostName = typeof window !== "undefined" ? window.location.hostname : "";

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
export const IS_VERCEL = hostName.endsWith(".vercel.app");
export const SERVERLESS_RUNTIME = IS_VERCEL;
export const SSH_TERMINAL_ENABLED = sshTerminalFlag === "true" && !IS_VERCEL;
export const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL?.trim() || "support@example.com";
export const SSH_HOST_LABEL = process.env.REACT_APP_SSH_HOST?.trim() || "remote-host";
