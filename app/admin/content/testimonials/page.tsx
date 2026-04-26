import { Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Badge } from "@/components/ui/Badge";
import { TestimonialRowActions } from "@/components/admin/TestimonialRowActions";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Testimonial } from "@/lib/types";

export default async function TestimonialsPage() {
  const supabase = await createClient();
  const { data: testimonials } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const list = (testimonials ?? []) as Testimonial[];
  const visibleCount = list.filter((t) => t.visible).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <p className="text-sm text-charcoal-400">
          {list.length} total · {visibleCount} live on the site.
        </p>
        <ButtonLink href="/admin/content/testimonials/new">
          <Plus className="h-4 w-4" /> New testimonial
        </ButtonLink>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>No testimonials yet</CardTitle>
              <CardDescription>
                Add the first one — it appears on the public site immediately.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((t) => (
            <article
              key={t.id}
              className="rw-card flex flex-col gap-3 p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg text-charcoal-50">
                    {t.client_name}
                  </p>
                  <p className="text-xs text-charcoal-400">
                    {t.location ?? "—"}
                  </p>
                </div>
                {t.visible ? (
                  <Badge tone="green">Live</Badge>
                ) : (
                  <Badge tone="neutral">Hidden</Badge>
                )}
              </div>
              <p className="text-gold-400 text-xs tracking-[3px]">
                {"★".repeat(t.star_rating)}
                <span className="text-charcoal-600">
                  {"★".repeat(5 - t.star_rating)}
                </span>
              </p>
              <p className="text-sm italic text-charcoal-200 leading-relaxed line-clamp-4">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-auto flex items-center justify-between border-t border-charcoal-700 pt-3 text-[11px] uppercase tracking-[0.16em]">
                <span className="text-charcoal-500">
                  {t.project_type ?? "—"} · {formatDate(t.created_at)}
                </span>
                <TestimonialRowActions
                  id={t.id}
                  visible={t.visible}
                  clientName={t.client_name}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
