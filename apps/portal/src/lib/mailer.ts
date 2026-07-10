import "server-only";
import nodemailer from "nodemailer";
import { smtpTransportOptions } from "./smtp";

/**
 * Portal-side transactional email.
 *
 * Mirrors `apps/api/src/mailer.ts`. The templates are duplicated rather than
 * shared because `@kip/shared` must stay dependency-free and edge-safe — the
 * same trade-off already made for `fireWebhook`.
 */

export const SECRETARIAT_EMAIL = "kipinvestorrelations@unoc.com";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const transport = nodemailer.createTransport(smtpTransportOptions());

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  await transport.sendMail({
    from: process.env.EMAIL_FROM || "noreply@kip.local",
    ...opts,
  });
}

/** Where the investor signs in — the portal's own public URL. */
export function portalUrl(): string {
  return process.env.NEXTAUTH_URL || "http://localhost:4002";
}

// ─── Templates ───────────────────────────────────────────────────────────────

function shell(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">

        <tr>
          <td style="background:#000;padding:28px 36px">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px">
              UNOC / KIP Investor Portal
            </p>
          </td>
        </tr>

        <tr><td style="padding:36px">${bodyHtml}</td></tr>

        <tr>
          <td style="background:#f4f4f5;padding:18px 36px;border-top:1px solid #e4e4e7">
            <p style="margin:0;font-size:11px;color:#a1a1aa">
              Uganda National Oil Company (UNOC) · Kabalega Industrial Park Secretariat ·
              This is an automated message — please do not reply directly.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/**
 * Sent immediately on registration. Accounts are now self-activating, so this
 * carries the generated password rather than an approval notice.
 */
export function credentialsEmail(opts: {
  companyName: string;
  email: string;
  tempPassword: string;
  portalUrl: string;
}): string {
  return shell(`
    <p style="margin:0 0 16px;color:#09090b;font-size:16px;font-weight:600">
      Your KIP investor account is ready
    </p>
    <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
      Welcome, <strong>${escapeHtml(opts.companyName)}</strong>. Your account for the
      Kabalega Industrial Park Investor Portal has been created. Sign in with the
      credentials below to book a site visit and to be ready when the Expression of
      Interest window opens.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0"
           style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:28px">
      <tr>
        <td style="padding:20px 24px">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a">
            Your login credentials
          </p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a;width:90px">Email</td>
              <td style="padding:4px 0;font-size:13px;color:#09090b;font-weight:600">${escapeHtml(opts.email)}</td>
            </tr>
            <tr>
              <td style="padding:4px 0;font-size:13px;color:#71717a">Password</td>
              <td style="padding:4px 0;font-size:14px;color:#09090b;font-weight:700;font-family:monospace,Courier">${escapeHtml(opts.tempPassword)}</td>
            </tr>
          </table>
          <p style="margin:12px 0 0;font-size:12px;color:#f59e0b">
            ⚠ Please change your password after your first sign-in.
          </p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#facc15;border-radius:8px">
          <a href="${opts.portalUrl}/sign-in"
             style="display:inline-block;padding:12px 28px;color:#000;font-size:14px;font-weight:700;text-decoration:none">
            Sign in to the Investor Portal →
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:28px 0 0;font-size:13px;color:#71717a;line-height:1.6">
      If you have any questions, contact the KIP secretariat at
      <a href="mailto:${SECRETARIAT_EMAIL}" style="color:#09090b">${SECRETARIAT_EMAIL}</a>.
    </p>
  `);
}
