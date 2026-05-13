/**
 * Runtime environment variable validation.
 * Import this in server entry points to fail fast on missing config.
 */

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback = ""): string {
  return process.env[key] || fallback;
}

export const env = {
  // Database
  DATABASE_URL: required("DATABASE_URL"),

  // NextAuth
  NEXTAUTH_SECRET: required("NEXTAUTH_SECRET"),
  NEXTAUTH_URL: optional("NEXTAUTH_URL", "http://localhost:3000"),

  // Site
  SITE_URL: optional("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
  SITE_NAME: optional("NEXT_PUBLIC_SITE_NAME", "EDU Passport"),

  // Admin
  ADMIN_PASSWORD: required("ADMIN_PASSWORD"),

  // Cron
  CRON_SECRET: optional("CRON_SECRET"),

  // Provider keys
  UDEMY_API_KEY: optional("UDEMY_API_KEY"),
  USAJOBS_API_KEY: optional("USAJOBS_API_KEY"),
  USAJOBS_USER_AGENT: optional("USAJOBS_USER_AGENT"),
  TICKETMASTER_API_KEY: optional("TICKETMASTER_API_KEY"),
  AWIN_ACCESS_TOKEN: optional("AWIN_ACCESS_TOKEN"),
  AWIN_PUBLISHER_ID: optional("AWIN_PUBLISHER_ID"),

  // SMTP
  SMTP_HOST: optional("SMTP_HOST"),
  SMTP_PORT: optional("SMTP_PORT", "587"),
  SMTP_SECURE: optional("SMTP_SECURE", "false"),
  SMTP_USER: optional("SMTP_USER"),
  SMTP_PASS: optional("SMTP_PASS"),
  SMTP_FROM: optional("SMTP_FROM", "noreply@edupassport.me"),

  // Stripe
  STRIPE_SECRET_KEY: optional("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: optional("STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRO_MONTHLY_PRICE_ID: optional("STRIPE_PRO_MONTHLY_PRICE_ID"),
  STRIPE_PRO_YEARLY_PRICE_ID: optional("STRIPE_PRO_YEARLY_PRICE_ID"),

  // AI / OpenAI
  OPENAI_API_KEY: optional("OPENAI_API_KEY"),
  OPENAI_MODEL: optional("OPENAI_MODEL", "gpt-4o-mini"),
} as const;
