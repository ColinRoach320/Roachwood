import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/pdf-auth";
import { EstimatePDF } from "@/components/pdf/EstimatePDF";
import { shortId } from "@/components/pdf/styles";
import type { Estimate, Job, Client } from "@/lib/types";

// @react-pdf/renderer relies on Node APIs; pin this handler to the Node
// runtime so it isn't accidentally compiled for Edge.
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

  const { data: estimate, error: estErr } = await admin
    .from("estimates")
    .select("*")
    .eq("id", id)
    .maybeSingle<Estimate>();
  if (estErr) return new Response(estErr.message, { status: 500 });
  if (!estimate) return new Response("Not found", { status: 404 });

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
            | "id"
            | "contact_name"
            | "company_name"
            | "email"
            | "phone"
            | "address"
          >
        >()
    : { data: null };

  // renderToBuffer's typing wants a `<Document>` element. Our component
  // renders one, but TS only sees its own prop shape — cast through the
  // library's expected element type. Cast Buffer → Uint8Array for the
  // Web Response BodyInit type (Node Buffer is a Uint8Array at runtime).
  const element = createElement(EstimatePDF, {
    estimate,
    job,
    client,
  }) as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(element);

  const filename = `estimate-${shortId(estimate.id)}.pdf`;
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
