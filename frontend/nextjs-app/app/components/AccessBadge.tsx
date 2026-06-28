"use client";

import { useEffect, useState } from "react";

type AccessInfo = {
  authenticated: boolean;
  role?: string;
  remainingDays?: number;
};

export function AccessBadge() {
  const [accessInfo, setAccessInfo] = useState<AccessInfo | null>(null);

  useEffect(() => {
    fetch("/api/access/me")
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setAccessInfo(data))
      .catch(() => setAccessInfo(null));
  }, []);

  if (!accessInfo?.authenticated) return null;

  return (
    <span className="accessBadge">
      {accessInfo.role?.includes("admin")
        ? "管理员 / Admin"
        : `剩余 ${accessInfo.remainingDays ?? 0} 天 / ${accessInfo.remainingDays ?? 0} days left`}
    </span>
  );
}
