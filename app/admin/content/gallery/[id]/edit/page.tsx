import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { GalleryForm } from "@/components/admin/GalleryForm";
import { createClient } from "@/lib/supabase/server";
import { galleryPublicUrl } from "@/lib/storage";
import { updateGalleryItem } from "../../actions";
import type { GalleryItem } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditGalleryPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: item } = await supabase
    .from("gallery_photos")
    .select("*")
    .eq("id", id)
    .maybeSingle<GalleryItem>();

  if (!item) notFound();

  const action = updateGalleryItem.bind(null, id);

  return (
    <Card>
      <GalleryForm
        item={item}
        currentImageUrl={galleryPublicUrl(item.storage_path)}
        action={action}
        cancelHref="/admin/content/gallery"
        submitLabel="Save changes"
      />
    </Card>
  );
}
