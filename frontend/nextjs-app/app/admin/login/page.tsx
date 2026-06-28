"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { LanguageToggle } from "../../components/LanguageToggle";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell() {
  return (
    <main className="shell compact">
      <div className="pageTools">
        <Link className="backLink" href="/"><ArrowLeft size={18} /> 首页 / Home</Link>
        <LanguageToggle />
      </div>
      <section className="loginPanel">
        <LockKeyhole size={34} />
        <h1>后台登录 / Admin Login</h1>
        <p>正在加载... / Loading...</p>
      </section>
    </main>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json().catch(() => ({}));
    setLoading(false);

    if (!response.ok) {
      setError(result.error || "登录失败 / Login failed");
      return;
    }

    router.replace(searchParams.get("next") || "/admin");
  }

  return (
    <main className="shell compact">
      <div className="pageTools">
        <Link className="backLink" href="/"><ArrowLeft size={18} /> 首页 / Home</Link>
        <LanguageToggle />
      </div>

      <section className="loginPanel">
        <LockKeyhole size={34} />
        <h1>后台登录 / Admin Login</h1>
        <p>请输入管理员密码。密码保存在 Vercel 环境变量中，不会写在前端代码里。</p>
        <form onSubmit={login} className="loginForm">
          <label>
            管理员用户名 / Admin username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="admin"
              required
            />
          </label>
          <label>
            管理员密码 / Admin password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              required
            />
          </label>
          <button className="primaryButton" disabled={loading}>
            {loading ? "登录中... / Signing in..." : "进入后台 / Sign in"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    </main>
  );
}
