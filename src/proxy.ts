/**
 * MuggedMoments — Admin auth gate
 *
 * HTTP Basic Auth in front of the internal/admin surface only. Scoped by
 * `config.matcher` to /admin/* and /api/internal/* — every other route
 * (customer pages, vendor-facing API, public API) is completely unaffected;
 * this proxy never runs for them.
 *
 * Credentials come from ADMIN_USERNAME/ADMIN_PASSWORD (see .env — currently
 * placeholder values; must be set to real credentials before this protects
 * anything meaningfully).
 *
 * Renamed from middleware.ts to proxy.ts per Next.js 16's file-convention
 * migration (https://nextjs.org/docs/messages/middleware-to-proxy) — only
 * the file name and the exported function name change (middleware -> proxy);
 * the `config` export below is unchanged, confirmed against the official
 * migration doc before this rename was made.
 *
 * CRON EXCEPTION: Vercel Cron invokes /api/internal/run-reminders with a
 * `Authorization: Bearer <CRON_SECRET>` header, not Basic Auth — Vercel's
 * cron dispatcher has no way to supply a username/password. This is a
 * narrow, path-scoped bypass (exact pathname match only, not a prefix) so
 * every other /api/internal/* route keeps requiring Basic Auth exactly as
 * before. Set CRON_SECRET in both .env (local) and the Vercel project's
 * environment variables (production) — if it's unset, this bypass can
 * never match (isCronAuthorized returns false when the env var is empty),
 * so the route falls back to requiring Basic Auth same as any other.
 */

import { NextRequest, NextResponse } from "next/server";

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) return false;

  const decoded = atob(header.slice("Basic ".length));
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;

  const user = decoded.slice(0, separatorIndex);
  const pass = decoded.slice(separatorIndex + 1);

  return (
    user === process.env.ADMIN_USERNAME && pass === process.env.ADMIN_PASSWORD
  );
}

function isCronAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) return false;

  return header.slice("Bearer ".length) === secret;
}

export function proxy(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/api/internal/run-reminders" &&
    isCronAuthorized(request)
  ) {
    return NextResponse.next();
  }

  if (isAuthorized(request)) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="MuggedMoments Admin"' },
  });
}

export const config = {
  matcher: ["/admin/:path*", "/api/internal/:path*"],
};
