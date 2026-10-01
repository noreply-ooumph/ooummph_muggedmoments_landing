import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Expose these vars to the Edge Runtime (proxy.ts / middleware) so that
  // process.env.ADMIN_USERNAME etc. are available there. Without this block
  // the Edge Runtime sees undefined for all non-NEXT_PUBLIC_ env vars and
  // every Basic Auth attempt is rejected with a 401.
  devIndicators: false,
  env: {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME ?? "",
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "",
    CRON_SECRET: process.env.CRON_SECRET ?? "",
  },
};

export default nextConfig;
