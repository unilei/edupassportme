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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface ItemData {
  id: string;
  name: string;
  slug: string;
  url: string;
  description: string;
  content: string | null;
  icon: string | null;
  screenshot: string | null;
  featured: boolean;
  sortOrder: number;
  categoryId: string;
  category: { name: string; slug: string };
  tags: { tag: { id: string; name: string; slug: string } }[];
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface TagOption {
  id: string;
  name: string;
  slug: string;
}

const emptyForm = {
  id: "",
  name: "",
  slug: "",
  url: "",
  description: "",
  content: "",
  icon: "",
  screenshot: "",
  featured: false,
  sortOrder: 0,
  categoryId: "",
  tagIds: [] as string[],
};

export default function AdminItemsPage() {
  const [items, setItems] = useState<ItemData[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tags, setTags] = useState<TagOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isEdit, setIsEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/items").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/tags").then((r) => r.json()),
    ]).then(([itemData, catData, tagData]) => {
      setItems(itemData);
      setCategories(catData);
      setTags(tagData);
    });
  }, [refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const openCreate = () => {
    setForm(emptyForm);
    setIsEdit(false);
    setDialogOpen(true);
  };

  const openEdit = (item: ItemData) => {
    setForm({
      id: item.id,
      name: item.name,
      slug: item.slug,
      url: item.url,
      description: item.description,
      content: item.content || "",
      icon: item.icon || "",
      screenshot: item.screenshot || "",
      featured: item.featured,
      sortOrder: item.sortOrder,
      categoryId: item.categoryId,
      tagIds: item.tags.map((t) => t.tag.id),
    });
    setIsEdit(true);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEdit ? "PUT" : "POST";
    await fetch("/api/admin/items", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDialogOpen(false);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/admin/items?id=${id}`, { method: "DELETE" });
    reload();
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const toggleTag = (tagId: string) => {
    setForm((f) => ({
      ...f,
      tagIds: f.tagIds.includes(tagId)
        ? f.tagIds.filter((id) => id !== tagId)
        : [...f.tagIds, tagId],
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Items</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium hidden md:table-cell">Category</th>
              <th className="text-left p-3 font-medium hidden lg:table-cell">URL</th>
              <th className="text-left p-3 font-medium">Featured</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{item.name}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">
                  {item.category.name}
                </td>
                <td className="p-3 text-muted-foreground hidden lg:table-cell truncate max-w-48">
                  {item.url}
                </td>
                <td className="p-3">{item.featured ? "Yes" : ""}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Item" : "New Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>
            <div>
              <Label>URL</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                placeholder="https://"
                required
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Content (Markdown/HTML)</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(val) => setForm((f) => ({ ...f, categoryId: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Icon URL</Label>
                <Input
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  placeholder="https://example.com/favicon.ico"
                />
              </div>
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                      form.tagIds.includes(tag.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
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
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                    className="rounded"
                  />
                  <span className="text-sm">Featured</span>
                </label>
              </div>
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
