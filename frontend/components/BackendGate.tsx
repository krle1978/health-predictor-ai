"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type BackendStatus = {
  ready: boolean;
  checking: boolean;
  error: string | null;
  lastCheckedAt: number | null;
};

const BackendStatusContext = createContext<BackendStatus | null>(null);

export function useBackendStatus(): BackendStatus {
  const ctx = useContext(BackendStatusContext);
  if (!ctx) {
    return {
      ready: false,
      checking: false,
      error: "BackendStatusProvider missing",
      lastCheckedAt: null,
    };
  }
  return ctx;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function BackendGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setReady(false);
      setChecking(true);
      setError(null);
      setAttempt(0);

      const requestTimeoutMs = 10_000;
      let i = 0;

      while (!cancelled) {
        if (cancelled) return;
        i += 1;
        setAttempt(i);

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
          const res = await fetch(`/api/health`, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }).finally(() => clearTimeout(timeout));

          setLastCheckedAt(Date.now());

          if (res.ok) {
            if (cancelled) return;
            setReady(true);
            setChecking(false);
            setError(null);
            return;
          }

          const text = await res.text().catch(() => "");
          let details = text.trim();
          try {
            const parsed = JSON.parse(text);
            details = [parsed?.error, parsed?.details, parsed?.hint, parsed?.body]
              .filter((v) => typeof v === "string" && v.trim().length > 0)
              .join(" | ");
          } catch {
            // Keep raw response text for non-JSON backend replies.
          }

          setError(`Backend is not ready (HTTP ${res.status})${details ? `: ${details}` : ""}`);
        } catch (e: any) {
          setLastCheckedAt(Date.now());
          const msg =
            e?.name === "AbortError" ? `timeout after ${requestTimeoutMs / 1000}s` : e?.message || "fetch failed";
          if (e?.name === "AbortError") {
            setError("Backend is still starting. Waiting for API to become ready...");
          } else {
            setError(`Cannot reach backend (${msg}).`);
          }
        }

        const delay = Math.min(3000, 250 * Math.pow(2, Math.min(i, 4)));
        await sleep(delay);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    if (!ready) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [ready]);

  const status = useMemo<BackendStatus>(
    () => ({ ready, checking, error, lastCheckedAt }),
    [ready, checking, error, lastCheckedAt]
  );

  return (
    <BackendStatusContext.Provider value={status}>
      <div
        aria-hidden={!ready}
        style={!ready ? { filter: "blur(2px)", pointerEvents: "none", userSelect: "none" } : undefined}
      >
        {children}
      </div>

      {!ready && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-brandCyan/30 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-5 w-5 animate-spin rounded-full border-2 border-brandCyan border-t-transparent" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-brandBlue">Loading backend...</h2>
                <p className="mt-1 text-sm text-gray-600">The app is temporarily locked until the API is ready.</p>
                <p className="mt-2 break-words text-xs text-gray-500">API: /api/health{attempt ? ` - attempt ${attempt}` : ""}</p>
                {error && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold text-brandBlue">How to use the app</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                <li>Pick a module: Heart / Diabetes / Stroke / Melanoma.</li>
                <li>Fill in all fields with numeric values (no empty fields).</li>
                <li>For Melanoma, upload a clear skin image and click "Predict".</li>
                <li>The result shows the prediction and confidence score.</li>
                <li>If you get an error, verify the backend URL in environment variables.</li>
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRefreshToken((n) => n + 1)}
                className="rounded-lg border border-brandCyan/40 px-4 py-2 text-brandBlue transition hover:bg-brandCyan/10"
              >
                Try again
              </button>
              <a
                href="/api/health"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg bg-brandCyan px-4 py-2 font-semibold text-white transition hover:bg-brandCyan/90"
              >
                Open /api/health
              </a>
            </div>
          </div>
        </div>
      )}
    </BackendStatusContext.Provider>
  );
}
