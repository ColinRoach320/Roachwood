"use client";

import * as React from "react";
import { Plus, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/admin/DateField";
import { MoneyInput } from "@/components/admin/MoneyInput";
import { formatMoney, roundMoney } from "@/lib/utils";

export interface DrawDraft {
  /** Stable id for React keys; matches server id when editing existing. */
  id: string;
  /** Existing DB id when editing; undefined for new rows. */
  db_id?: string;
  label: string;
  amount: number;
  due_date: string | null;
}

interface Props {
  /** Total of the invoice — drives the % display. */
  invoiceTotal: number;
  initial?: DrawDraft[];
}

const DEFAULT_TEMPLATE: Omit<DrawDraft, "id">[] = [
  { label: "Deposit", amount: 0, due_date: null },
  { label: "Midpoint", amount: 0, due_date: null },
  { label: "Completion", amount: 0, due_date: null },
];
const DEFAULT_PERCENTAGES = [30, 30, 40];

/**
 * Editable list of payment draws on an invoice. Each row carries a
 * label, percentage (display-only — derived from amount/total), dollar
 * amount (source of truth), and an optional due date. The amount is
 * what eventually gets charged via Stripe so we keep that as the only
 * persisted number; percentage is purely a UX affordance.
 *
 * Two-way bind: editing the % field updates the amount, editing the
 * amount field updates the % display. Running total + warning banner
 * shows whether the draws sum to the invoice total — but doesn't
 * block saving (Colin sometimes bills flat amounts that don't match
 * the invoice subtotal).
 */
export function DrawsEditor({ invoiceTotal, initial }: Props) {
  const [draws, setDraws] = React.useState<DrawDraft[]>(() => {
    if (initial && initial.length > 0) return initial.map(normalize);
    // Default template: 3 draws @ 30/30/40 of the invoice total.
    return DEFAULT_TEMPLATE.map((d, i) => ({
      ...d,
      id: crypto.randomUUID(),
      amount: roundMoney((invoiceTotal * DEFAULT_PERCENTAGES[i]) / 100),
    }));
  });

  // When invoiceTotal changes (line items edited), only re-derive
  // amounts for rows that look like fresh defaults — don't clobber a
  // value Colin just typed. We track which rows came from defaults via
  // the initial mount and let the user override freely after.
  React.useEffect(() => {
    setDraws((prev) =>
      prev.map((d, i) => {
        if (d.db_id || d.amount > 0) return d;
        const pct = DEFAULT_PERCENTAGES[i] ?? 0;
        if (!pct) return d;
        return { ...d, amount: roundMoney((invoiceTotal * pct) / 100) };
      }),
    );
  }, [invoiceTotal]);

  function update(idx: number, patch: Partial<DrawDraft>) {
    setDraws((prev) => {
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }

  function setPercentage(idx: number, pct: number) {
    if (invoiceTotal <= 0) return;
    update(idx, { amount: roundMoney((invoiceTotal * pct) / 100) });
  }

  function add() {
    setDraws((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        label: `Draw ${prev.length + 1}`,
        amount: 0,
        due_date: null,
      },
    ]);
  }

  function remove(idx: number) {
    setDraws((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  const sumAmount = roundMoney(draws.reduce((s, d) => s + (d.amount || 0), 0));
  const sumPct =
    invoiceTotal > 0 ? roundMoney((sumAmount / invoiceTotal) * 100) : 0;
  const balanced = invoiceTotal > 0 && Math.abs(sumAmount - invoiceTotal) < 0.01;

  return (
    <div className="space-y-4">
      <input type="hidden" name="draws" value={JSON.stringify(draws)} />

      <div className="overflow-hidden rounded-lg border border-charcoal-700">
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium w-24 text-right">%</th>
              <th className="px-3 py-2 font-medium w-32 text-right">Amount</th>
              <th className="px-3 py-2 font-medium w-40">Due date</th>
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {draws.map((d, idx) => {
              const pct =
                invoiceTotal > 0
                  ? roundMoney(((d.amount || 0) / invoiceTotal) * 100)
                  : 0;
              return (
                <tr key={d.id} className="bg-charcoal-900/30">
                  <td className="px-3 py-2">
                    <Input
                      value={d.label}
                      onChange={(e) => update(idx, { label: e.target.value })}
                      placeholder="Deposit, framing complete…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      max="100"
                      value={pct}
                      onChange={(e) =>
                        setPercentage(idx, Number(e.target.value || 0))
                      }
                      disabled={invoiceTotal <= 0}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <MoneyInput
                      value={d.amount}
                      onValueChange={(n) => update(idx, { amount: n })}
                      className="text-right"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <DateField
                      value={d.due_date ?? ""}
                      onChange={(e) =>
                        update(idx, { due_date: e.target.value || null })
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => remove(idx)}
                      disabled={draws.length <= 1}
                      aria-label="Remove draw"
                      className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add draw
        </Button>

        <div
          className={`ml-auto w-full max-w-xs space-y-2 rounded-md border p-4 ${
            balanced
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          <div className="flex items-center justify-between text-sm">
            <span className="text-charcoal-300">Total of draws</span>
            <span className="font-display text-lg text-charcoal-50 tabular-nums">
              {formatMoney(sumAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-charcoal-400">% of invoice</span>
            <span className="text-charcoal-200 tabular-nums">{sumPct}%</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-charcoal-400">Invoice total</span>
            <span className="text-charcoal-200 tabular-nums">
              {formatMoney(invoiceTotal)}
            </span>
          </div>
          <div className="border-t border-charcoal-700 pt-2 text-xs">
            {balanced ? (
              <div className="flex items-center gap-2 text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Draws balance the invoice.
              </div>
            ) : invoiceTotal <= 0 ? (
              <p className="text-charcoal-500">
                Add line items to compute percentages.
              </p>
            ) : (
              <div className="flex items-start gap-2 text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Draws don&apos;t add up to the invoice total — that&apos;s
                  fine if you&apos;re billing flat amounts.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function normalize(d: DrawDraft): DrawDraft {
  return {
    id: d.id ?? crypto.randomUUID(),
    db_id: d.db_id,
    label: d.label ?? "",
    amount: roundMoney(Number(d.amount ?? 0)),
    due_date: d.due_date ?? null,
  };
}
