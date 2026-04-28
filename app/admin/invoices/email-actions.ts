"use server";

import { Resend } from "resend";
import { type ActionState, fail, ok } from "@/lib/actions";
import { requireAdmin } from "@/lib/pdf-auth";
import { renderInvoicePDF } from "@/lib/pdf/render-invoice";

function readEmailForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v.trim() : "";
  };
  return {
    to: get("to"),
    subject: get("subject"),
    message: get("message"),
  };
}

function validateEmail(input: ReturnType<typeof readEmailForm>) {
  const errors: Record<string, string> = {};
  if (!input.to) errors.to = "Recipient email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to))
    errors.to = "Enter a valid email address.";
  if (!input.subject) errors.subject = "Subject is required.";
  return errors;
}

export async function sendInvoiceEmail(
  id: string,
  _prev: ActionState,
  formData: FormData,
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

  const input = readEmailForm(formData);
  const errors = validateEmail(input);
  if (Object.keys(errors).length > 0) {
    return fail("Please fix the highlighted fields.", errors);
  }

  const rendered = await renderInvoicePDF(id);
  if (!rendered) return fail("Invoice not found.");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: input.to,
    subject: input.subject,
    text: input.message || "Please see the attached invoice.",
    attachments: [
      {
        filename: rendered.filename,
        content: rendered.buffer,
      },
    ],
  });
  if (error) return fail(error.message ?? "Resend rejected the message.");

  return ok(`Invoice sent to ${input.to}.`);
}
