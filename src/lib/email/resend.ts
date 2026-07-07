import { Resend } from "resend";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/** Shared Resend client. Server-only. */
export const resend = new Resend(env.RESEND_API_KEY);

type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

/** Send a transactional email from the platform's default sender. */
export async function sendEmail(params: SendEmailParams) {
  const { data, error } = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    replyTo: params.replyTo,
  });

  if (error) {
    logger.error("Failed to send email", { subject: params.subject, error: error.message });
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}
