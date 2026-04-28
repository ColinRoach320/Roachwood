import { requireAdmin } from "@/lib/pdf-auth";
import { renderChangeOrderPDF } from "@/lib/pdf/render-change-order";

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
  const rendered = await renderChangeOrderPDF(id);
  if (!rendered) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(rendered.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${rendered.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
