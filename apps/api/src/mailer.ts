import nodemailer from "nodemailer";
import { env } from "./env.js";
import { logger } from "./logger.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const transport = nodemailer.createTransport({
  host: env.EMAIL_SERVER_HOST,
  port: env.EMAIL_SERVER_PORT,
  secure: false,
  auth:
    env.EMAIL_SERVER_USER
      ? { user: env.EMAIL_SERVER_USER, pass: env.EMAIL_SERVER_PASSWORD ?? "" }
      : undefined,
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  try {
    await transport.sendMail({ from: env.EMAIL_FROM, ...opts });
    logger.info({ to: opts.to, subject: opts.subject }, "email sent");
  } catch (err) {
    logger.error({ err, to: opts.to }, "failed to send email");
    throw err;
  }
}

export function credentialsEmail(opts: {
  companyName: string;
  email: string;
  tempPassword: string;
  portalUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">

        <!-- Header -->
        <tr>
          <td style="background:#000;padding:28px 36px">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px">
              UNOC / KIP Investor Portal
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px">
            <p style="margin:0 0 16px;color:#09090b;font-size:16px;font-weight:600">
              Your account has been approved
            </p>
            <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
              Dear <strong>${opts.companyName}</strong>, your registration for the
              Kabalega Industrial Park Investor Portal has been reviewed and approved.
              You can now sign in and complete your Expression of Interest.
            </p>

            <!-- Credentials box -->
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
                      <td style="padding:4px 0;font-size:13px;color:#09090b;font-weight:600">${opts.email}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-size:13px;color:#71717a">Password</td>
                      <td style="padding:4px 0;font-size:14px;color:#09090b;font-weight:700;font-family:monospace,Courier">${opts.tempPassword}</td>
                    </tr>
                  </table>
                  <p style="margin:12px 0 0;font-size:12px;color:#f59e0b">
                    ⚠ Please change your password after your first sign-in.
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
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
              <a href="mailto:admin@kip.unoc.co.ug" style="color:#09090b">admin@kip.unoc.co.ug</a>.
            </p>
          </td>
        </tr>

        <!-- Footer -->
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

export function rejectionEmail(opts: {
  companyName: string;
  reason?: string | null;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7">

        <tr>
          <td style="background:#000;padding:28px 36px">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:700">UNOC / KIP Investor Portal</p>
          </td>
        </tr>

        <tr>
          <td style="padding:36px">
            <p style="margin:0 0 16px;color:#09090b;font-size:16px;font-weight:600">
              Registration update for ${opts.companyName}
            </p>
            <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
              After reviewing your registration for the Kabalega Industrial Park Investor Portal,
              we regret to inform you that we are unable to approve your account at this time.
            </p>
            ${opts.reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0;font-size:13px;color:#991b1b"><strong>Reason:</strong> ${escapeHtml(opts.reason)}</p>
            </div>` : ""}
            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6">
              For further clarification, please contact the KIP secretariat at
              <a href="mailto:admin@kip.unoc.co.ug" style="color:#09090b">admin@kip.unoc.co.ug</a>.
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#f4f4f5;padding:18px 36px;border-top:1px solid #e4e4e7">
            <p style="margin:0;font-size:11px;color:#a1a1aa">
              Uganda National Oil Company (UNOC) · Kabalega Industrial Park Secretariat
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
