"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Mode } from "@/lib/contract";

type Status = { kind: "ok" | "err" | "info"; msg: string } | null;

export default function Controls() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [auto, setAuto] = useState(false);
  const [mode, setMode] = useState<Mode>("accelerated");

  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const busyRef = useRef(false);

  const flash = useCallback((s: NonNullable<Status>) => {
    setStatus(s);
    window.setTimeout(() => setStatus(null), 3500);
  }, []);

  // Generic POST helper. Guards against overlapping requests.
  const post = useCallback(
    async (url: string, body?: unknown): Promise<unknown | null> => {
      if (busyRef.current) return null;
      busyRef.current = true;
      setBusy(true);
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: body ? { "Content-Type": "application/json" } : undefined,
          body: body ? JSON.stringify(body) : undefined,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json().catch(() => ({}));
      } catch (e) {
        flash({ kind: "err", msg: (e as Error).message || "échec requête" });
        return null;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [flash],
  );

  const step = useCallback(async () => {
    const out = (await post("/api/agent/step")) as
      | { skipped?: boolean; verdict?: string }
      | null;
    if (!out) return;
    if (out.skipped) flash({ kind: "info", msg: "step ignoré (agent occupé)" });
    else flash({ kind: "ok", msg: `décision: ${out.verdict ?? "ok"}` });
  }, [post, flash]);

  const veto = useCallback(async () => {
    const out = await post("/api/agent/veto");
    if (out) flash({ kind: "ok", msg: "veto — config précédente réactivée" });
  }, [post, flash]);

  const toggleMode = useCallback(async () => {
    const next: Mode = mode === "live" ? "accelerated" : "live";
    const out = await post("/api/mode", { mode: next });
    if (out) {
      setMode(next);
      flash({ kind: "ok", msg: `mode → ${next === "live" ? "LIVE" : "SIM"}` });
    }
  }, [mode, post, flash]);

  const injectTrap = useCallback(async () => {
    const out = (await post("/api/sim", { pattern: "trap" })) as
      | { generated?: number }
      | null;
    if (out) flash({ kind: "ok", msg: `trafic injecté: ${out.generated ?? 0} events` });
  }, [post, flash]);

  const replayDemo = useCallback(async () => {
    const out = await post("/api/fallback");
    if (out) flash({ kind: "ok", msg: "démo scriptée rejouée (ship → reject → ship)" });
  }, [post, flash]);

  const resetDemo = useCallback(async () => {
    const out = await post("/api/reset");
    if (out) {
      setMode("accelerated");
      flash({ kind: "ok", msg: "reset — état propre, config baseline" });
    }
  }, [post, flash]);

  // Auto-advance: fire a step every 12s while enabled.
  useEffect(() => {
    if (!auto) {
      if (autoRef.current) {
        clearInterval(autoRef.current);
        autoRef.current = null;
      }
      return;
    }
    autoRef.current = setInterval(() => {
      void step();
    }, 12000);
    return () => {
      if (autoRef.current) {
        clearInterval(autoRef.current);
        autoRef.current = null;
      }
    };
  }, [auto, step]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-2.5">
        <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-400">
          Controls
        </span>
        <div className="ml-auto h-5">
          {status && (
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-mono ${
                status.kind === "ok"
                  ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                  : status.kind === "err"
                    ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/30"
                    : "bg-neutral-700/40 text-neutral-300 ring-1 ring-neutral-700"
              }`}
            >
              {status.msg}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-2.5">
          {/* Primary: advance the agent */}
          <button
            onClick={() => void step()}
            disabled={busy}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="text-base leading-none">▸</span>
            Avancer l&apos;agent
          </button>

          {/* Auto-advance toggle */}
          <button
            onClick={() => setAuto((v) => !v)}
            className={`inline-flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold ring-1 transition-colors ${
              auto
                ? "bg-sky-500/15 text-sky-300 ring-sky-500/40"
                : "bg-neutral-900 text-neutral-300 ring-neutral-700 hover:bg-neutral-800"
            }`}
          >
            <span>Auto-advance</span>
            <span
              className={`relative h-4 w-7 rounded-full transition-colors ${
                auto ? "bg-sky-500" : "bg-neutral-600"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${
                  auto ? "left-3.5" : "left-0.5"
                }`}
              />
            </span>
          </button>

          {/* Mode toggle */}
          <button
            onClick={() => void toggleMode()}
            disabled={busy}
            className={`inline-flex items-center justify-between rounded-lg px-3 py-2.5 text-xs font-semibold ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              mode === "live"
                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/40"
                : "bg-amber-500/15 text-amber-300 ring-amber-500/40"
            }`}
          >
            <span>Mode</span>
            <span className="font-mono uppercase tracking-wider">
              {mode === "live" ? "LIVE" : "[SIM]"}
            </span>
          </button>

          {/* Inject trap traffic (sim) */}
          <button
            onClick={() => void injectTrap()}
            disabled={busy}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-800 px-4 py-2.5 text-sm font-medium text-neutral-200 ring-1 ring-neutral-700 transition-colors hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Injecter trafic
            <span className="font-mono text-[11px] uppercase tracking-wider text-amber-300">
              [SIM]
            </span>
          </button>

          {/* Veto — destructive secondary */}
          <button
            onClick={() => void veto()}
            disabled={busy}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ⟲ Veto — revenir au précédent
          </button>
        </div>

        <div className="mt-1 border-t border-neutral-800 pt-3">
          <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500">
            Démo
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Scripted money-shot: ship trap -> REJECT -> ship winner */}
            <button
              onClick={() => void replayDemo()}
              disabled={busy}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-violet-500 px-4 py-2.5 text-sm font-semibold text-violet-950 transition-colors hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ▶︎ Rejouer la démo scriptée
            </button>
            {/* Reset to a clean baseline so the demo is repeatable */}
            <button
              onClick={() => void resetDemo()}
              disabled={busy}
              className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-300 ring-1 ring-neutral-700 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ⟲ Reset (état propre)
            </button>
          </div>
        </div>

        <p className="text-[10px] font-mono leading-relaxed text-neutral-600">
          Avancer = un pas de raisonnement. Auto = un pas / 12s. Veto annule le
          dernier ship. [SIM] génère du trafic déterministe. Rejouer = run scripté
          garanti (ship → reject → ship). Reset = repartir propre.
        </p>
      </div>
    </div>
  );
}
