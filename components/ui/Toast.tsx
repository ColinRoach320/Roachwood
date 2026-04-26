"use client";

import * as React from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "success" | "error" | "info";

interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}

interface ToastApi {
  toast: (message: string, tone?: Tone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = React.createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    // Render-time fallback so calls don't crash if a tree forgets the
    // provider; logs to console instead of silently swallowing.
    return {
      toast: (m) => console.warn("[toast]", m),
      success: (m) => console.warn("[toast:success]", m),
      error: (m) => console.warn("[toast:error]", m),
      info: (m) => console.warn("[toast:info]", m),
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const counter = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = React.useCallback(
    (message: string, tone: Tone = "info") => {
      counter.current += 1;
      const id = counter.current;
      setItems((prev) => [...prev, { id, tone, message }]);
      window.setTimeout(() => dismiss(id), tone === "error" ? 6500 : 4000);
    },
    [dismiss],
  );

  const api = React.useMemo<ToastApi>(
    () => ({
      toast: push,
      success: (m) => push(m, "success"),
      error: (m) => push(m, "error"),
      info: (m) => push(m, "info"),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[360px] max-w-[calc(100vw-3rem)] flex-col gap-2"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-premium backdrop-blur-md transition-all",
              t.tone === "success" &&
                "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
              t.tone === "error" &&
                "border-red-500/40 bg-red-500/15 text-red-100",
              t.tone === "info" &&
                "border-charcoal-600 bg-charcoal-800/95 text-charcoal-50",
            )}
          >
            <span className="mt-0.5 shrink-0">
              {t.tone === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : t.tone === "error" ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-gold-400" />
              )}
            </span>
            <p className="flex-1 text-sm leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-1 text-charcoal-300 hover:bg-charcoal-700/40 hover:text-charcoal-100"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
