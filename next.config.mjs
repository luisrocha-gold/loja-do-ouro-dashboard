// Configuration readiness only; no credentials are logged.
if (process.env.VERCEL) console.info("[BI readiness]", JSON.stringify({
  url: Boolean(process.env.BI_SUPABASE_URL || process.env.SUPABASE_URL),
  privateReader: Boolean(process.env.BI_SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY),
  login: Boolean(process.env.DASHBOARD_USER && process.env.DASHBOARD_PASSWORD && process.env.DASHBOARD_SESSION_SECRET),
}));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
