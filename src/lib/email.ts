import nodemailer from "nodemailer";

const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "EDU Passport";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002";
const FROM_EMAIL = process.env.SMTP_FROM || `noreply@edupassport.me`;

// Create transporter — uses SMTP env vars, falls back to Ethereal (dev preview)
function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "",
        pass: process.env.SMTP_PASS || "",
      },
    });
  }

  // Dev fallback: log to console
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

const transporter = createTransport();

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail({ to, subject, html, text }: SendMailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `${SITE_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""),
    });

    if (!process.env.SMTP_HOST) {
      console.log("[Email Dev]", subject, "→", to);
      const raw = (info as unknown as { message: string }).message;
      if (raw) {
        try { console.log("[Email Dev Body]", JSON.parse(raw).text?.substring(0, 200)); } catch { /* ignore */ }
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("[Email Error]", error);
    return { success: false, error };
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function layout(content: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="background:#0f172a;padding:24px 32px;">
      <h1 style="margin:0;color:#fff;font-size:20px;">${SITE_NAME}</h1>
    </div>
    <div style="padding:32px;">
      ${content}
    </div>
    <div style="padding:16px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        ${SITE_NAME} — Discover the best learning resources
      </p>
    </div>
  </div>
</body>
</html>`;
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">${label}</a>`;
}

export function emailVerificationTemplate(name: string, token: string) {
  const url = `${SITE_URL}/auth/verify?token=${token}`;
  return {
    subject: `Verify your ${SITE_NAME} email`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:18px;">Welcome${name ? `, ${name}` : ""}!</h2>
      <p style="color:#6b7280;line-height:1.6;">Please verify your email address to unlock all features.</p>
      <div style="text-align:center;margin:24px 0;">${btn(url, "Verify Email")}</div>
      <p style="color:#9ca3af;font-size:12px;">This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
    `),
  };
}

export function passwordResetTemplate(name: string, token: string) {
  const url = `${SITE_URL}/auth/reset-password?token=${token}`;
  return {
    subject: `Reset your ${SITE_NAME} password`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:18px;">Password Reset</h2>
      <p style="color:#6b7280;line-height:1.6;">Hi${name ? ` ${name}` : ""}, we received a request to reset your password.</p>
      <div style="text-align:center;margin:24px 0;">${btn(url, "Reset Password")}</div>
      <p style="color:#9ca3af;font-size:12px;">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
    `),
  };
}

export function welcomeTemplate(name: string) {
  return {
    subject: `Welcome to ${SITE_NAME}!`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:18px;">You're all set${name ? `, ${name}` : ""}!</h2>
      <p style="color:#6b7280;line-height:1.6;">Your email has been verified. Here's what you can do:</p>
      <ul style="color:#6b7280;line-height:1.8;">
        <li><strong>Save listings</strong> — bookmark courses, jobs, and events</li>
        <li><strong>Set alerts</strong> — get notified when new matching listings appear</li>
        <li><strong>Get recommendations</strong> — personalized picks based on your interests</li>
      </ul>
      <div style="text-align:center;margin:24px 0;">${btn(`${SITE_URL}/for-you`, "Explore For You")}</div>
    `),
  };
}

export function newMatchTemplate(name: string, searchName: string, listings: { title: string; slug: string; type: string }[]) {
  const listHtml = listings
    .map(
      (l) =>
        `<li style="margin-bottom:8px;">
          <a href="${SITE_URL}/listing/${l.slug}" style="color:#2563eb;text-decoration:none;font-weight:500;">${l.title}</a>
          <span style="color:#9ca3af;font-size:12px;"> (${l.type})</span>
        </li>`
    )
    .join("");

  return {
    subject: `New matches for "${searchName}" — ${SITE_NAME}`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:18px;">New Listings Found!</h2>
      <p style="color:#6b7280;line-height:1.6;">Hi${name ? ` ${name}` : ""}, we found <strong>${listings.length}</strong> new listing${listings.length > 1 ? "s" : ""} matching your saved search "<strong>${searchName}</strong>":</p>
      <ul style="color:#374151;line-height:1.6;padding-left:20px;">${listHtml}</ul>
      <div style="text-align:center;margin:24px 0;">${btn(`${SITE_URL}/saved`, "View All Saved Searches")}</div>
      <p style="color:#9ca3af;font-size:12px;">You can manage alert preferences in your <a href="${SITE_URL}/profile" style="color:#6b7280;">profile settings</a>.</p>
    `),
  };
}

export function priceDropTemplate(name: string, listing: { title: string; slug: string; oldPrice: number; newPrice: number; currency: string }) {
  const savings = ((1 - listing.newPrice / listing.oldPrice) * 100).toFixed(0);
  return {
    subject: `Price drop: ${listing.title} — ${SITE_NAME}`,
    html: layout(`
      <h2 style="margin:0 0 8px;font-size:18px;">Price Drop Alert!</h2>
      <p style="color:#6b7280;line-height:1.6;">Hi${name ? ` ${name}` : ""}, a listing you saved has dropped in price:</p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0 0 4px;font-weight:600;color:#374151;">${listing.title}</p>
        <p style="margin:0;">
          <span style="color:#dc2626;text-decoration:line-through;">${listing.currency} ${listing.oldPrice}</span>
          <span style="color:#16a34a;font-weight:700;font-size:18px;margin-left:8px;">${listing.currency} ${listing.newPrice}</span>
          <span style="color:#16a34a;font-size:12px;margin-left:4px;">(${savings}% off)</span>
        </p>
      </div>
      <div style="text-align:center;margin:24px 0;">${btn(`${SITE_URL}/listing/${listing.slug}`, "View Listing")}</div>
    `),
  };
}
