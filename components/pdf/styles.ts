import { StyleSheet } from "@react-pdf/renderer";

// Brand tokens used by both PDF templates. Kept in one place so the
// estimate and invoice stay visually consistent.
export const COLOR = {
  charcoal: "#2c2b28",
  gold: "#c8913a",
  cream: "#f7f5ef",
  rule: "#e2dccd",
  textMuted: "#6f6e6a",
  white: "#ffffff",
};

export const styles = StyleSheet.create({
  page: {
    paddingHorizontal: 48,
    paddingTop: 48,
    paddingBottom: 80,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: COLOR.charcoal,
    lineHeight: 1.4,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  brand: { flex: 1 },
  brandName: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: COLOR.charcoal,
    marginBottom: 6,
  },
  brandLine: {
    fontSize: 9,
    color: COLOR.textMuted,
    marginBottom: 1,
  },
  meta: { alignItems: "flex-end" },
  metaTitle: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 3,
    color: COLOR.gold,
    marginBottom: 6,
  },
  metaLine: {
    fontSize: 9,
    color: COLOR.charcoal,
    marginBottom: 1,
  },
  metaLabel: {
    fontSize: 8,
    color: COLOR.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginRight: 4,
  },

  rule: {
    height: 2,
    backgroundColor: COLOR.gold,
    marginBottom: 24,
    width: 48,
  },

  parties: {
    flexDirection: "row",
    gap: 24,
    marginBottom: 28,
  },
  party: { flex: 1 },
  partyLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLOR.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: COLOR.charcoal,
    marginBottom: 2,
  },
  partyText: {
    fontSize: 10,
    color: COLOR.charcoal,
    marginBottom: 1,
  },
  partyMuted: {
    fontSize: 10,
    color: COLOR.textMuted,
    marginBottom: 1,
  },

  badge: {
    alignSelf: "flex-end",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
    marginTop: 4,
  },
  badgeText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  table: {
    marginBottom: 16,
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: COLOR.charcoal,
    color: COLOR.white,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  tableHeadCell: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLOR.white,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottom: `0.5pt solid ${COLOR.rule}`,
  },
  tableRowAlt: {
    backgroundColor: COLOR.cream,
  },

  cellDescription: { flex: 4, paddingRight: 8 },
  cellQty: { flex: 1, textAlign: "right", paddingRight: 8 },
  cellUnit: { flex: 1.6, textAlign: "right", paddingRight: 8 },
  cellTotal: { flex: 1.6, textAlign: "right" },

  totals: {
    alignSelf: "flex-end",
    width: 240,
    marginTop: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 10,
    color: COLOR.textMuted,
  },
  totalValue: {
    fontSize: 10,
    color: COLOR.charcoal,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTop: `1pt solid ${COLOR.charcoal}`,
    marginTop: 4,
    paddingTop: 8,
  },
  grandLabel: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: COLOR.charcoal,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  grandValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: COLOR.gold,
  },

  notes: {
    marginTop: 24,
    padding: 12,
    backgroundColor: COLOR.cream,
    border: `0.5pt solid ${COLOR.rule}`,
  },
  notesLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: COLOR.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.4,
    marginBottom: 6,
  },
  notesText: {
    fontSize: 10,
    color: COLOR.charcoal,
    lineHeight: 1.5,
  },

  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    borderTop: `0.5pt solid ${COLOR.charcoal}`,
    paddingTop: 8,
    fontSize: 8,
    color: COLOR.textMuted,
    textAlign: "center",
    letterSpacing: 0.5,
  },
});

const STATUS_BG: Record<string, string> = {
  draft: "#e6e3dc",
  sent: "#dbe9f4",
  approved: "#dceee0",
  declined: "#f3dcdc",
  paid: "#dceee0",
  overdue: "#f3dcdc",
};
const STATUS_FG: Record<string, string> = {
  draft: COLOR.charcoal,
  sent: "#26568a",
  approved: "#27613a",
  declined: "#8a2626",
  paid: "#27613a",
  overdue: "#8a2626",
};

export function statusBadgeColors(status: string) {
  return {
    bg: STATUS_BG[status] ?? "#e6e3dc",
    fg: STATUS_FG[status] ?? COLOR.charcoal,
  };
}

/** USD formatter that matches the live admin tables. */
export function fmtMoney(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
}

export function fmtDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Phoenix",
  });
}

/** A short, document-style id ("a1b2c3d4") for the estimate/invoice number. */
export function shortId(id: string): string {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}
