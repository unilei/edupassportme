"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";

interface TagItem {
  id: string;
  name: string;
  slug: string;
  _count: { items: number };
}

const emptyForm = { id: "", name: "", slug: "" };

export default function AdminTagsPage() {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [isEdit, setIsEdit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    void fetch("/api/admin/tags")
      .then((res) => res.json())
      .then(setTags);
  }, [refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const openCreate = () => {
    setForm(emptyForm);
    setIsEdit(false);
    setDialogOpen(true);
  };

  const openEdit = (tag: TagItem) => {
    setForm({ id: tag.id, name: tag.name, slug: tag.slug });
    setIsEdit(true);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = isEdit ? "PUT" : "POST";
    await fetch("/api/admin/tags", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setDialogOpen(false);
    reload();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tag?")) return;
    await fetch(`/api/admin/tags?id=${id}`, { method: "DELETE" });
    reload();
  };

  const slugify = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Tags</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Add Tag
        </Button>
      </div>

      <div className="rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Slug</th>
              <th className="text-left p-3 font-medium">Items</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tags.map((tag) => (
              <tr key={tag.id} className="border-b last:border-0">
                <td className="p-3 font-medium">{tag.name}</td>
                <td className="p-3 text-muted-foreground">{tag.slug}</td>
                <td className="p-3">{tag._count.items}</td>
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(tag)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(tag.id)}>
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
            <DialogTitle>{isEdit ? "Edit Tag" : "New Tag"}</DialogTitle>
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
