"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";

export function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("success");
        setMessage("Thanks for subscribing!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong");
      }
    } catch {
      setStatus("error");
      setMessage("Something went wrong");
    }
  };

  return (
    <section className="py-20 border-t">
      <div className="mx-auto max-w-2xl text-center px-4">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-6">
          <Mail className="h-7 w-7 text-primary" />
        </div>

        <h2 className="text-3xl font-bold mb-3">Stay Updated</h2>
        <p className="text-lg text-muted-foreground mb-2">Join the EDU Passport Community</p>
        <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
          Subscribe to get the latest educational resources, learning tools, and course recommendations delivered to your inbox.
        </p>

        <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-11 h-11 rounded-xl"
              required
            />
          </div>
          <Button type="submit" disabled={status === "loading"} className="h-11 px-6 rounded-xl gradient-primary hover:opacity-90 transition-opacity">
            {status === "loading" ? (
              "..."
            ) : status === "success" ? (
              <><CheckCircle2 className="h-4 w-4 mr-2" /> Subscribed</>
            ) : (
              <>Subscribe <ArrowRight className="h-4 w-4 ml-2" /></>
            )}
          </Button>
        </form>

        {message && (
          <p className={`text-sm mt-4 ${status === "success" ? "text-green-600" : "text-destructive"}`}>
            {message}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          No spam, unsubscribe at any time.
        </p>
      </div>
    </section>
  );
}
