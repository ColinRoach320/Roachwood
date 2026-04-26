import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { TestimonialForm } from "@/components/admin/TestimonialForm";
import { createClient } from "@/lib/supabase/server";
import { updateTestimonial } from "../../actions";
import type { Testimonial } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTestimonialPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: testimonial } = await supabase
    .from("testimonials")
    .select("*")
    .eq("id", id)
    .maybeSingle<Testimonial>();

  if (!testimonial) notFound();

  const action = updateTestimonial.bind(null, id);

  return (
    <Card>
      <TestimonialForm
        testimonial={testimonial}
        action={action}
        cancelHref="/admin/content/testimonials"
        submitLabel="Save changes"
      />
    </Card>
  );
}
