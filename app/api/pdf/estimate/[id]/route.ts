import { requireAdmin } from "@/lib/pdf-auth";
import { renderEstimatePDF } from "@/lib/pdf/render-estimate";

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
  const rendered = await renderEstimatePDF(id);
  if (!rendered) return new Response("Not found", { status: 404 });

  // `inline` so Colin can hit Print from his phone without first
  // saving the file. Cast Buffer → Uint8Array for the Web Response type.
  return new Response(new Uint8Array(rendered.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${rendered.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
