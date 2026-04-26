"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { safeFilename } from "@/lib/storage";

const BUCKET = "documents";

/**
 * Upload a progress photo to a job. Stored in the `documents` bucket and
 * indexed in `documents` with kind='photo' so it's separate from PDFs.
 */
export async function uploadJobPhoto(
  jobId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  const visibleToClient = formData.get("visible_to_client") !== "off";
  if (!(file instanceof File) || file.size === 0) {
    return fail("Pick a photo to upload.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("Not signed in.");

  const admin = createAdminClient();
  const path = `${jobId}/photos/${Date.now()}-${safeFilename(file.name)}`;
  const upload = await admin.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });
  if (upload.error) return fail(upload.error.message);

  const { error } = await admin.from("documents").insert({
    job_id: jobId,
    name: file.name,
    storage_path: upload.data.path,
    visible_to_client: visibleToClient,
    uploaded_by: user.id,
    kind: "photo",
  });
  if (error) {
    await admin.storage.from(BUCKET).remove([upload.data.path]);
    return fail(error.message);
  }

  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath(`/portal/jobs/${jobId}`);
  return ok("Photo uploaded.");
}

export async function deleteJobPhoto(
  id: string,
  storagePath: string,
  jobId: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([storagePath]);
  await admin.from("documents").delete().eq("id", id);
  revalidatePath(`/admin/jobs/${jobId}`);
  revalidatePath(`/portal/jobs/${jobId}`);
}
