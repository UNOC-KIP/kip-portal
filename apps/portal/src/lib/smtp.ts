/**
 * SMTP connection options, shared by every place the portal sends mail:
 * `lib/mailer.ts`, the NextAuth EmailProvider in `lib/auth.ts`, and the
 * notify-me signup action on the home page.
 *
 * Mirrored in `apps/web/src/lib/smtp.ts` and `apps/api/src/mailer.ts`.
 */
export function smtpTransportOptions() {
  const port = Number(process.env.EMAIL_SERVER_PORT || 1025);
  const user = process.env.EMAIL_SERVER_USER;

  return {
    host: process.env.EMAIL_SERVER_HOST || "localhost",
    port,
    // Office 365 submission is STARTTLS on 587; implicit TLS is 465 only.
    secure: port === 465,
    // Never let a credentialed login fall back to plaintext. MailHog advertises
    // no STARTTLS, so demand it only when there are credentials to protect.
    requireTLS: Boolean(user),
    auth: user
      ? { user, pass: process.env.EMAIL_SERVER_PASSWORD }
      : undefined,
    tls: { minVersion: "TLSv1.2" as const },
  };
}
