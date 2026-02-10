"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type BackendStatus = {
  ready: boolean;
  checking: boolean;
  error: string | null;
  baseUrl: string | null;
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
      baseUrl: null,
      lastCheckedAt: null,
    };
  }
  return ctx;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function BackendGate({ children }: { children: React.ReactNode }) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE || null;

  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (!baseUrl) {
      setReady(false);
      setChecking(false);
      setError(
        "NEXT_PUBLIC_API_BASE nije podešen. Kreiraj `frontend/.env.local` (kopiraj iz `frontend/.env.example`) i upiši npr. NEXT_PUBLIC_API_BASE=http://127.0.0.1:8000 (ili tvoj Render URL), pa restartuj frontend."
      );
      return;
    }

    const run = async () => {
      setReady(false);
      setChecking(true);
      setError(null);
      setAttempt(0);

      const maxAttempts = 120; // ~2 min at 1s cadence after initial backoff
      for (let i = 0; i < maxAttempts; i += 1) {
        if (cancelled) return;
        setAttempt(i + 1);

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
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

        // Backoff: 250ms -> 500ms -> 1s (cap)
        const delay = Math.min(1000, 250 * Math.pow(2, Math.min(i, 2)));
        await sleep(delay);
      }

      if (!cancelled) {
        setChecking(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, refreshToken]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    if (!ready) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [ready]);

  const status = useMemo<BackendStatus>(
    () => ({ ready, checking, error, baseUrl, lastCheckedAt }),
    [ready, checking, error, baseUrl, lastCheckedAt]
  );

  return (
    <BackendStatusContext.Provider value={status}>
      <div
        aria-hidden={!ready}
        style={
          !ready
            ? { filter: "blur(2px)", pointerEvents: "none", userSelect: "none" }
            : undefined
        }
      >
        {children}
      </div>

      {!ready && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-brandCyan/30 p-6">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-5 w-5 rounded-full border-2 border-brandCyan border-t-transparent animate-spin" />
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-brandBlue">
                  Učitavam backend…
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Aplikacija je privremeno zaključana dok API ne bude spreman.
                </p>
                <p className="text-xs text-gray-500 mt-2 break-words">
                  {baseUrl ? `API: ${baseUrl}` : "API nije podešen"}
                  {attempt ? ` • pokušaj ${attempt}` : ""}
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
                <li>Za Melanoma: ubaci jasnu sliku kože i klikni “Predict”.</li>
                <li>Rezultat prikazuje predikciju i procenu sigurnosti (confidence).</li>
                <li>Ako dobiješ grešku: proveri API URL i osveži stranicu.</li>
              </ul>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setRefreshToken((n) => n + 1);
                }}
                className="px-4 py-2 rounded-lg border border-brandCyan/40 text-brandBlue hover:bg-brandCyan/10 transition"
              >
                Pokušaj ponovo
              </button>
              <a
                href={baseUrl ? `${baseUrl.replace(/\/$/, "")}/health` : undefined}
                target="_blank"
                rel="noreferrer"
                aria-disabled={!baseUrl}
                tabIndex={baseUrl ? 0 : -1}
                onClick={(e) => {
                  if (!baseUrl) e.preventDefault();
                }}
                className={
                  baseUrl
                    ? "px-4 py-2 rounded-lg bg-brandCyan text-white font-semibold hover:bg-brandCyan/90 transition"
                    : "px-4 py-2 rounded-lg bg-gray-200 text-gray-500 font-semibold cursor-not-allowed"
                }
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
