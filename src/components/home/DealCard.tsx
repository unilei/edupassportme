import { Ticket, Clock, ArrowUpRight } from "lucide-react";

interface DealCardProps {
  deal: {
    title: string;
    slug: string;
    description: string;
    url: string;
    discount?: string | null;
    code?: string | null;
    providerName?: string | null;
    expiresAt?: Date | null;
  };
}

export function DealCard({ deal }: DealCardProps) {
  return (
    <div className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-300 hover:border-orange-200 dark:hover:border-orange-800 hover:-translate-y-0.5">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400" />

      <div className="p-5 flex flex-col h-full">
        {/* Discount badge */}
        {deal.discount && (
          <div className="inline-flex self-start items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold mb-3 shadow-sm">
            <Ticket className="h-3 w-3" />
            {deal.discount}
          </div>
        )}

        <h3 className="font-semibold text-sm mb-1.5 line-clamp-1 group-hover:text-primary transition-colors">{deal.title}</h3>

        {deal.providerName && (
          <p className="text-xs text-muted-foreground mb-2 font-medium">{deal.providerName}</p>
        )}

        <p className="text-xs text-muted-foreground line-clamp-2 mb-4 flex-1 leading-relaxed">
          {deal.description}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-dashed">
          <div className="flex items-center gap-2">
            {deal.code && (
              <code className="text-xs bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 px-2.5 py-1 rounded-md font-mono border border-orange-200 dark:border-orange-800">
                {deal.code}
              </code>
            )}
            {deal.expiresAt && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Expires {new Date(deal.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
          <a
            href={deal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors group/link"
          >
            Get Deal
            <ArrowUpRight className="h-3 w-3 group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </div>
  );
}
