"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Eye, MousePointerClick, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SponsoredItem {
  id: string;
  position: string;
  label: string;
  budget: number;
  spent: number;
  impressions: number;
  clicks: number;
  cpc: number | null;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  listing: {
    title: string;
    slug: string;
    type: string;
    provider: { name: string };
  };
}

export default function SponsoredPage() {
  const [items, setItems] = useState<SponsoredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ listingSlug: "", position: "feed", budget: "100", cpc: "0.50", endDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch("/api/admin/sponsored")
      .then((r) => r.json())
      .then((d) => setItems(d.sponsored || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setError("");
    setSaving(true);
    try {
      const searchRes = await fetch(`/api/admin/sponsored`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId: form.listingSlug,
          position: form.position,
          budget: parseFloat(form.budget),
          cpc: parseFloat(form.cpc),
          endDate: form.endDate || undefined,
        }),
      });

      if (!searchRes.ok) {
        const data = await searchRes.json();
        setError(data.error || "Failed to create");
        return;
      }

      setShowForm(false);
      setForm({ listingSlug: "", position: "feed", budget: "100", cpc: "0.50", endDate: "" });
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/sponsored?id=${id}`, { method: "DELETE" });
    load();
  };

  if (loading) {
    return <div className="py-20 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sponsored Listings</h1>
          <p className="text-muted-foreground">Manage promoted placements</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" /> Add Sponsored
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Listing ID</label>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                placeholder="Listing ID (cuid)"
                value={form.listingSlug}
                onChange={(e) => setForm({ ...form, listingSlug: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Position</label>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              >
                <option value="hero">Hero</option>
                <option value="feed">In-Feed</option>
                <option value="sidebar">Sidebar</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Budget ($)</label>
              <input
                type="number"
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">CPC ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                value={form.cpc}
                onChange={(e) => setForm({ ...form, cpc: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input
                type="date"
                className="w-full rounded-lg border px-3 py-2 text-sm mt-1"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button onClick={handleCreate} disabled={saving || !form.listingSlug}>
            {saving ? "Creating..." : "Create Sponsored Listing"}
          </Button>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Active</p>
          <p className="text-2xl font-bold">{items.filter((i) => i.isActive).length}</p>
        </div>
        <div className="rounded-xl border p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Impressions</p>
          <p className="text-2xl font-bold">{items.reduce((s, i) => s + i.impressions, 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border p-4 text-center">
          <p className="text-sm text-muted-foreground">Total Clicks</p>
          <p className="text-2xl font-bold">{items.reduce((s, i) => s + i.clicks, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium">Listing</th>
              <th className="text-left p-3 font-medium">Position</th>
              <th className="text-right p-3 font-medium">Budget</th>
              <th className="text-right p-3 font-medium"><Eye className="h-3.5 w-3.5 inline" /> Impr.</th>
              <th className="text-right p-3 font-medium"><MousePointerClick className="h-3.5 w-3.5 inline" /> Clicks</th>
              <th className="text-right p-3 font-medium"><DollarSign className="h-3.5 w-3.5 inline" /> CPC</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">No sponsored listings yet</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{item.listing.title}</div>
                    <div className="text-xs text-muted-foreground">{item.listing.provider.name} · {item.listing.type}</div>
                  </td>
                  <td className="p-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                      {item.position}
                    </span>
                  </td>
                  <td className="p-3 text-right">${item.budget.toFixed(0)}</td>
                  <td className="p-3 text-right">{item.impressions.toLocaleString()}</td>
                  <td className="p-3 text-right">{item.clicks.toLocaleString()}</td>
                  <td className="p-3 text-right">{item.cpc ? `$${item.cpc.toFixed(2)}` : "—"}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.isActive ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700"}`}>
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
