import nodemailer from "nodemailer";
import { env } from "./env.js";
import { logger } from "./logger.js";

export function escapeHtml(s: string): string {
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
  // Office 365 submission is STARTTLS on 587; implicit TLS is 465 only.
  secure: env.EMAIL_SERVER_PORT === 465,
  // Never let a credentialed login fall back to plaintext. MailHog advertises
  // no STARTTLS, so demand it only when there are credentials to protect.
  requireTLS: Boolean(env.EMAIL_SERVER_USER),
  auth:
    env.EMAIL_SERVER_USER
      ? { user: env.EMAIL_SERVER_USER, pass: env.EMAIL_SERVER_PASSWORD ?? "" }
      : undefined,
  tls: { minVersion: "TLSv1.2" },
});

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
  attachments?: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
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

/** Confirms a site-visit request to the investor. Dates follow separately. */
export function siteVisitConfirmationEmail(opts: {
  companyName: string;
  zoneLabel: string;
  landUse: string;
  acres: number;
  description: string;
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
              Your site visit request has been received
            </p>
            <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
              Thank you, <strong>${escapeHtml(opts.companyName)}</strong>. We have received your request
              to visit the Kabalega Industrial Park. Our team will get back to you shortly
              with available dates and a formal invitation.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:28px">
              <tr>
                <td style="padding:20px 24px">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a">
                    Your request
                  </p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:4px 0;font-size:13px;color:#71717a;width:130px">Preferred zone</td>
                      <td style="padding:4px 0;font-size:13px;color:#09090b;font-weight:600">${escapeHtml(opts.zoneLabel)}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-size:13px;color:#71717a">Intended land use</td>
                      <td style="padding:4px 0;font-size:13px;color:#09090b;font-weight:600">${escapeHtml(opts.landUse)}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-size:13px;color:#71717a">Land required</td>
                      <td style="padding:4px 0;font-size:13px;color:#09090b;font-weight:600">${opts.acres} acre${opts.acres === 1 ? "" : "s"}</td>
                    </tr>
                  </table>
                  <p style="margin:12px 0 0;font-size:13px;color:#52525b;line-height:1.6;white-space:pre-wrap">${escapeHtml(opts.description)}</p>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6">
              Questions? Contact the KIP secretariat at
              <a href="mailto:kipinvestorrelations@unoc.com" style="color:#09090b">kipinvestorrelations@unoc.com</a>.
            </p>
          </td>
        </tr>

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

/** Sent to the investor when the admin confirms (schedules) their site visit. */
export function siteVisitScheduledEmail(opts: {
  companyName: string;
  zoneLabel: string;
  landUse: string;
  acres: number;
  scheduledAt: string;
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
              Your site visit is confirmed
            </p>
            <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
              Good news, <strong>${escapeHtml(opts.companyName)}</strong>. Your visit to the
              Kabalega Industrial Park has been scheduled. Please find the details below.
            </p>

            <!-- Confirmed date banner -->
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#ecfdf3;border:1px solid #a6f4c5;border-radius:8px;margin-bottom:20px">
              <tr>
                <td style="padding:20px 24px">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#067647">
                    Scheduled for
                  </p>
                  <p style="margin:0;font-size:20px;font-weight:800;color:#054f31">${escapeHtml(opts.scheduledAt)}</p>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:28px">
              <tr>
                <td style="padding:20px 24px">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#71717a">
                    Your visit
                  </p>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:4px 0;font-size:13px;color:#71717a;width:130px">Preferred zone</td>
                      <td style="padding:4px 0;font-size:13px;color:#09090b;font-weight:600">${escapeHtml(opts.zoneLabel)}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-size:13px;color:#71717a">Intended land use</td>
                      <td style="padding:4px 0;font-size:13px;color:#09090b;font-weight:600">${escapeHtml(opts.landUse)}</td>
                    </tr>
                    <tr>
                      <td style="padding:4px 0;font-size:13px;color:#71717a">Land required</td>
                      <td style="padding:4px 0;font-size:13px;color:#09090b;font-weight:600">${opts.acres} acre${opts.acres === 1 ? "" : "s"}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <p style="margin:0;font-size:13px;color:#71717a;line-height:1.6">
              Our team will be in touch with directions and any final arrangements. Questions?
              Contact the KIP secretariat at
              <a href="mailto:kipinvestorrelations@unoc.com" style="color:#09090b">kipinvestorrelations@unoc.com</a>.
            </p>
          </td>
        </tr>

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

/** Notifies the secretariat that a new site-visit request needs scheduling. */
export function siteVisitNotificationEmail(opts: {
  companyName: string;
  contactName: string;
  contactEmail: string;
  zoneLabel: string;
  landUse: string;
  acres: number;
  description: string;
}): string {
  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#C8102E">New Site Visit Request</h2>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr><td style="padding:8px;font-weight:bold;color:#555;width:150px">Company</td><td style="padding:8px">${escapeHtml(opts.companyName)}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Contact</td><td style="padding:8px">${escapeHtml(opts.contactName)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;color:#555">Email</td><td style="padding:8px"><a href="mailto:${escapeHtml(opts.contactEmail)}">${escapeHtml(opts.contactEmail)}</a></td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Preferred zone</td><td style="padding:8px">${escapeHtml(opts.zoneLabel)}</td></tr>
        <tr><td style="padding:8px;font-weight:bold;color:#555">Intended land use</td><td style="padding:8px">${escapeHtml(opts.landUse)}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Land required</td><td style="padding:8px">${opts.acres} acre${opts.acres === 1 ? "" : "s"}</td></tr>
      </table>
      <h3 style="color:#333">Intended activity</h3>
      <p style="background:#f5f5f5;padding:16px;border-radius:4px;white-space:pre-wrap">${escapeHtml(opts.description)}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
      <p style="color:#999;font-size:12px">Track and schedule this request in the KIP admin console.</p>
    </div>
  `;
}

/** Security confirmation sent after a user changes their own password. */
export function passwordChangedEmail(opts: { name: string; when: string }): string {
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
              Your password was changed
            </p>
            <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
              Hi <strong>${escapeHtml(opts.name)}</strong>, this confirms that the password for your
              KIP Investor Portal account was changed on <strong>${escapeHtml(opts.when)}</strong>.
            </p>
            <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px 20px;margin-bottom:24px">
              <p style="margin:0;font-size:13px;color:#991b1b">
                If you did not make this change, contact the KIP secretariat immediately at
                <a href="mailto:kipinvestorrelations@unoc.com" style="color:#991b1b;font-weight:600">kipinvestorrelations@unoc.com</a>.
              </p>
            </div>
          </td>
        </tr>

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

/** Admin-initiated password reset — delivers the new temporary password. */
export function passwordResetEmail(opts: {
  recipientName: string;
  email: string;
  tempPassword: string;
  signInUrl: string;
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
            <p style="margin:0;color:#fff;font-size:18px;font-weight:700;letter-spacing:-0.3px">
              UNOC / KIP Investor Portal
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:36px">
            <p style="margin:0 0 16px;color:#09090b;font-size:16px;font-weight:600">
              Your password has been reset
            </p>
            <p style="margin:0 0 24px;color:#52525b;font-size:14px;line-height:1.6">
              Dear <strong>${escapeHtml(opts.recipientName)}</strong>, a KIP administrator has reset
              the password on your account. Use the temporary password below to sign in,
              then change it from your account settings.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0"
                   style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:8px;margin-bottom:28px">
              <tr>
                <td style="padding:20px 24px">
                  <p style="margin:0 0 6px;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Email</p>
                  <p style="margin:0 0 16px;color:#09090b;font-size:14px;font-weight:600">${escapeHtml(opts.email)}</p>
                  <p style="margin:0 0 6px;color:#71717a;font-size:12px;text-transform:uppercase;letter-spacing:0.5px">Temporary password</p>
                  <p style="margin:0;color:#09090b;font-size:16px;font-weight:700;font-family:Consolas,Menlo,monospace">${escapeHtml(opts.tempPassword)}</p>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 28px">
              <a href="${opts.signInUrl}" style="display:inline-block;background:#000;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none">
                Sign in
              </a>
            </p>
            <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.6">
              If you did not request this reset, contact Support.Kip@unoc.com immediately.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Broadcasts ──────────────────────────────────────────────────────────────

/**
 * The standard card chrome, mirroring `shell()` in `apps/portal/src/lib/mailer.ts`.
 * The templates above predate this helper and still inline their own copy —
 * they are left alone deliberately rather than reflowed for cosmetics.
 */
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
 * An admin-composed broadcast. `bodyHtml` must already have come through
 * `renderBodyHtml()` from `@kip/shared` — that function is what escapes the
 * authored text, so nothing here may interpolate the raw body.
 */
export function announcementEmail(opts: {
  subject: string;
  bodyHtml: string;
  portalUrl: string;
}): string {
  return shell(`
    <p style="margin:0 0 20px;color:#09090b;font-size:16px;font-weight:600">
      ${escapeHtml(opts.subject)}
    </p>
    ${opts.bodyHtml}
    <p style="margin:28px 0 0;padding-top:20px;border-top:1px solid #e4e4e7">
      <a href="${escapeHtml(opts.portalUrl)}/dashboard/messages"
         style="display:inline-block;background:#000;color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none">
        View in portal
      </a>
    </p>
  `);
}


/**
 * The application-fee invoice cover email. The invoice document itself is
 * prepared by finance and attached to the message (or linked when a download
 * URL is supplied). Amounts come from the server-authoritative fee.
 */
export function feeInvoiceEmail(opts: {
  name: string;
  reference: string;
  plotCount: number;
  subtotalLabel: string;
  vatLabel: string;
  totalLabel: string;
  invoiceUrl?: string | null;
  note?: string | null;
}): string {
  const row = (l: string, v: string, bold = false) => `
    <tr>
      <td style="padding:6px 0;color:#3f3f46;font-size:14px">${escapeHtml(l)}</td>
      <td style="padding:6px 0;text-align:right;color:#09090b;font-size:14px;${bold ? "font-weight:700" : ""}">${escapeHtml(v)}</td>
    </tr>`;
  return shell(`
    <p style="margin:0 0 8px;color:#09090b;font-size:18px;font-weight:700">Application fee invoice</p>
    <p style="margin:0 0 18px;color:#3f3f46;font-size:14px;line-height:1.6">
      Dear ${escapeHtml(opts.name)}, please find attached the UNOC invoice for the
      processing fee on application <strong>${escapeHtml(opts.reference)}</strong>
      (${opts.plotCount} plot${opts.plotCount === 1 ? "" : "s"}). Pay it by bank
      transfer using the account and payment details shown on the attached
      invoice, then upload your receipt from your portal dashboard.
    </p>
    ${opts.note ? `<p style="margin:0 0 18px;color:#3f3f46;font-size:14px;line-height:1.6">${escapeHtml(opts.note)}</p>` : ""}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7;margin:0 0 18px">
      ${row("Application fee (excl. VAT)", opts.subtotalLabel)}
      ${row("VAT (18%)", opts.vatLabel)}
      ${row("Total payable", opts.totalLabel, true)}
    </table>
    ${opts.invoiceUrl ? `<p style="margin:0 0 4px;font-size:14px"><a href="${escapeHtml(opts.invoiceUrl)}" style="color:#2563eb;font-weight:600">Download the invoice</a></p>` : ""}
    <p style="margin:0;color:#71717a;font-size:13px">The bank account and payment details are on the attached invoice.</p>
  `);
}

/**
 * A review committee has asked the investor for more information. The question
 * is the committee's own wording, escaped; the reply happens on the portal
 * dashboard, never by email.
 */
export function clarificationRequestEmail(opts: {
  name: string;
  reference: string;
  committee: string;
  question: string;
  portalUrl: string;
}): string {
  return shell(`
    <p style="margin:0 0 8px;color:#09090b;font-size:18px;font-weight:700">More information requested</p>
    <p style="margin:0 0 18px;color:#3f3f46;font-size:14px;line-height:1.6">
      Dear ${escapeHtml(opts.name)}, the ${escapeHtml(opts.committee)} reviewing application
      <strong>${escapeHtml(opts.reference)}</strong> needs more information before it can continue.
    </p>
    <div style="margin:0 0 18px;padding:14px 16px;background:#f4f4f5;border-radius:8px;color:#09090b;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(opts.question)}</div>
    <p style="margin:0 0 22px;color:#3f3f46;font-size:14px;line-height:1.6">
      Sign in to the investor portal to update your application if needed, then send your reply
      from your dashboard. Your application stays with the committee until you reply.
    </p>
    <p style="margin:0">
      <a href="${escapeHtml(opts.portalUrl)}/dashboard"
         style="display:inline-block;background:#000;color:#fff;font-size:14px;font-weight:600;padding:11px 24px;border-radius:8px;text-decoration:none">
        Reply in the portal
      </a>
    </p>
  `);
}
