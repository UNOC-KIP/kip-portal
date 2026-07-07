import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import { Inquiry } from "@kip/db";
import { InquiryChannel } from "@kip/shared";

const inquirySchema = z.object({
  name: z.string().min(2, "Name is required").max(120, "Name is too long"),
  email: z.string().email("Enter a valid email address"),
  message: z
    .string()
    .min(5, "Message must be at least 5 characters")
    .max(2000, "Message is too long"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const result = inquirySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", fields: result.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const { name, email, message } = result.data;

  // Persist first — the admin console tracks inquiries from the DB, so the
  // message is never lost even when email delivery is unavailable.
  try {
    await Inquiry.create({
      name,
      email,
      message,
      subject: "Live Chat",
      channel: InquiryChannel.LIVE_CHAT,
    });
  } catch {
    return NextResponse.json(
      { error: "We couldn't send your message right now. Please try again shortly." },
      { status: 502 },
    );
  }

  // Email notification is best-effort — a failure must not fail the submission.
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST || "localhost",
      port: parseInt(process.env.EMAIL_SERVER_PORT || "1025"),
      secure: false,
      auth: process.env.EMAIL_SERVER_USER
        ? { user: process.env.EMAIL_SERVER_USER, pass: process.env.EMAIL_SERVER_PASSWORD }
        : undefined,
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "noreply@kip.local",
      to: "kipinvestorrelations@unoc.com",
      replyTo: email,
      subject: `KIP Investor Portal — Live Inquiry from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#ED1C24">New Live Chat Inquiry</h2>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
            <tr><td style="padding:8px;font-weight:bold;color:#555;width:120px">Name</td><td style="padding:8px">${name}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;font-weight:bold;color:#555">Email</td><td style="padding:8px"><a href="mailto:${email}">${email}</a></td></tr>
          </table>
          <h3 style="color:#333">Message</h3>
          <p style="background:#f5f5f5;padding:16px;border-radius:4px;white-space:pre-wrap">${message}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
          <p style="color:#999;font-size:12px">Sent from the KIP Investor Portal chat widget.</p>
        </div>
      `,
    });
  } catch {
    // Saved to the DB above — the admin console still sees the inquiry.
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
