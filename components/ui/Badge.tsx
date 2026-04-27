import * as React from "react";
import { cn } from "@/lib/utils";
import type {
  JobStatus,
  ApprovalStatus,
  EstimateStatus,
  InvoiceStatus,
  ExpenseCategory,
} from "@/lib/types";

type Tone = "neutral" | "gold" | "green" | "amber" | "red" | "blue";

const tones: Record<Tone, string> = {
  neutral: "bg-charcoal-700 text-charcoal-200 border-charcoal-600",
  gold:    "bg-gold-500/10 text-gold-300 border-gold-500/30",
  green:   "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  amber:   "bg-amber-500/10 text-amber-300 border-amber-500/30",
  red:     "bg-red-500/10 text-red-300 border-red-500/30",
  blue:    "bg-sky-500/10 text-sky-300 border-sky-500/30",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const jobStatusTone: Record<JobStatus, Tone> = {
  lead: "neutral",
  active: "blue",
  quoted: "neutral",
  approved: "gold",
  in_progress: "blue",
  on_hold: "amber",
  completed: "green",
  cancelled: "red",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge tone={jobStatusTone[status]}>{status.replace("_", " ")}</Badge>;
}

const approvalStatusTone: Record<ApprovalStatus, Tone> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return <Badge tone={approvalStatusTone[status]}>{status}</Badge>;
}

const estimateStatusTone: Record<EstimateStatus, Tone> = {
  draft: "neutral",
  sent: "blue",
  won: "green",
  lost: "red",
  no_response: "amber",
};

export function EstimateStatusBadge({ status }: { status: EstimateStatus }) {
  return (
    <Badge tone={estimateStatusTone[status]}>{status.replace("_", " ")}</Badge>
  );
}

const invoiceStatusTone: Record<InvoiceStatus, Tone> = {
  draft: "neutral",
  sent: "blue",
  paid: "green",
  overdue: "red",
};

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge tone={invoiceStatusTone[status]}>{status}</Badge>;
}

const expenseCategoryTone: Record<ExpenseCategory, Tone> = {
  materials: "blue",
  labor: "gold",
  subcontractor: "amber",
  equipment: "neutral",
  other: "neutral",
};

export function ExpenseCategoryBadge({ category }: { category: ExpenseCategory }) {
  return <Badge tone={expenseCategoryTone[category]}>{category}</Badge>;
}
