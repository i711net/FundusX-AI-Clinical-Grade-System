import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "fundusx_admin_session";
const USER_SESSION_COOKIE = "fundusx_user_session";

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function verifySession(token: string | undefined, secret: string | undefined) {
  if (!token) return false;
  if (!secret) return false;

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64UrlToBytes(signaturePart),
    new TextEncoder().encode(payloadPart)
  );
  if (!valid) return false;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart))) as { exp?: number };
  return Boolean(payload.exp && payload.exp > Date.now());
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith("/admin");
  const isAdminApi = pathname.startsWith("/api/admin");
  const isLoginRoute = pathname === "/admin/login" || pathname === "/api/admin/login";
  const isPublicRoute =
    pathname === "/login" ||
    pathname === "/api/access/login" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (isLoginRoute) {
    return NextResponse.next();
  }

  if (isAdminPage || isAdminApi) {
    const isAdminAuthenticated = await verifySession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value, process.env.ADMIN_SESSION_SECRET);
    if (isAdminAuthenticated) {
      return NextResponse.next();
    }

    if (isAdminApi) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicRoute || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isUserAuthenticated = await verifySession(
    request.cookies.get(USER_SESSION_COOKIE)?.value,
    process.env.ACCESS_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET
  );
  if (isUserAuthenticated) return NextResponse.next();

  const userLoginUrl = request.nextUrl.clone();
  userLoginUrl.pathname = "/login";
  userLoginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(userLoginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
