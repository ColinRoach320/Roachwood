"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";

interface Props {
  /** Query-string key. Defaults to `q`. */
  param?: string;
  placeholder?: string;
  /** Other params to clear when search changes (e.g. paging). */
  resetParams?: string[];
}

/**
 * Debounced URL-driven search field. Updates the `?q=` (or `?param=`)
 * query string ~250ms after typing stops, which causes the parent server
 * component to re-render with the filtered list.
 */
export function SearchInput({
  param = "q",
  placeholder = "Search…",
  resetParams = [],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(searchParams.get(param) ?? "");

  // Keep state in sync if URL changes via back/forward.
  React.useEffect(() => {
    setValue(searchParams.get(param) ?? "");
  }, [searchParams, param]);

  React.useEffect(() => {
    const t = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) next.set(param, trimmed);
      else next.delete(param);
      for (const k of resetParams) next.delete(k);
      const qs = next.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-400" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  );
}
