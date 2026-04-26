import { roundMoney } from "@/lib/utils";
import type { LineItem } from "@/lib/types";

export interface LineItemTotals {
  subtotal: number;
  tax_amount: number;
  total: number;
}

/**
 * Server-side reducer for the totals on an estimate or invoice. Each
 * line's `total` is recomputed from `quantity * unit_price` here so the
 * client's hidden JSON can't lie to us.
 */
export function computeLineTotals(
  rawItems: LineItem[],
  taxRate: number,
): { items: LineItem[]; totals: LineItemTotals } {
  const items: LineItem[] = rawItems.map((it) => {
    const quantity = Number(it.quantity ?? 0);
    const unitPrice = Number(it.unit_price ?? 0);
    const total = roundMoney(quantity * unitPrice);
    return {
      id: it.id,
      description: String(it.description ?? "").trim(),
      quantity,
      unit_price: unitPrice,
      total,
    };
  });

  const subtotal = roundMoney(items.reduce((sum, it) => sum + it.total, 0));
  const taxAmount = roundMoney((subtotal * taxRate) / 100);
  const total = roundMoney(subtotal + taxAmount);

  return {
    items,
    totals: { subtotal, tax_amount: taxAmount, total },
  };
}

/**
 * Parses the hidden line_items JSON blob defensively. Returns an empty
 * array on any malformed input rather than throwing.
 */
export function parseLineItemsJson(raw: unknown): LineItem[] {
  if (typeof raw !== "string") return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x) => x && typeof x === "object")
      .map((x): LineItem => {
        const it = x as Partial<LineItem>;
        return {
          id: typeof it.id === "string" ? it.id : crypto.randomUUID(),
          description: typeof it.description === "string" ? it.description : "",
          quantity: Number(it.quantity ?? 0),
          unit_price: Number(it.unit_price ?? 0),
          total: Number(it.total ?? 0),
        };
      });
  } catch {
    return [];
  }
}
