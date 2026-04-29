"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Link2, Check } from "lucide-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002";

interface ShareButtonProps {
  title: string;
  slug: string;
  description?: string;
}

export function ShareButton({ title, slug, description }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const url = `${SITE_URL}/listing/${slug}`;
  const text = description ? `${title} — ${description.slice(0, 100)}` : title;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const platforms = [
    {
      name: "Twitter",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      name: "Facebook",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 1.09.05 1.592.149v3.27a9 9 0 0 0-.916-.033c-1.305 0-1.81.494-1.81 1.78v2.392h3.465l-.595 3.667h-2.87v7.98C18.996 23.026 24 17.56 24 12c0-6.627-5.373-12-12-12S0 5.373 0 12c0 5.628 3.875 10.35 9.101 11.691" />
        </svg>
      ),
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      name: "LinkedIn",
      icon: (
        <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065m1.782 13.019H3.555V9h3.564zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" />
        </svg>
      ),
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    },
  ];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm hover:bg-muted transition-colors"
        aria-label="Share"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">Share</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border bg-card shadow-lg py-1 z-50">
          {platforms.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors"
              onClick={() => setOpen(false)}
            >
              {p.icon}
              {p.name}
            </a>
          ))}
          <div className="border-t my-1" />
          <button
            onClick={copyLink}
            className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted transition-colors w-full text-left"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Link2 className="h-4 w-4" />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      )}
    </div>
  );
}
