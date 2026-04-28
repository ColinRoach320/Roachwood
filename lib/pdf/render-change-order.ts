import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { ChangeOrderPDF } from "@/components/pdf/ChangeOrderPDF";
import type { ChangeOrder, Job, Client } from "@/lib/types";

export interface RenderedChangeOrderPDF {
  buffer: Buffer;
  filename: string;
}

export async function renderChangeOrderPDF(
  id: string,
): Promise<RenderedChangeOrderPDF | null> {
  const admin = createAdminClient();

  const { data: changeOrder } = await admin
    .from("change_orders")
    .select("*")
    .eq("id", id)
    .maybeSingle<ChangeOrder>();
  if (!changeOrder) return null;

  const { data: job } = await admin
    .from("jobs")
    .select("id, title, address, client_id")
    .eq("id", changeOrder.job_id)
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

  const element = createElement(ChangeOrderPDF, {
    changeOrder,
    job,
    client,
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return {
    buffer,
    filename: `change-order-CO-${changeOrder.co_number}.pdf`,
  };
}
