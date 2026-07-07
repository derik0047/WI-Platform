import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/resend";

/**
 * Invitation email: templating + a resilient send. Sending never throws — an
 * email-provider outage must not fail the invite (it can always be resent), so
 * failures are logged and reported via the boolean return.
 */

export type InvitationEmailInput = {
  to: string;
  organizationName: string;
  invitedByEmail: string;
  role: string;
  token: string;
};

/** Absolute URL the invitee opens to accept or decline. */
export function invitationAcceptUrl(token: string): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/invitations/${encodeURIComponent(token)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildInvitationEmail(input: InvitationEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const url = invitationAcceptUrl(input.token);
  const org = escapeHtml(input.organizationName);
  const inviter = escapeHtml(input.invitedByEmail);
  const subject = `You've been invited to join ${input.organizationName}`;

  const text = [
    `${input.invitedByEmail} invited you to join ${input.organizationName} on WI Platform as a ${input.role}.`,
    "",
    `Accept or decline your invitation:`,
    url,
    "",
    "If you weren't expecting this, you can ignore this email.",
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; line-height: 1.6; color: #111;">
      <h2 style="margin: 0 0 12px;">Join ${org}</h2>
      <p><strong>${inviter}</strong> invited you to join <strong>${org}</strong> on WI Platform as a <strong>${escapeHtml(input.role)}</strong>.</p>
      <p style="margin: 24px 0;">
        <a href="${url}" style="background: #111; color: #fff; padding: 10px 18px; border-radius: 6px; text-decoration: none;">View invitation</a>
      </p>
      <p style="color: #666; font-size: 13px;">Or paste this link into your browser:<br /><a href="${url}">${url}</a></p>
      <p style="color: #666; font-size: 13px;">If you weren't expecting this, you can ignore this email.</p>
    </div>
  `.trim();

  return { subject, html, text };
}

/** Send an invitation email. Returns whether it was sent; never throws. */
export async function sendInvitationEmail(input: InvitationEmailInput): Promise<boolean> {
  const { subject, html, text } = buildInvitationEmail(input);
  try {
    await sendEmail({ to: input.to, subject, html, text, replyTo: input.invitedByEmail });
    return true;
  } catch (error) {
    logger.error("Failed to send invitation email", {
      to: input.to,
      organization: input.organizationName,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
