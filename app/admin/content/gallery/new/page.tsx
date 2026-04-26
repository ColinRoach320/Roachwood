import { Card } from "@/components/ui/Card";
import { GalleryForm } from "@/components/admin/GalleryForm";
import { createGalleryItem } from "../actions";

export default function NewGalleryPage() {
  return (
    <Card>
      <GalleryForm
        action={createGalleryItem}
        cancelHref="/admin/content/gallery"
        submitLabel="Add photo"
      />
    </Card>
  );
}
