"use server";

import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { type ActionState, fail, ok } from "@/lib/actions";
import { requireAdmin } from "@/lib/pdf-auth";

function readClientForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    contact_name: get("contact_name"),
    company_name: get("company_name") || null,
    email: get("email") || null,
    phone: get("phone") || null,
    address: get("address") || null,
    notes: get("notes") || null,
  };
}

function validateClient(input: ReturnType<typeof readClientForm>) {
  const errors: Record<string, string> = {};
  if (!input.contact_name) errors.contact_name = "Contact name is required.";
  if (input.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

export async function createClientRecord(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readClientForm(formData);
  const errors = validateClient(input);
  if (Object.keys(errors).length > 0) {
    return { ...fail("Please fix the highlighted fields.", errors) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(input)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return fail(error?.message ?? "Could not save client.");
  }

  revalidatePath("/admin/clients");
  revalidatePath("/admin");
  return ok("Client created.", `/admin/clients/${data.id}`);
}

export async function updateClientRecord(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const input = readClientForm(formData);
  const errors = validateClient(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error) return fail(error.message);

  revalidatePath(`/admin/clients/${id}`);
  revalidatePath("/admin/clients");
  return ok("Client updated.", `/admin/clients/${id}`);
}

export async function deleteClientRecord(
  id: string,
): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/clients");
  return ok("Client deleted.", "/admin/clients");
}

/**
 * Email the client a magic-link invite to the portal.
 *
 *   1. Service-role generateLink builds a one-time, 24h-valid link
 *      that signs the user in on click + lands them on /portal with
 *      ?welcome=1 so the welcome banner fires.
 *   2. Resend ships the branded HTML email (subject + body from the
 *      brief). The link is the only credential — no password setup.
 *   3. clients.portal_invited_at gets stamped so the button can show
 *      "Resend portal invite · last sent <date>" on re-render.
 *
 * If the client has no email on file, returns a fail() with copy
 * telling Colin to add one — same as the old placeholder.
 */
export async function sendPortalInvite(
  clientId: string,
): Promise<ActionState> {
  const auth = await requireAdmin();
  if (!auth.ok) return fail("Not authorized.");

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return fail(
      "Email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
    );
  }

  const supabase = await createClient();
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, contact_name, email")
    .eq("id", clientId)
    .maybeSingle<{ id: string; contact_name: string; email: string | null }>();
  if (clientErr) return fail(clientErr.message);
  if (!client) return fail("Client not found.");
  if (!client.email) {
    return fail("Client has no email address — add one before sending invite.");
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "https://www.roachwood.co";
  const redirectTo = `${baseUrl}/portal?welcome=1`;

  const admin = createAdminClient();
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: client.email,
      options: { redirectTo },
    });
  if (linkErr || !linkData?.properties?.action_link) {
    return fail(linkErr?.message ?? "Could not generate magic link.");
  }
  const magicLink = linkData.properties.action_link;

  const firstName = client.contact_name.split(" ")[0]?.trim() || "there";
  const subject = "Your Roachwood Project Portal is Ready";
  const html = inviteHtml({
    firstName,
    contactName: client.contact_name,
    magicLink,
  });
  const text = inviteText({
    firstName,
    contactName: client.contact_name,
    magicLink,
  });

  const resend = new Resend(apiKey);
  const { error: sendErr } = await resend.emails.send({
    from,
    to: client.email,
    subject,
    html,
    text,
  });
  if (sendErr) return fail(sendErr.message ?? "Resend rejected the message.");

  // Stamp the invite using the service role so RLS doesn't get in the
  // way. Failure here doesn't void the email — log + continue.
  const { error: stampErr } = await admin
    .from("clients")
    .update({ portal_invited_at: new Date().toISOString() } as never)
    .eq("id", clientId);
  if (stampErr) {
    console.warn("[portal-invite] stamp failed:", stampErr.message);
  }

  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath("/admin/clients");
  return ok(`Portal invite sent to ${client.email}.`);
}

interface InviteCopy {
  firstName: string;
  contactName: string;
  magicLink: string;
}

function inviteText({ firstName, magicLink }: InviteCopy): string {
  return [
    `Hi ${firstName},`,
    "",
    "Colin Roach at Roachwood has set up a project portal for you.",
    "",
    "Your portal lets you:",
    "  ✓ Track your project progress in real time",
    "  ✓ View and approve estimates and change orders",
    "  ✓ See progress photos as work happens",
    "  ✓ Pay invoices securely online",
    "  ✓ Message Colin directly",
    "",
    "Access your portal — no password needed:",
    magicLink,
    "",
    "This link expires in 24 hours. If you need a new one, contact Colin at (586) 344-0982 or info@roachwood.co.",
    "",
    "— Colin Roach",
    "Roachwood",
    "roachwood.co",
  ].join("\n");
}

function inviteHtml({ firstName, magicLink }: InviteCopy): string {
  // Plain inline-styled HTML — email clients strip <style> tags and
  // anything fancy. Keep this readable in Gmail/Outlook/Apple Mail.
  const link = magicLink.replace(/"/g, "&quot;");
  return `<!doctype html>
<html>
<body style="margin:0;padding:0;background-color:#1f1d1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#f3efe6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1f1d1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#262421;border:1px solid #3a3733;border-radius:8px;padding:36px 32px;">
          <tr><td>
            <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#cda85c;">Roachwood</p>
            <h1 style="margin:0 0 24px 0;font-size:22px;color:#f3efe6;line-height:1.3;">Your project portal is ready</h1>

            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#d6d2c7;">Hi ${escapeHtml(firstName)},</p>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#d6d2c7;">Colin Roach at Roachwood has set up a project portal for you. Your portal lets you:</p>
            <ul style="margin:0 0 24px 0;padding-left:18px;color:#d6d2c7;font-size:15px;line-height:1.7;">
              <li>Track your project progress in real time</li>
              <li>View and approve estimates and change orders</li>
              <li>See progress photos as work happens</li>
              <li>Pay invoices securely online</li>
              <li>Message Colin directly</li>
            </ul>
            <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:#d6d2c7;">Click the button below to access your portal — no password needed.</p>

            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px 0;">
              <tr>
                <td bgcolor="#cda85c" style="border-radius:6px;">
                  <a href="${link}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#1f1d1a;text-decoration:none;border-radius:6px;">Access Your Project Portal</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 8px 0;font-size:13px;color:#9c978b;line-height:1.6;">This link expires in 24 hours. If you need a new one, contact Colin at (586) 344-0982 or info@roachwood.co.</p>
            <p style="margin:24px 0 0 0;font-size:13px;color:#9c978b;line-height:1.5;">
              — Colin Roach<br>
              Roachwood<br>
              <a href="https://roachwood.co" style="color:#cda85c;text-decoration:none;">roachwood.co</a>
            </p>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
