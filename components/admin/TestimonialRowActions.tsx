"use client";

import { RowActions } from "@/components/admin/RowActions";
import {
  toggleTestimonialVisibility,
  deleteTestimonial,
} from "@/app/admin/content/testimonials/actions";

interface Props {
  id: string;
  visible: boolean;
  clientName: string;
}

export function TestimonialRowActions({ id, visible, clientName }: Props) {
  return (
    <RowActions
      editHref={`/admin/content/testimonials/${id}/edit`}
      visible={visible}
      onToggleVisible={() => toggleTestimonialVisibility(id, visible)}
      onDelete={() => deleteTestimonial(id)}
      deleteLabel={`Delete the testimonial from ${clientName}?`}
    />
  );
}
