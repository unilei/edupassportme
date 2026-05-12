type BrandMarkProps = {
  className?: string;
};

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  textClassName?: string;
};

export function BrandMark({ className = "h-8 w-8" }: BrandMarkProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 64"
      className={className}
    >
      <defs>
        <linearGradient id="brandMarkBg" x1="10" y1="8" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="1" stopColor="#0F766E" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#brandMarkBg)" />
      <path
        d="M18 17v30M18 17h16M18 32h13M18 47h17"
        fill="none"
        stroke="#F8FAFC"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M40 47V17h9c6.6 0 11 4.1 11 9.7S55.6 36 49 36h-9"
        fill="none"
        stroke="#F8FAFC"
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M41 48c7.7-1.2 13.6-6.5 15.2-14"
        fill="none"
        stroke="#A7F3D0"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BrandLogo({
  className = "",
  markClassName = "h-8 w-8",
  textClassName = "",
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark className={`shrink-0 drop-shadow-sm transition-transform duration-200 group-hover:scale-105 ${markClassName}`} />
      <span className={`font-bold tracking-normal text-foreground ${textClassName}`}>
        EDU Passport
      </span>
    </span>
  );
}
