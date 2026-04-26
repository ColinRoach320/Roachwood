import { createAdminClient } from "@/lib/supabase/server";

/** Strip unsafe characters from a user-supplied filename. */
export function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 200);
}

/**
 * Public CDN URL for a row in the public `gallery` bucket. The bucket is
 * marked public in 0005_content_storage.sql so this URL is safe to embed
 * in <img> tags without signing.
 */
export function galleryPublicUrl(storagePath: string): string {
  const admin = createAdminClient();
  const { data } = admin.storage.from("gallery").getPublicUrl(storagePath);
  return data.publicUrl;
}
