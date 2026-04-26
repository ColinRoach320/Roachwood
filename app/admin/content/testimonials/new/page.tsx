import { Card } from "@/components/ui/Card";
import { TestimonialForm } from "@/components/admin/TestimonialForm";
import { createTestimonial } from "../actions";

export default function NewTestimonialPage() {
  return (
    <Card>
      <TestimonialForm
        action={createTestimonial}
        cancelHref="/admin/content/testimonials"
        submitLabel="Create testimonial"
      />
    </Card>
  );
}
