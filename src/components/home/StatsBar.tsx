import { GraduationCap, Briefcase, Calendar, Tag, Building2 } from "lucide-react";

interface StatsBarProps {
  courseCount: number;
  jobCount: number;
  eventCount: number;
  dealCount: number;
  providerCount: number;
}

export function StatsBar({ courseCount, jobCount, eventCount, dealCount, providerCount }: StatsBarProps) {
  const stats = [
    { icon: GraduationCap, value: courseCount, label: "Courses", color: "text-blue-600 dark:text-blue-400" },
    { icon: Briefcase, value: jobCount, label: "Jobs", color: "text-green-600 dark:text-green-400" },
    { icon: Calendar, value: eventCount, label: "Events", color: "text-purple-600 dark:text-purple-400" },
    { icon: Tag, value: dealCount, label: "Deals", color: "text-orange-600 dark:text-orange-400" },
    { icon: Building2, value: providerCount, label: "Providers", color: "text-primary" },
  ];

  return (
    <div className="border-y bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-wrap justify-center gap-8 sm:gap-12">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="flex items-center gap-3 text-sm group">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-background shadow-sm border group-hover:scale-110 transition-transform">
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-lg leading-tight">{stat.value.toLocaleString()}</span>
                  <span className="text-muted-foreground text-xs">{stat.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
