import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, HSTS } from "@/core/csp";

/**
 * Runs before every page. Only cheap, optimistic work happens here; the real checks are in layouts and services.
 *  - pages of an organisation without a session cookie go to /login; console pages without a platform cookie go to
 *    /platform/login;
 *  - each page gets a fresh nonce and its Content Security Policy, and HSTS over HTTPS.
 */
const PUBLIC = ["/login", "/o/", "/platform/login"];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
  const isPlatform = pathname === "/platform" || pathname.startsWith("/platform/");

  if (!isPublic) {
    const has = request.cookies.has(isPlatform ? "kosh_platform" : "kosh_session");
    if (!has) {
      const url = request.nextUrl.clone();
      url.pathname = isPlatform ? "/platform/login" : "/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  const https = (process.env.APP_URL ?? "").startsWith("https://");
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce, { dev: process.env.NODE_ENV === "development", https });
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname + search);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", csp);
  if (https) response.headers.set("Strict-Transport-Security", HSTS);
  return response;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|brand/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|woff2?)$).*)"],
};
