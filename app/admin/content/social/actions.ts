"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { safeFilename } from "@/lib/storage";
import type { SocialPlatform, SocialPostStatus } from "@/lib/types";

const BUCKET = "social";
const VALID_PLATFORMS: SocialPlatform[] = [
  "instagram",
  "facebook",
  "houzz",
  "other",
];
const VALID_STATUSES: SocialPostStatus[] = ["draft", "posted"];

function readMeta(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const platformRaw = get("platform") as SocialPlatform;
  const statusRaw = get("status") as SocialPostStatus;
  return {
    platform: VALID_PLATFORMS.includes(platformRaw) ? platformRaw : "instagram",
    status: VALID_STATUSES.includes(statusRaw) ? statusRaw : "draft",
    caption: get("caption"),
    hashtags: get("hashtags") || null,
    job_id: get("job_id") || null,
  };
}

function bust() {
  revalidatePath("/admin/content/social");
}

export async function createSocialPost(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const meta = readMeta(formData);
  if (!meta.caption) {
    return fail("Caption is required.", { caption: "Required." });
  }

  const file = formData.get("file");
  let storagePath: string | null = null;
  if (file instanceof File && file.size > 0) {
    const admin = createAdminClient();
    const path = `${Date.now()}-${safeFilename(file.name)}`;
    const upload = await admin.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
    if (upload.error) return fail(upload.error.message);
    storagePath = upload.data.path;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("social_posts").insert({
    ...meta,
    storage_path: storagePath,
    posted_at: meta.status === "posted" ? new Date().toISOString() : null,
  });
  if (error) {
    if (storagePath) {
      const admin = createAdminClient();
      await admin.storage.from(BUCKET).remove([storagePath]);
    }
    return fail(error.message);
  }
  bust();
  return ok("Post drafted.", "/admin/content/social");
}

export async function updateSocialPost(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const meta = readMeta(formData);
  if (!meta.caption) {
    return fail("Caption is required.", { caption: "Required." });
  }
  const supabase = await createClient();

  const file = formData.get("file");
  let storagePatch: { storage_path?: string } = {};
  if (file instanceof File && file.size > 0) {
    const admin = createAdminClient();
    const path = `${Date.now()}-${safeFilename(file.name)}`;
    const upload = await admin.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
    if (upload.error) return fail(upload.error.message);
    const { data: prev } = await supabase
      .from("social_posts")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle<{ storage_path: string | null }>();
    if (prev?.storage_path) {
      await admin.storage.from(BUCKET).remove([prev.storage_path]);
    }
    storagePatch = { storage_path: upload.data.path };
  }

  const { error } = await supabase
    .from("social_posts")
    .update({
      ...meta,
      ...storagePatch,
      posted_at: meta.status === "posted" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return fail(error.message);
  bust();
  return ok("Updated.", "/admin/content/social");
}

export async function setSocialPostStatus(
  id: string,
  status: SocialPostStatus,
): Promise<void> {
  if (!VALID_STATUSES.includes(status)) return;
  const supabase = await createClient();
  await supabase
    .from("social_posts")
    .update({
      status,
      posted_at: status === "posted" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  bust();
}

export async function deleteSocialPost(
  id: string,
  storagePath: string | null,
): Promise<void> {
  const admin = createAdminClient();
  if (storagePath) {
    await admin.storage.from(BUCKET).remove([storagePath]);
  }
  await admin.from("social_posts").delete().eq("id", id);
  bust();
}

export async function getSocialSignedUrl(
  storagePath: string,
): Promise<{ url: string | null }> {
  const admin = createAdminClient();
  const { data } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 10);
  return { url: data?.signedUrl ?? null };
}
