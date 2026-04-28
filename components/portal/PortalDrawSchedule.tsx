"use client";

import * as React from "react";
import { CheckCircle2, Circle, Loader2, CreditCard } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { formatMoney, formatDate } from "@/lib/utils";
import { getDrawPaymentLink } from "@/app/portal/payments/actions";
import type { InvoiceDraw } from "@/lib/types";

interface Props {
  draws: InvoiceDraw[];
}

/**
 * Client-facing payment schedule. Visual states:
 *   paid       — green check, dim row
 *   current    — gold border, Pay Now button (the next unpaid draw)
 *   upcoming   — gray, no action (a future unpaid draw)
 *
 * "Current" is defined as the lowest-position draw that's not paid.
 * Everything after that is "upcoming" so the client only sees one
 * Pay Now at a time.
 */
export function PortalDrawSchedule({ draws }: Props) {
  const sorted = React.useMemo(
    () => draws.slice().sort((a, b) => a.position - b.position),
    [draws],
  );
  const currentIdx = sorted.findIndex((d) => d.status !== "paid");

  return (
    <ul className="mt-4 space-y-2">
      {sorted.map((d, i) => {
        if (d.status === "paid") {
          return (
            <DrawRow
              key={d.id}
              draw={d}
              tone="paid"
            />
          );
        }
        if (i === currentIdx) {
          return (
            <DrawRow
              key={d.id}
              draw={d}
              tone="current"
            />
          );
        }
        return <DrawRow key={d.id} draw={d} tone="upcoming" />;
      })}
    </ul>
  );
}

function DrawRow({
  draw,
  tone,
}: {
  draw: InvoiceDraw;
  tone: "paid" | "current" | "upcoming";
}) {
  const toast = useToast();
  const [busy, setBusy] = React.useState(false);

  async function pay() {
    setBusy(true);
    try {
      const res = await getDrawPaymentLink(draw.id);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      window.location.href = res.url;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not open payment.");
    } finally {
      setBusy(false);
    }
  }

  const wrapper =
    tone === "paid"
      ? "border-emerald-500/30 bg-emerald-500/5"
      : tone === "current"
        ? "border-gold-500/50 bg-gold-500/5"
        : "border-charcoal-700 bg-charcoal-900/40";

  return (
    <li
      className={`rounded-lg border p-3 ${wrapper}`}
      aria-label={`Draw ${draw.position}: ${tone}`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5">
          {tone === "paid" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          ) : tone === "current" ? (
            <Circle className="h-5 w-5 text-gold-400" />
          ) : (
            <Circle className="h-5 w-5 text-charcoal-600" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p
              className={
                tone === "paid"
                  ? "text-charcoal-300 line-through"
                  : tone === "upcoming"
                    ? "text-charcoal-400"
                    : "text-charcoal-50"
              }
            >
              <span className="text-[10px] uppercase tracking-[0.18em] mr-2">
                Draw {draw.position}
              </span>
              {draw.label}
            </p>
            <p
              className={
                tone === "paid"
                  ? "text-emerald-300 tabular-nums"
                  : tone === "current"
                    ? "font-display text-lg text-charcoal-50 tabular-nums"
                    : "text-charcoal-300 tabular-nums"
              }
            >
              {formatMoney(draw.amount)}
            </p>
          </div>
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-charcoal-500">
            {tone === "paid"
              ? `Paid${draw.paid_at ? ` ${formatDate(draw.paid_at)}` : ""}`
              : draw.due_date
                ? `Due ${formatDate(draw.due_date)}`
                : tone === "current"
                  ? "Due now"
                  : "Upcoming"}
          </p>

          {tone === "current" ? (
            <button
              type="button"
              onClick={pay}
              disabled={busy}
              className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-gold-500 text-xs font-semibold uppercase tracking-[0.22em] text-charcoal-950 hover:bg-gold-400 transition shadow-gold-glow disabled:opacity-60"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Opening…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" /> Pay this draw
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
