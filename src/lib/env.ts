/**
 * Centralised, validated environment access.
 * Throws at boot if a required variable is missing so misconfig fails fast.
 */
function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

function optionalNum(name: string, fallback: number): number {
  const v = process.env[name];
  return v ? Number(v) : fallback;
}

export const env = {
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtAccessTtl: optionalNum("JWT_ACCESS_TTL", 900),
  jwtIssuer: process.env.JWT_ISSUER ?? "institutional-insights",
  refreshTtlDays: optionalNum("REFRESH_TTL_DAYS", 30),
  refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? "iid_rt",
  analyticsUrl: process.env.ANALYTICS_URL ?? "http://localhost:8000",
  reportsDir: process.env.REPORTS_DIR ?? "storage/reports",
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  isProd: process.env.NODE_ENV === "production",
};
