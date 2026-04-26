"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { safeFilename } from "@/lib/storage";
import type { ServiceType } from "@/lib/types";

const BUCKET = "gallery";
const VALID_SERVICE_TYPES: ServiceType[] = [
  "kitchen",
  "cabinetry",
  "deck",
  "interior",
  "other",
];

function readMeta(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  const service = get("service_type") as ServiceType;
  const sortRaw = Number(get("sort_order") || 0);
  return {
    title: get("title"),
    description: get("description") || null,
    service_type: VALID_SERVICE_TYPES.includes(service) ? service : null,
    visible: formData.get("visible") === "on",
    sort_order: Number.isFinite(sortRaw) ? sortRaw : 0,
  };
}

function bust() {
  revalidatePath("/admin/content/gallery");
  revalidatePath("/", "layout");
}

export async function createGalleryItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return fail("Pick a photo to upload.");
  }
  const meta = readMeta(formData);
  if (!meta.title) return fail("Title is required.", { title: "Required." });

  const admin = createAdminClient();
  const path = `${Date.now()}-${safeFilename(file.name)}`;
  const upload = await admin.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type || undefined,
    upsert: false,
  });
  if (upload.error) return fail(upload.error.message);

  const supabase = await createClient();
  const { error } = await supabase.from("gallery_items").insert({
    ...meta,
    storage_path: upload.data.path,
  });
  if (error) {
    await admin.storage.from(BUCKET).remove([upload.data.path]);
    return fail(error.message);
  }
  bust();
  return ok("Photo added.", "/admin/content/gallery");
}

export async function updateGalleryItem(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const meta = readMeta(formData);
  if (!meta.title) return fail("Title is required.", { title: "Required." });

  const supabase = await createClient();
  // Optionally swap the photo on edit.
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

    // Look up the old path so we can clean it up after the row update.
    const { data: prev } = await supabase
      .from("gallery_items")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle<{ storage_path: string }>();
    storagePatch = { storage_path: upload.data.path };
    if (prev?.storage_path) {
      await admin.storage.from(BUCKET).remove([prev.storage_path]);
    }
  }

  const { error } = await supabase
    .from("gallery_items")
    .update({ ...meta, ...storagePatch })
    .eq("id", id);
  if (error) return fail(error.message);
  bust();
  return ok("Updated.", "/admin/content/gallery");
}

export async function toggleGalleryVisibility(
  id: string,
  current: boolean,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("gallery_items")
    .update({ visible: !current })
    .eq("id", id);
  bust();
}

export async function deleteGalleryItem(
  id: string,
  storagePath: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin.storage.from(BUCKET).remove([storagePath]);
  await admin.from("gallery_items").delete().eq("id", id);
  bust();
}
