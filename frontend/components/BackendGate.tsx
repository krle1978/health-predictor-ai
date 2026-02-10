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

      const maxAttempts = 120; // ~2 min (with backoff capped at 1s)
      for (let i = 0; i < maxAttempts; i += 1) {
        if (cancelled) return;
        setAttempt(i + 1);

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);
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
          setError(`Backend nije spreman (HTTP ${res.status}). ${text ? "Odgovor: " + text : ""}`.trim());
        } catch (e: any) {
          setLastCheckedAt(Date.now());
          const msg = e?.name === "AbortError" ? "timeout" : (e?.message || "fetch failed");
          setError(`Ne mogu da kontaktiram backend (${msg}).`);
        }

        const delay = Math.min(1000, 250 * Math.pow(2, Math.min(i, 2)));
        await sleep(delay);
      }

      if (!cancelled) setChecking(false);
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
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-brandCyan/30 p-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-5 w-5 rounded-full border-2 border-brandCyan border-t-transparent animate-spin" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-brandBlue">Ucitavam backend...</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Aplikacija je privremeno zakljucana dok API ne bude spreman.
                </p>
                <p className="text-xs text-gray-500 mt-2 break-words">
                  API: /api/health{attempt ? ` • pokusaj ${attempt}` : ""}
                </p>
                {error && (
                  <div className="mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-gray-50 border border-gray-200 p-4">
              <h3 className="font-semibold text-brandBlue">Kako koristiti aplikaciju</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Izaberi modul: Heart / Diabetes / Stroke / Melanoma.</li>
                <li>Popuni sva polja brojevima (bez praznih vrednosti).</li>
                <li>Za Melanoma: ubaci jasnu sliku koze i klikni "Predict".</li>
                <li>Rezultat prikazuje predikciju i procenu sigurnosti (confidence).</li>
                <li>Ako dobijes gresku: proveri backend URL u environment var.</li>
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRefreshToken((n) => n + 1)}
                className="px-4 py-2 rounded-lg border border-brandCyan/40 text-brandBlue hover:bg-brandCyan/10 transition"
              >
                Pokusaj ponovo
              </button>
              <a
                href="/api/health"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-lg bg-brandCyan text-white font-semibold hover:bg-brandCyan/90 transition"
              >
                Otvori /health
              </a>
            </div>
          </div>
        </div>
      )}
    </BackendStatusContext.Provider>
  );
}
