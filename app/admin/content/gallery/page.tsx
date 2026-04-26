import { Plus } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Badge } from "@/components/ui/Badge";
import { GalleryRowActions } from "@/components/admin/GalleryRowActions";
import { createClient } from "@/lib/supabase/server";
import { galleryPublicUrl } from "@/lib/storage";
import { formatDate } from "@/lib/utils";
import type { GalleryItem } from "@/lib/types";

export default async function GalleryPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("gallery_photos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const list = (items ?? []) as GalleryItem[];
  const visibleCount = list.filter((g) => g.visible).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <p className="text-sm text-charcoal-400">
          {list.length} photo{list.length === 1 ? "" : "s"} ·{" "}
          {visibleCount} live on the site.
        </p>
        <ButtonLink href="/admin/content/gallery/new">
          <Plus className="h-4 w-4" /> Add photo
        </ButtonLink>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>No photos yet</CardTitle>
              <CardDescription>
                Upload finished work; the public photo grid pulls from this
                list.
              </CardDescription>
            </div>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((g) => (
            <article
              key={g.id}
              className="rw-card overflow-hidden flex flex-col"
            >
              <div className="aspect-[4/3] bg-charcoal-900 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={galleryPublicUrl(g.storage_path)}
                  alt={g.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base text-charcoal-50">
                      {g.title}
                    </p>
                    {g.service_type ? (
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-charcoal-400">
                        {g.service_type}
                      </p>
                    ) : null}
                  </div>
                  {g.visible ? (
                    <Badge tone="green">Live</Badge>
                  ) : (
                    <Badge tone="neutral">Hidden</Badge>
                  )}
                </div>
                {g.description ? (
                  <p className="text-sm text-charcoal-300 leading-relaxed line-clamp-3">
                    {g.description}
                  </p>
                ) : null}
                <div className="mt-auto flex items-center justify-between border-t border-charcoal-700 pt-3 text-[11px] uppercase tracking-[0.16em]">
                  <span className="text-charcoal-500">
                    {formatDate(g.created_at)}
                  </span>
                  <GalleryRowActions
                    id={g.id}
                    visible={g.visible}
                    storagePath={g.storage_path}
                    title={g.title}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
