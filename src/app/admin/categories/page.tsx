"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  groupName: string;
  _count: { items: number };
}

const emptyForm = {
  id: "",
  name: "",
  slug: "",
  description: "",
  icon: "",
  sortOrder: 0,
  groupName: "Default",
};

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isEdit, setIsEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void fetch("/api/admin/categories")
      .then((res) => res.json())
      .then(setCategories);
  }, [refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const openCreate = () => {
    setForm(emptyForm);
    setIsEdit(false);
    setDialogOpen(true);
  };

  const openEdit = (cat: Category) => {
    setForm({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      icon: cat.icon || "",
      sortOrder: cat.sortOrder,
      groupName: cat.groupName,
    });
    setIsEdit(true);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEdit ? "PUT" : "POST";
    await fetch("/api/admin/categories", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDialogOpen(false);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? All items in it will also be affected.")) return;
    await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    reload();
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Categories</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Category
        </Button>
      </div>

      <div className="rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Slug</th>
              <th className="text-left p-3 font-medium">Group</th>
              <th className="text-left p-3 font-medium">Items</th>
              <th className="text-left p-3 font-medium">Order</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{cat.name}</td>
                <td className="p-3 text-muted-foreground">{cat.slug}</td>
                <td className="p-3 text-muted-foreground">{cat.groupName}</td>
                <td className="p-3">{cat._count.items}</td>
                <td className="p-3">{cat.sortOrder}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(cat)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({
                    ...f,
                    name,
                    ...(!isEdit ? { slug: slugify(name) } : {}),
                  }));
                }}
                required
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Group Name</Label>
                <Input
                  value={form.groupName}
                  onChange={(e) => setForm((f) => ({ ...f, groupName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))
                  }
                />
              </div>
            </div>
            <div>
              <Label>Icon (Lucide icon name)</Label>
              <Input
                value={form.icon}
                onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                placeholder="e.g. Code, Brain, Palette"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEdit ? "Save" : "Create"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
