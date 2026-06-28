import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ADMIN_SESSION_COOKIE = "fundusx_admin_session";
const USER_SESSION_COOKIE = "fundusx_user_session";
const ADMIN_FAIL_COOKIE = "fundusx_admin_login_failures";
const ADMIN_LOCK_COOKIE = "fundusx_admin_login_lock_until";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const MAX_FAILURES = 3;

function bytesToBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function textToBase64Url(value: string) {
  return Buffer.from(value, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(payloadPart: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadPart));
  return bytesToBase64Url(new Uint8Array(signature));
}

export async function POST(request: NextRequest) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const configuredUsername = process.env.ADMIN_USERNAME || "admin";
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;

  if (!configuredPassword || !sessionSecret) {
    return NextResponse.json({ error: "Admin password is not configured" }, { status: 500 });
  }

  const lockedUntil = Number(request.cookies.get(ADMIN_LOCK_COOKIE)?.value || 0);
  if (lockedUntil > Date.now()) {
    const minutes = Math.ceil((lockedUntil - Date.now()) / (60 * 1000));
    return NextResponse.json(
      { error: `后台登录已锁定，请 ${minutes} 分钟后再试 / Admin login is locked. Try again in ${minutes} minutes.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "");
  const password = String(body.password || "");

  if (username !== configuredUsername || password !== configuredPassword) {
    const failures = Number(request.cookies.get(ADMIN_FAIL_COOKIE)?.value || 0) + 1;
    const response = NextResponse.json(
      {
        error:
          failures >= MAX_FAILURES
            ? "后台登录已锁定15分钟 / Admin login is locked for 15 minutes"
            : `用户名或密码错误，还剩 ${MAX_FAILURES - failures} 次机会 / Invalid username or password. ${MAX_FAILURES - failures} attempts left.`,
      },
      { status: failures >= MAX_FAILURES ? 429 : 401 }
    );

    if (failures >= MAX_FAILURES) {
      response.cookies.set(ADMIN_LOCK_COOKIE, String(Date.now() + LOCK_MS), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: Math.floor(LOCK_MS / 1000),
      });
      response.cookies.set(ADMIN_FAIL_COOKIE, "", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 0,
      });
    } else {
      response.cookies.set(ADMIN_FAIL_COOKIE, String(failures), {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: Math.floor(LOCK_MS / 1000),
      });
    }
    return response;
  }

  const payloadPart = textToBase64Url(JSON.stringify({ role: "admin", exp: Date.now() + ONE_DAY_MS }));
  const signaturePart = await sign(payloadPart, sessionSecret);
  const response = NextResponse.json({ ok: true });

  response.cookies.set(ADMIN_SESSION_COOKIE, `${payloadPart}.${signaturePart}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 24 * 60 * 60,
  });
  response.cookies.set(ADMIN_FAIL_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set(ADMIN_LOCK_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  const userSessionSecret = process.env.ACCESS_SESSION_SECRET || sessionSecret;
  const userPayloadPart = textToBase64Url(JSON.stringify({ role: "admin-user", mode: "admin", exp: Date.now() + ONE_DAY_MS }));
  const userSignaturePart = await sign(userPayloadPart, userSessionSecret);
  response.cookies.set(USER_SESSION_COOKIE, `${userPayloadPart}.${userSignaturePart}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 24 * 60 * 60,
  });

  return response;
}
