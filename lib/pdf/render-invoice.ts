import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { InvoicePDF } from "@/components/pdf/InvoicePDF";
import { shortId } from "@/components/pdf/styles";
import type { Invoice, Job, Client } from "@/lib/types";

export interface RenderedInvoicePDF {
  buffer: Buffer;
  filename: string;
}

export async function renderInvoicePDF(
  id: string,
): Promise<RenderedInvoicePDF | null> {
  const admin = createAdminClient();

  const { data: invoice } = await admin
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle<Invoice>();
  if (!invoice) return null;

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
            "id" | "contact_name" | "company_name" | "email" | "phone" | "address"
          >
        >()
    : { data: null };

  const element = createElement(InvoicePDF, {
    invoice,
    job,
    client,
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return {
    buffer,
    filename: `invoice-${shortId(invoice.id)}.pdf`,
  };
}
