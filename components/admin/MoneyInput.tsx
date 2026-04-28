"use client";

import * as React from "react";
import { Input } from "@/components/ui/Input";

type Props = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "defaultValue"
> & {
  defaultValue?: number | string | null;
  /**
   * Controlled value. When set together with onValueChange, the field
   * mirrors the prop instead of running its own state — used by
   * components like DrawsEditor that store amounts in JSON state.
   */
  value?: number | string | null;
  /** Fires with the parsed numeric value (commas stripped). */
  onValueChange?: (n: number) => void;
};

/**
 * Number input that formats with thousands separators as the user
 * types ("1500" → "1,500"). Two modes:
 *
 *   - Uncontrolled (default): seed via `defaultValue`, submit via
 *     `name`. parseNumber() in lib/utils strips commas server-side.
 *   - Controlled: pass `value` + `onValueChange`. Display syncs to the
 *     incoming prop only when the prop's numeric value diverges from
 *     what the field is currently showing — so trailing dots and
 *     in-progress decimals don't get clobbered between renders.
 */
export function MoneyInput({
  defaultValue,
  value,
  onValueChange,
  ...rest
}: Props) {
  const controlled = value !== undefined && onValueChange !== undefined;

  const [display, setDisplay] = React.useState<string>(() =>
    controlled ? formatPretty(value) : formatPretty(defaultValue),
  );

  React.useEffect(() => {
    if (!controlled) return;
    const propNum = Number(value ?? 0);
    const displayNum = parseToNumber(display);
    if (
      Number.isFinite(propNum) &&
      Math.abs(propNum - displayNum) > 0.001
    ) {
      setDisplay(formatPretty(propNum));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <Input
      {...rest}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={display}
      onChange={(e) => {
        const next = formatLive(e.target.value);
        setDisplay(next);
        if (controlled) onValueChange!(parseToNumber(next));
      }}
    />
  );
}

function parseToNumber(s: string): number {
  if (!s) return 0;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Live formatter — keeps the user's caret-friendly state. Does NOT
 * coerce trailing dots away ("12." stays as the user types) and only
 * applies the thousands separator to the integer portion.
 */
function formatLive(raw: string): string {
  const cleaned = raw.replace(/[^0-9.]/g, "");

  // Drop any second-or-later dots so "1.2.3" can't happen.
  const firstDot = cleaned.indexOf(".");
  const limited =
    firstDot === -1
      ? cleaned
      : cleaned.slice(0, firstDot + 1) +
        cleaned.slice(firstDot + 1).replace(/\./g, "");

  if (limited === "") return "";

  const [intRaw, decRaw] = limited.split(".");
  const intPart = intRaw === "" ? "" : Number(intRaw).toLocaleString("en-US");
  if (decRaw === undefined) return intPart;
  return `${intPart}.${decRaw.slice(0, 2)}`;
}

/** One-shot pretty format used to seed the field from a saved value. */
function formatPretty(value: number | string | null | undefined): string {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : Number(String(value));
  if (!Number.isFinite(n)) return "";
  // Only show .XX when there's actually a fractional part, otherwise
  // dollar amounts read as "1,500" rather than "1,500.00".
  return Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}
