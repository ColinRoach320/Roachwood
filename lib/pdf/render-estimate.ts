import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { EstimatePDF } from "@/components/pdf/EstimatePDF";
import { shortId } from "@/components/pdf/styles";
import type { Estimate, Job, Client } from "@/lib/types";

export interface RenderedEstimatePDF {
  buffer: Buffer;
  filename: string;
}

export async function renderEstimatePDF(
  id: string,
): Promise<RenderedEstimatePDF | null> {
  const admin = createAdminClient();

  const { data: estimate } = await admin
    .from("estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle<Estimate>();
  if (!estimate) return null;

  const { data: job } = await admin
    .from("jobs")
    .select("id, title, address, client_id")
    .eq("id", estimate.job_id)
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

  const element = createElement(EstimatePDF, {
    estimate,
    job,
    client,
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  return {
    buffer,
    filename: `estimate-${shortId(estimate.id)}.pdf`,
  };
}
