"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  GraduationCap,
  Handshake,
  Mail,
  Lock,
  User,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import type { AccountType } from "@/lib/account-types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const accountTypeOptions: {
  value: AccountType;
  label: string;
  description: string;
  icon: typeof GraduationCap;
}[] = [
  {
    value: "student",
    label: "Student",
    description: "Discover, save, and track education opportunities.",
    icon: GraduationCap,
  },
  {
    value: "organization",
    label: "Organization",
    description: "Submit jobs, events, courses, and marketplace listings.",
    icon: Building2,
  },
  {
    value: "partner",
    label: "Partner",
    description: "Apply for deal partnerships and manage partner offers.",
    icon: Handshake,
  },
];

export default function SignUpPage() {
  const [accountType, setAccountType] = useState<AccountType>("student");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [checkEmailSent, setCheckEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, accountType }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Failed to create account");
      setLoading(false);
      return;
    }

    setLoading(false);
    setCheckEmailSent(true);
  };

  if (checkEmailSent) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-xl shadow-primary/5">
          <CheckCircle2 className="mx-auto mb-4 h-14 w-14 text-green-500" />
          <h1 className="mb-2 text-2xl font-bold">Check your email</h1>
          <p className="mb-6 text-sm text-muted-foreground">
            We sent a verification link to <span className="font-medium text-foreground">{email}</span>. Verify your email before signing in.
          </p>
          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Go to Sign In
            </Link>
            <button
              type="button"
              onClick={() => setCheckEmailSent(false)}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-xl shadow-primary/5">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary shadow-lg mb-4">
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Create Account</h1>
            <p className="text-sm text-muted-foreground">Join EDU Passport to save courses, get recommendations & more</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 border border-destructive/20">
                {error}
              </div>
            )}

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Choose your account type</legend>
              <div className="grid gap-3">
                {accountTypeOptions.map((option) => {
                  const Icon = option.icon;
                  const selected = accountType === option.value;

                  return (
                    <label
                      key={option.value}
                      htmlFor={`accountType-${option.value}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:bg-accent/50"
                      }`}
                    >
                      <input
                        id={`accountType-${option.value}`}
                        type="radio"
                        name="accountType"
                        value={option.value}
                        checked={selected}
                        onChange={() => setAccountType(option.value)}
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span>
                        <span className="block text-sm font-semibold">{option.label}</span>
                        <span className="block text-xs text-muted-foreground">{option.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">Name</label>
              <div className="relative group">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-11 h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-11 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 pr-11 h-11 rounded-xl"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl gradient-primary hover:opacity-90 transition-opacity" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account...</>
              ) : (
                <>Create Account <ArrowRight className="h-4 w-4 ml-2" /></>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline font-semibold">
              Sign in
            </Link>
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-6 p-4 rounded-xl bg-muted/50 border">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium mb-1">Why join EDU Passport?</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Save and organize your favorite courses</li>
                <li>Get personalized recommendations</li>
                <li>Track your learning progress</li>
                <li>Apply to jobs with one click</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
