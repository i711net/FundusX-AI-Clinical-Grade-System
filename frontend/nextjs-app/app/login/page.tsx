"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Activity, LockKeyhole } from "lucide-react";
import { LanguageToggle } from "../components/LanguageToggle";

export default function LoginPage() {
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
        <Link className="brand" href="/login"><Activity size={24} /> FundusX-AI</Link>
        <LanguageToggle />
      </div>
      <section className="loginPanel">
        <LockKeyhole size={34} />
        <h1>用户登录 / User Login</h1>
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

    const response = await fetch("/api/access/login", {
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

    router.replace(searchParams.get("next") || "/");
  }

  return (
    <main className="shell compact">
      <div className="pageTools">
        <Link className="brand" href="/login"><Activity size={24} /> FundusX-AI</Link>
        <LanguageToggle />
      </div>

      <section className="loginPanel">
        <LockKeyhole size={34} />
        <h1>用户登录 / User Login</h1>
        <p>请输入用户名和密码。订阅到期后账号会自动失效。</p>
        <form onSubmit={login} className="loginForm">
          <label>
            用户名 / Username
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="doctor001"
              required
            />
          </label>
          <label>
            密码或访问码 / Password or access code
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="FX-XXXXXXXX-XXXXXX"
              required
            />
          </label>
          <button className="primaryButton" disabled={loading}>
            {loading ? "登录中... / Signing in..." : "进入系统 / Sign in"}
          </button>
          {error && <p className="error">{error}</p>}
        </form>
      </section>
    </main>
  );
}
