"use client";

import Image from "next/image";
import { useState } from "react";

// Tiny SVG shimmer placeholder for blur effect
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#e2e8f0" offset="20%" />
      <stop stop-color="#f1f5f9" offset="50%" />
      <stop stop-color="#e2e8f0" offset="80%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#e2e8f0" />
  <rect width="${w}" height="${h}" fill="url(#g)">
    <animate attributeName="x" from="-${w}" to="${w}" dur="1.2s" repeatCount="indefinite" />
  </rect>
</svg>`;

function toBase64(str: string) {
  return typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : btoa(str);
}

export function blurDataURL(w = 40, h = 40) {
  return `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`;
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  sizes,
}: OptimizedImageProps) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`bg-muted flex items-center justify-center text-muted-foreground text-xs ${className || ""}`}
        style={{ width, height }}
      >
        {alt.charAt(0).toUpperCase()}
      </div>
    );
  }

  // External URLs use unoptimized, internal use Next.js optimization
  const isExternal = src.startsWith("http");

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={sizes}
      placeholder="blur"
      blurDataURL={blurDataURL(width, height)}
      unoptimized={isExternal}
      onError={() => setError(true)}
    />
  );
}
