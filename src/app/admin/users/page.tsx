"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Ban,
  CheckCircle,
  Shield,
  Crown,
  User,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: string;
  tier: string;
  proExpiresAt: string | null;
  banned: boolean;
  bannedAt: string | null;
  bannedReason: string | null;
  emailVerified: boolean;
  createdAt: string;
  _count: { reviews: number; applications: number; savedListings: number };
}

interface UsersResponse {
  users: UserItem[];
  total: number;
  page: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [bannedFilter, setBannedFilter] = useState("");

  // Ban dialog
  const [banDialog, setBanDialog] = useState(false);
  const [banTarget, setBanTarget] = useState<UserItem | null>(null);
  const [banReason, setBanReason] = useState("");

  // Role dialog
  const [roleDialog, setRoleDialog] = useState(false);
  const [roleTarget, setRoleTarget] = useState<UserItem | null>(null);
  const [newRole, setNewRole] = useState("");

  // Manual Pro dialog
  const [proDialog, setProDialog] = useState(false);
  const [proTarget, setProTarget] = useState<UserItem | null>(null);
  const [proExpiresAt, setProExpiresAt] = useState("");

  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const defaultProExpiry = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  };

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (bannedFilter) params.set("banned", bannedFilter);

    let cancelled = false;
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d: UsersResponse) => { if (!cancelled) setData(d); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search, roleFilter, bannedFilter, refreshKey]);

  const reload = () => setRefreshKey((k) => k + 1);

  const patchUser = async (payload: Record<string, unknown>) => {
    setActionError("");
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string };
      setActionError(data.error || "User update failed.");
      return false;
    }
    return true;
  };

  const handleBan = async () => {
    if (!banTarget) return;
    const ok = await patchUser({ id: banTarget.id, action: "ban", reason: banReason });
    if (!ok) return;
    setBanDialog(false);
    setBanReason("");
    reload();
  };

  const handleUnban = async (id: string) => {
    const ok = await patchUser({ id, action: "unban" });
    if (!ok) return;
    reload();
  };

  const handleRoleChange = async () => {
    if (!roleTarget || !newRole) return;
    const ok = await patchUser({ id: roleTarget.id, action: "role", role: newRole });
    if (!ok) return;
    setRoleDialog(false);
    reload();
  };

  const openProDialog = (user: UserItem) => {
    setProTarget(user);
    setProExpiresAt(user.proExpiresAt ? user.proExpiresAt.slice(0, 10) : defaultProExpiry());
    setProDialog(true);
  };

  const handleGrantPro = async () => {
    if (!proTarget || !proExpiresAt) return;
    const ok = await patchUser({
      id: proTarget.id,
      action: "grant_pro",
      proExpiresAt: new Date(`${proExpiresAt}T23:59:59.999Z`).toISOString(),
    });
    if (!ok) return;
    setProDialog(false);
    reload();
  };

  const handleRevokePro = async (id: string) => {
    const ok = await patchUser({ id, action: "revoke_pro" });
    if (!ok) return;
    reload();
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      pro: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      user: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || colors.user}`}>
        {role === "admin" ? <Shield className="h-3 w-3" /> : role === "pro" ? <Crown className="h-3 w-3" /> : <User className="h-3 w-3" />}
        {role}
      </span>
    );
  };

  const planBadge = (user: UserItem) => {
    if (user.tier !== "pro") {
      return <span className="text-xs text-muted-foreground">Free</span>;
    }

    return (
      <div className="space-y-1">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Crown className="h-3 w-3" /> Pro
        </span>
        {user.proExpiresAt && (
          <div className="text-[11px] text-muted-foreground">
            until {new Date(user.proExpiresAt).toLocaleDateString()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground text-sm">
            {data ? `${data.total} users total` : "Loading..."}
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/api/admin/export?type=users" download>
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </a>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All roles</option>
          <option value="user">User</option>
          <option value="pro">Pro</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={bannedFilter}
          onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">All status</option>
          <option value="false">Active</option>
          <option value="true">Banned</option>
        </select>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300">
          {actionError}
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Role</th>
              <th className="text-left p-3 font-medium">Plan</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Stats</th>
              <th className="text-left p-3 font-medium">Joined</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : data?.users.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No users found</td></tr>
            ) : (
              data?.users.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-medium">{u.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </td>
                  <td className="p-3">{roleBadge(u.role)}</td>
                  <td className="p-3">{planBadge(u)}</td>
                  <td className="p-3">
                    {u.banned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                        <Ban className="h-3 w-3" /> Banned
                      </span>
                    ) : u.emailVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle className="h-3 w-3" /> Verified
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unverified</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>{u._count.reviews} reviews</div>
                      <div>{u._count.savedListings} saved</div>
                    </div>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => { setRoleTarget(u); setNewRole(u.role); setRoleDialog(true); }}
                      >
                        Role
                      </Button>
                      {u.tier === "pro" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-amber-700"
                          onClick={() => handleRevokePro(u.id)}
                        >
                          Revoke Pro
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-amber-700"
                          onClick={() => openProDialog(u)}
                        >
                          Grant Pro
                        </Button>
                      )}
                      {u.banned ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-green-600"
                          onClick={() => handleUnban(u.id)}
                        >
                          Unban
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-red-600"
                          onClick={() => { setBanTarget(u); setBanDialog(true); }}
                        >
                          Ban
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Ban Dialog */}
      <Dialog open={banDialog} onOpenChange={setBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Banning <strong>{banTarget?.email}</strong>. They will not be able to log in.
          </p>
          <div>
            <label className="text-sm font-medium">Reason (optional)</label>
            <Input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="e.g. Spam, abuse..."
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setBanDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBan}>Confirm Ban</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Changing role for <strong>{roleTarget?.email}</strong>
          </p>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            <option value="user">User</option>
            <option value="pro">Pro</option>
            <option value="admin">Admin</option>
          </select>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setRoleDialog(false)}>Cancel</Button>
            <Button onClick={handleRoleChange}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Pro Dialog */}
      <Dialog open={proDialog} onOpenChange={setProDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Pro Access</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Manually activating Pro for <strong>{proTarget?.email}</strong>.
          </p>
          <div>
            <label className="text-sm font-medium">Expires on</label>
            <Input
              type="date"
              value={proExpiresAt}
              onChange={(e) => setProExpiresAt(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="outline" onClick={() => setProDialog(false)}>Cancel</Button>
            <Button onClick={handleGrantPro}>Grant Pro</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
