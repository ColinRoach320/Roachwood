"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { safeFilename } from "@/lib/storage";

const BUCKET = "design-ideas";

export async function addDesignIdea(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const title = String(formData.get("title") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const imageUrl = String(formData.get("image_url") ?? "").trim() || null;
  const file = formData.get("file");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Sign in to share ideas.");

  let storagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const admin = createAdminClient();
    const path = `${jobId}/${user.id}/${Date.now()}-${safeFilename(file.name)}`;
    const upload = await admin.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
    if (upload.error) return fail(upload.error.message);
    storagePath = upload.data.path;
  }

  if (!imageUrl && !storagePath && !notes && !title) {
    return fail("Add a title, note, photo, or URL.");
  }

  const { error } = await supabase.from("design_ideas").insert({
    job_id: jobId,
    uploaded_by: user.id,
    title,
    notes,
    image_url: imageUrl,
    storage_path: storagePath,
  });
  if (error) {
    if (storagePath) {
      const admin = createAdminClient();
      await admin.storage.from(BUCKET).remove([storagePath]);
    }
    return fail(error.message);
  }

  revalidatePath(`/portal/jobs/${jobId}`);
  revalidatePath(`/admin/jobs/${jobId}`);
  return ok("Idea added.");
}

export async function getDesignIdeaSignedUrl(
  storagePath: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 30);
  return data?.signedUrl ?? null;
}

export async function deleteDesignIdea(
  id: string,
  storagePath: string | null,
  jobId: string,
): Promise<void> {
  const supabase = await createClient();
  if (storagePath) {
    const admin = createAdminClient();
    await admin.storage.from(BUCKET).remove([storagePath]);
  }
  await supabase.from("design_ideas").delete().eq("id", id);
  revalidatePath(`/portal/jobs/${jobId}`);
  revalidatePath(`/admin/jobs/${jobId}`);
}
