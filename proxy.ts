import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, isAuthConfigured, validateSessionToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const hasLiveDataSecrets = Boolean(process.env.WINDSOR_API_KEY || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN);
  const configured = isAuthConfigured();

  if (!configured) {
    if (hasLiveDataSecrets) {
      return new NextResponse("Dashboard protection is not configured.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return NextResponse.next();
  if (path.startsWith("/api/cron/")) return NextResponse.next();

  const valid = await validateSessionToken(request.cookies.get(COOKIE_NAME)?.value);
  if (valid) return NextResponse.next();

  const login = new URL("/login", request.url);
  const redirect = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  if (redirect.startsWith("/") && !redirect.startsWith("//")) login.searchParams.set("redirect", redirect);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
