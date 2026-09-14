import { Buffer } from "node:buffer";
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const username = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;
  const hasLiveDataSecrets = Boolean(
    process.env.WINDSOR_API_KEY || process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
  );

  // Fail closed as soon as live data credentials are present.
  if (!username || !password) {
    if (hasLiveDataSecrets) {
      return new NextResponse("Dashboard protection is not configured.", {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      });
    }
    return NextResponse.next();
  }

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      const suppliedUser = separator >= 0 ? decoded.slice(0, separator) : "";
      const suppliedPassword = separator >= 0 ? decoded.slice(separator + 1) : "";

      if (suppliedUser === username && suppliedPassword === password) {
        return NextResponse.next();
      }
    } catch {
      // Fall through to the authentication challenge.
    }
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Loja do Ouro Dashboard", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
