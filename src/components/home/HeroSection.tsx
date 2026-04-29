import { SearchInput } from "@/components/shared/SearchInput";

export function HeroSection() {
  return (
    <section className="relative py-16 sm:py-24 text-center">
      <div className="absolute inset-0 -z-10 bg-linear-to-b from-primary/5 via-primary/2 to-transparent" />
      <div className="mx-auto max-w-2xl px-4">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
          Discover the Best Learning Resources & Educational Tools
        </h1>
        <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-lg mx-auto">
          A curated directory of the best online courses, learning platforms, and educational tools for students, educators, and lifelong learners.
        </p>
        <div className="max-w-xl mx-auto">
          <SearchInput size="lg" placeholder="Search courses, tools, platforms..." />
        </div>
      </div>
    </section>
  );
}
