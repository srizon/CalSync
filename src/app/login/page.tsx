"use client";

import { useEffect, useState } from "react";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setError(p.get("error"));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-8 px-4 py-12">
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          CalSync
        </h1>
        <p className="text-sm leading-relaxed text-zinc-400">
          Sign in with Google to open the dashboard. Calendar access is requested
          so CalSync can sync busy times across your connected accounts.
        </p>
      </header>

      {error ? (
        <div
          className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <div className="flex justify-center">
        <a
          href="/api/auth/google"
          className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          Continue with Google
        </a>
      </div>

      <p className="text-center text-[11px] leading-relaxed text-zinc-600">
        Production deployments should set{" "}
        <code className="text-zinc-500">CALSYNC_SESSION_SECRET</code> and
        optionally <code className="text-zinc-500">CALSYNC_ALLOWED_EMAILS</code>{" "}
        in <code className="text-zinc-500">.env.local</code>.
      </p>
    </main>
  );
}
