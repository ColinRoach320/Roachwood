"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";

const BUCKET = "documents";

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200);
}

export async function uploadDocument(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  const jobId = String(formData.get("job_id") ?? "").trim() || null;
  const visibleToClient = formData.get("visible_to_client") === "on";
  const customName = String(formData.get("name") ?? "").trim();

  if (!(file instanceof File) || file.size === 0) {
    return fail("Pick a file to upload.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Not signed in.");

  const admin = createAdminClient();
  const stem = safeFilename(file.name);
  const path = `${jobId ?? "general"}/${Date.now()}-${stem}`;

  const upload = await admin.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upload.error) return fail(upload.error.message);

  const { error } = await admin.from("documents").insert({
    job_id: jobId,
    name: customName || file.name,
    storage_path: upload.data.path,
    visible_to_client: visibleToClient,
    uploaded_by: user.id,
  });
  if (error) {
    // Roll the file back so we don't leak orphan blobs.
    await admin.storage.from(BUCKET).remove([upload.data.path]);
    return fail(error.message);
  }

  revalidatePath("/admin/documents");
  if (jobId) revalidatePath(`/admin/jobs/${jobId}`);
  return ok("Uploaded.");
}

export async function deleteDocument(
  id: string,
  storagePath: string,
  jobId: string | null,
): Promise<ActionState> {
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([storagePath]);
  const { error } = await admin.from("documents").delete().eq("id", id);
  if (error) return fail(error.message);

  revalidatePath("/admin/documents");
  if (jobId) revalidatePath(`/admin/jobs/${jobId}`);
  return ok("Deleted.");
}

/**
 * Generates a short-lived signed URL the admin can click to download.
 * Stays server-side; never exposes the service role key.
 */
export async function getDocumentSignedUrl(
  storagePath: string,
): Promise<{ url: string | null; error?: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  if (error || !data) {
    return { url: null, error: error?.message ?? "Could not sign URL." };
  }
  return { url: data.signedUrl };
}
