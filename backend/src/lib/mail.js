import { env } from "../config/env.js";

// Transactional email through Brevo's HTTPS API. Render's free plan blocks
// outgoing SMTP, so an HTTP API is the only way to send mail from there.
// Not configured: in development the message is printed to the console instead.

export const mailConfigured = Boolean(env.mail.apiKey && env.mail.fromEmail);

// Codes can reach someone with Brevo configured, or in development where they are
// printed to the console. Whether sign-up asks for one is an admin setting (lib/settings.js).
export const canSendCodes = mailConfigured || !env.isProd;

export async function sendMail({ to, subject, text, html }) {
  if (!mailConfigured) {
    console.log(`[mail] not configured, so not sent. To: ${to} | ${subject}\n${text}\n`);
    return;
  }
  const res = await fetch(`${env.mail.apiUrl}/v3/smtp/email`, {
    method: "POST",
    headers: { "api-key": env.mail.apiKey, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { email: env.mail.fromEmail, name: env.mail.fromName },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo responded ${res.status}: ${detail.slice(0, 200)}`);
  }
}

// Startup check: logs how mail is set up. Never stops the server, because a mail
// problem shouldn't take the whole site down.
export async function verifyMail() {
  if (!mailConfigured) {
    console.log(
      env.isProd
        ? "[mail] not configured: sign-up can't send verification codes, so it works without them. Set BREVO_API_KEY and MAIL_FROM to enable."
        : "[mail] not configured: verification codes will be printed here instead of emailed"
    );
    return;
  }
  try {
    const res = await fetch(`${env.mail.apiUrl}/v3/account`, { headers: { "api-key": env.mail.apiKey, accept: "application/json" } });
    if (res.status === 401) throw new Error("BREVO_API_KEY was rejected");
    if (!res.ok) throw new Error(`Brevo responded ${res.status}`);
    console.log(`[mail] using Brevo, sending from ${env.mail.fromEmail}`);
  } catch (err) {
    console.error(`[mail] Brevo check failed (${err.message}). Sign-up emails will fail until this is fixed.`);
  }
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function verificationEmail({ name, code, minutes }) {
  const first = String(name).split(/\s+/)[0];
  return {
    subject: `${code} is your ExamStore verification code`,
    text: `Hi ${first},\n\nYour ExamStore verification code is ${code}.\nIt expires in ${minutes} minutes.\n\nIf you didn't try to create an ExamStore account, you can ignore this email.`,
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#191c26">
  <p style="font-size:18px;font-weight:bold;margin:0 0 16px">ExamStore</p>
  <p style="margin:0 0 16px">Hi ${escapeHtml(first)}, use this code to finish creating your account:</p>
  <p style="font-size:32px;font-weight:bold;letter-spacing:8px;background:#eceefd;color:#2f3fd1;padding:16px;text-align:center;border-radius:12px;margin:0 0 16px">${code}</p>
  <p style="margin:0 0 16px;color:#5d6270">It expires in ${minutes} minutes.</p>
  <p style="margin:0;color:#8a8e99;font-size:13px">If you didn't try to create an ExamStore account, you can ignore this email.</p>
</div>`,
  };
}
