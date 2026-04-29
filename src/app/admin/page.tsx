"use client";

import { useEffect, useState } from "react";
import { FolderOpen, Globe, Tag } from "lucide-react";

interface Stats {
  categories: number;
  items: number;
  tags: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/items").then((r) => r.json()),
      fetch("/api/admin/tags").then((r) => r.json()),
    ]).then(([cats, items, tags]: [unknown[], unknown[], unknown[]]) => {
      setStats({
        categories: cats.length,
        items: items.length,
        tags: tags.length,
      });
    });
  }, []);

  const cards = [
    { label: "Categories", value: stats?.categories ?? "...", icon: FolderOpen, color: "text-blue-500" },
    { label: "Items", value: stats?.items ?? "...", icon: Globe, color: "text-green-500" },
    { label: "Tags", value: stats?.tags ?? "...", icon: Tag, color: "text-purple-500" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border bg-card p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{card.label}</span>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-3xl font-bold">{card.value}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
