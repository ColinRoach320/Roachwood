"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { formatMoney, roundMoney } from "@/lib/utils";
import type { LineItem } from "@/lib/types";

interface Props {
  initial?: LineItem[];
  initialTaxRate?: number;
}

function emptyLine(): LineItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: 1,
    unit_price: 0,
    total: 0,
  };
}

/**
 * Editable line-item table for estimates + invoices. Local state holds
 * the array; on every change a hidden <input name="line_items"> is
 * updated with a JSON blob so the parent server action can read the
 * final shape from FormData. A second hidden input mirrors the
 * tax_rate so totals stay in sync server-side.
 */
export function LineItemsEditor({ initial, initialTaxRate = 0 }: Props) {
  const [items, setItems] = React.useState<LineItem[]>(
    () => initial && initial.length > 0 ? initial.map(normalize) : [emptyLine()],
  );
  const [taxRate, setTaxRate] = React.useState<number>(initialTaxRate);

  function update(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => {
      const next = prev.slice();
      const item = { ...next[idx], ...patch };
      item.total = roundMoney(Number(item.quantity || 0) * Number(item.unit_price || 0));
      next[idx] = item;
      return next;
    });
  }

  function add() {
    setItems((prev) => [...prev, emptyLine()]);
  }

  function remove(idx: number) {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev,
    );
  }

  const subtotal = roundMoney(items.reduce((s, i) => s + (i.total || 0), 0));
  const taxAmount = roundMoney((subtotal * (Number(taxRate) || 0)) / 100);
  const total = roundMoney(subtotal + taxAmount);

  return (
    <div className="space-y-4">
      <input type="hidden" name="line_items" value={JSON.stringify(items)} />
      <input type="hidden" name="tax_rate" value={String(taxRate || 0)} />

      <div className="overflow-hidden rounded-lg border border-charcoal-700">
        <table className="w-full text-sm">
          <thead className="bg-charcoal-900/60">
            <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-charcoal-400">
              <th className="px-3 py-2 font-medium">Description</th>
              <th className="px-3 py-2 font-medium w-24 text-right">Qty</th>
              <th className="px-3 py-2 font-medium w-32 text-right">Unit price</th>
              <th className="px-3 py-2 font-medium w-32 text-right">Total</th>
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal-700">
            {items.map((it, idx) => (
              <tr key={it.id} className="bg-charcoal-900/30">
                <td className="px-3 py-2">
                  <Input
                    value={it.description}
                    onChange={(e) => update(idx, { description: e.target.value })}
                    placeholder="Cabinet, install, materials…"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={it.quantity}
                    onChange={(e) =>
                      update(idx, { quantity: Number(e.target.value || 0) })
                    }
                    className="text-right"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    min="0"
                    value={it.unit_price}
                    onChange={(e) =>
                      update(idx, { unit_price: Number(e.target.value || 0) })
                    }
                    className="text-right"
                  />
                </td>
                <td className="px-3 py-2 text-right text-charcoal-100 tabular-nums">
                  {formatMoney(it.total)}
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    disabled={items.length <= 1}
                    aria-label="Remove line"
                    className="rounded p-1.5 text-charcoal-400 hover:bg-charcoal-700/40 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Add line
        </Button>

        <div className="ml-auto w-full max-w-xs space-y-2 rounded-md border border-charcoal-700 bg-charcoal-900/40 p-4">
          <Row label="Subtotal" value={formatMoney(subtotal)} />
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-charcoal-300">Tax rate (%)</span>
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value || 0))}
              className="w-24 text-right"
            />
          </div>
          <Row label="Tax" value={formatMoney(taxAmount)} muted />
          <div className="border-t border-charcoal-700 pt-2">
            <Row label="Total" value={formatMoney(total)} bold />
          </div>
        </div>
      </div>
    </div>
  );
}

function normalize(it: LineItem): LineItem {
  return {
    id: it.id ?? crypto.randomUUID(),
    description: it.description ?? "",
    quantity: Number(it.quantity ?? 0),
    unit_price: Number(it.unit_price ?? 0),
    total: roundMoney(Number(it.quantity ?? 0) * Number(it.unit_price ?? 0)),
  };
}

function Row({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={muted ? "text-charcoal-400" : "text-charcoal-300"}>
        {label}
      </span>
      <span
        className={
          bold
            ? "font-display text-lg text-gold-300 tabular-nums"
            : "tabular-nums text-charcoal-100"
        }
      >
        {value}
      </span>
    </div>
  );
}
