"use client";

import { RowActions } from "@/components/admin/RowActions";
import {
  toggleGalleryVisibility,
  deleteGalleryItem,
} from "@/app/admin/content/gallery/actions";

interface Props {
  id: string;
  visible: boolean;
  storagePath: string;
  title: string;
}

export function GalleryRowActions({
  id,
  visible,
  storagePath,
  title,
}: Props) {
  return (
    <RowActions
      editHref={`/admin/content/gallery/${id}/edit`}
      visible={visible}
      onToggleVisible={() => toggleGalleryVisibility(id, visible)}
      onDelete={() => deleteGalleryItem(id, storagePath)}
      deleteLabel={`Delete the photo “${title}”?`}
    />
  );
}
