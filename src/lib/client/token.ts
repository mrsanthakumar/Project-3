/**
 * In-memory access-token store. The access token is deliberately NOT persisted
 * to localStorage (XSS-exfiltration risk) — it lives only in memory and is
 * re-minted from the httpOnly refresh cookie via /auth/refresh on page load.
 */
let accessToken: string | null = null;

export const getToken = () => accessToken;
export const setToken = (t: string | null) => {
  accessToken = t;
};
