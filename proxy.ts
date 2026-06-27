import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "fundusx_admin_session";

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function verifySession(token: string | undefined) {
  if (!token) return false;
  const secret = process.env.ADMIN_SESSION_SECRET;
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

  if ((!isAdminPage && !isAdminApi) || isLoginRoute) {
    return NextResponse.next();
  }

  const isAuthenticated = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (isAuthenticated) {
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

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
