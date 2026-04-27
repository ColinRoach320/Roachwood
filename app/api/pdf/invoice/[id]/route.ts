import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/pdf-auth";
import { InvoicePDF } from "@/components/pdf/InvoicePDF";
import { shortId } from "@/components/pdf/styles";
import type { Invoice, Job, Client } from "@/lib/types";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;
  const admin = createAdminClient();

  const { data: invoice, error: invErr } = await admin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle<Invoice>();
  if (invErr) return new Response(invErr.message, { status: 500 });
  if (!invoice) return new Response("Not found", { status: 404 });

  const { data: job } = await admin
    .from("jobs")
    .select("id, title, address, client_id")
    .eq("id", invoice.job_id)
    .maybeSingle<Pick<Job, "id" | "title" | "address" | "client_id">>();

  const { data: client } = job
    ? await admin
        .from("clients")
        .select("id, contact_name, company_name, email, phone, address")
        .eq("id", job.client_id)
        .maybeSingle<
          Pick<
            Client,
            | "id"
            | "contact_name"
            | "company_name"
            | "email"
            | "phone"
            | "address"
          >
        >()
    : { data: null };

  // See estimate route for why both casts are needed.
  const element = createElement(InvoicePDF, {
    invoice,
    job,
    client,
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  const filename = `invoice-${shortId(invoice.id)}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
