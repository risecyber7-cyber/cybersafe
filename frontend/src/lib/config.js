const rawBackendUrl = process.env.REACT_APP_BACKEND_URL?.trim();

export const BACKEND_URL = rawBackendUrl || "";
export const API_BASE = `${BACKEND_URL}/api`;
export const IS_VERCEL = window.location.hostname.endsWith(".vercel.app");
export const SUPPORT_EMAIL = process.env.REACT_APP_SUPPORT_EMAIL?.trim() || "support@example.com";
export const SSH_HOST_LABEL = process.env.REACT_APP_SSH_HOST?.trim() || "remote-host";
