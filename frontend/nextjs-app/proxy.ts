import { NextRequest, NextResponse } from "next/server";

const ADMIN_SESSION_COOKIE = "fundusx_admin_session";
const USER_SESSION_COOKIE = "fundusx_user_session";

type SessionPayload = {
  role?: string;
  accountId?: string;
  sessionId?: string;
  exp?: number;
};

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

async function verifySession(token: string | undefined, secret: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  if (!secret) return null;

  const [payloadPart, signaturePart] = token.split(".");
  if (!payloadPart || !signaturePart) return null;

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
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadPart))) as SessionPayload;
  if (!payload.exp || payload.exp <= Date.now()) return null;
  return payload;
}

async function isCurrentSubscriptionSession(payload: SessionPayload | null) {
  if (!payload) return false;
  if (payload.role?.includes("admin")) return true;
  if (!payload.accountId || !payload.sessionId) return false;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return true;

  const response = await fetch(
    `${supabaseUrl}/rest/v1/subscription_accounts?id=eq.${payload.accountId}&select=active_session_id,is_active,expires_at`,
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    }
  );
  if (!response.ok) return false;
  const rows = await response.json() as Array<{ active_session_id: string | null; is_active: boolean; expires_at: string }>;
  const account = rows[0];
  if (!account || !account.is_active) return false;
  if (new Date(account.expires_at).getTime() <= Date.now()) return false;
  return account.active_session_id === payload.sessionId;
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

  if (pathname === "/api/reports") {
    const userPayload = await verifySession(
      request.cookies.get(USER_SESSION_COOKIE)?.value,
      process.env.ACCESS_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET
    );
    const isUserAuthenticated = await isCurrentSubscriptionSession(userPayload);
    const isAdminAuthenticatedForUserPage = await verifySession(
      request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
      process.env.ADMIN_SESSION_SECRET
    );
    if (isUserAuthenticated || isAdminAuthenticatedForUserPage) return NextResponse.next();
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isPublicRoute || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const userPayload = await verifySession(
    request.cookies.get(USER_SESSION_COOKIE)?.value,
    process.env.ACCESS_SESSION_SECRET || process.env.ADMIN_SESSION_SECRET
  );
  const isUserAuthenticated = await isCurrentSubscriptionSession(userPayload);
  const isAdminAuthenticatedForUserPage = await verifySession(
    request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    process.env.ADMIN_SESSION_SECRET
  );
  if (isUserAuthenticated || isAdminAuthenticatedForUserPage) return NextResponse.next();

  const userLoginUrl = request.nextUrl.clone();
  userLoginUrl.pathname = "/login";
  userLoginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(userLoginUrl);
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
