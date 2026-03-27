const rawBackendUrl = process.env.REACT_APP_BACKEND_URL?.trim();

export const BACKEND_URL = rawBackendUrl || "";
export const API_BASE = `${BACKEND_URL}/api`;
export const IS_VERCEL = window.location.hostname.endsWith(".vercel.app");
