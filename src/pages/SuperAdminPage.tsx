import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Shield, UserPlus, Pencil, Trash2, KeyRound, RefreshCw, Search, LogOut, ShieldCheck, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";

const SUPER_ADMIN_EMAIL = "babajuwon0@gmail.com";
const GATE_PASSWORD = "admin12345";
const PAGE_SIZE = 20;

type SuperUser = {
  id: string;
  name: string | null;
  email: string | null;
  company_id: string | null;
  company_name: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  roles?: { id: string; name: string }[];
};

type RoleRow = { id: string; name: string; description?: string | null };

type SortKey = "name" | "email" | "company_name" | "last_sign_in_at" | "created_at";
type SortDir = "asc" | "desc";

export default function SuperAdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAllowed = (user?.email || "").toLowerCase() === SUPER_ADMIN_EMAIL;

  const [unlocked, setUnlocked] = useState(false);
  const [gate, setGate] = useState("");
  const [users, setUsers] = useState<SuperUser[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SuperUser | null>(null);
  const [deleting, setDeleting] = useState<SuperUser | null>(null);
  const [pwUser, setPwUser] = useState<SuperUser | null>(null);
  const [roleUser, setRoleUser] = useState<SuperUser | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (action: string, body: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("super-admin", { body: { action, ...body } });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error((data as any).error);
    return data as any;
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [u, r] = await Promise.all([call("list"), call("list_roles").catch(() => ({ roles: [] }))]);
      setUsers(u.users || []);
      setRoles(r.roles || []);
    } catch (e) {
      toast({ title: "Failed to load users", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => { if (unlocked && isAllowed) load(); }, [unlocked, isAllowed, load]);
  useEffect(() => { setPage(1); }, [q, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir("asc"); }
  };

  const filteredSorted = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = users.filter((u) =>
      !s || [u.name, u.email, u.company_name].some((v) => (v || "").toLowerCase().includes(s))
    );
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = (a[sortKey] as string | null) || "";
      const bv = (b[sortKey] as string | null) || "";
      return av.localeCompare(bv) * dir;
    });
  }, [users, q, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const pageRows = filteredSorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const SortHeader = ({ k, label }: { k: SortKey; label: string }) => (
    <button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort(k)}>
      {label}
      {sortKey === k && (sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );

  if (!isAllowed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="p-8 max-w-md text-center space-y-4">
          <Shield className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-xl font-semibold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            This area is restricted to the platform owner.
          </p>
          <Button onClick={() => navigate("/")} variant="outline" className="w-full">Back to app</Button>
        </Card>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="p-8 max-w-md w-full space-y-4">
          <div className="text-center space-y-2">
            <Shield className="mx-auto h-10 w-10 text-primary" />
            <h1 className="text-xl font-semibold">Super Admin Console</h1>
            <p className="text-sm text-muted-foreground">Enter your admin passcode to continue.</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (gate === GATE_PASSWORD) setUnlocked(true);
              else toast({ title: "Incorrect passcode", variant: "destructive" });
            }}
            className="space-y-3"
          >
            <Input
              type="password"
              placeholder="Passcode"
              value={gate}
              onChange={(e) => setGate(e.target.value)}
              autoFocus
            />
            <Button type="submit" className="w-full">Unlock</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">Super Admin</h1>
              <p className="text-xs text-muted-foreground">Global oversight — all users across every company</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => { setForm({ name: "", email: "", password: "" }); setCreateOpen(true); }}>
              <UserPlus className="h-4 w-4 mr-2" /> Add User
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setUnlocked(false)}>
              <LogOut className="h-4 w-4 mr-2" /> Lock
            </Button>
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or company..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="max-w-md"
            />
            <span className="text-xs text-muted-foreground ml-auto">{filteredSorted.length} of {users.length}</span>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead><SortHeader k="name" label="Name" /></TableHead>
                  <TableHead><SortHeader k="email" label="Email" /></TableHead>
                  <TableHead><SortHeader k="company_name" label="Company" /></TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead><SortHeader k="last_sign_in_at" label="Last sign in" /></TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell></TableRow>
                )}
                {!loading && pageRows.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                )}
                {!loading && pageRows.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name || "—"}</TableCell>
                    <TableCell className="text-sm">{u.email || "—"}</TableCell>
                    <TableCell className="text-sm">{u.company_name || <span className="text-muted-foreground">None</span>}</TableCell>
                    <TableCell className="text-xs">
                      {(u.roles && u.roles.length)
                        ? <div className="flex flex-wrap gap-1">{u.roles.map((r) => <Badge key={r.id} variant="secondary">{r.name}</Badge>)}</div>
                        : <span className="text-muted-foreground">None</span>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" title="Edit" onClick={() => { setEditing(u); setForm({ name: u.name || "", email: u.email || "", password: "" }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Assign role" onClick={() => { setRoleUser(u); setSelectedRoleId(u.roles?.[0]?.id || ""); }}>
                        <ShieldCheck className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Reset password" onClick={() => { setPwUser(u); setNewPassword(""); }}>
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => setDeleting(u)} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {!loading && filteredSorted.length > 0 && (
            <div className="flex items-center justify-between mt-4 text-sm">
              <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Creates a new authenticated user. Email is auto-confirmed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>Password</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={busy || !form.email || !form.password || !form.name}
              onClick={async () => {
                setBusy(true);
                try {
                  await call("create", form);
                  toast({ title: "User created" });
                  setCreateOpen(false);
                  load();
                } catch (e) {
                  toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
                } finally { setBusy(false); }
              }}
            >Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Leave password blank to keep the existing one.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>New Password (optional)</Label><Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              disabled={busy}
              onClick={async () => {
                if (!editing) return;
                setBusy(true);
                try {
                  await call("update", { userId: editing.id, name: form.name, email: form.email, password: form.password || undefined });
                  toast({ title: "User updated" });
                  setEditing(null);
                  load();
                } catch (e) {
                  toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
                } finally { setBusy(false); }
              }}
            >Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password-only dialog */}
      <Dialog open={!!pwUser} onOpenChange={(o) => !o && setPwUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>Set a new password for {pwUser?.email || pwUser?.name}.</DialogDescription>
          </DialogHeader>
          <Input type="text" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwUser(null)}>Cancel</Button>
            <Button
              disabled={busy || newPassword.length < 6}
              onClick={async () => {
                if (!pwUser) return;
                setBusy(true);
                try {
                  await call("update", { userId: pwUser.id, password: newPassword });
                  toast({ title: "Password updated" });
                  setPwUser(null);
                } catch (e) {
                  toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
                } finally { setBusy(false); }
              }}
            >Update Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes <strong>{deleting?.email || deleting?.name}</strong> and their auth record. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleting) return;
                try {
                  await call("delete", { userId: deleting.id });
                  toast({ title: "User deleted" });
                  setDeleting(null);
                  load();
                } catch (e) {
                  toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
                }
              }}
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role assignment */}
      <Dialog open={!!roleUser} onOpenChange={(o) => !o && setRoleUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign an RBAC role to {roleUser?.name || roleUser?.email}. Scoped to their company.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {roleUser?.company_name && (
              <p className="text-xs text-muted-foreground">Company: {roleUser.company_name}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleUser(null)}>Cancel</Button>
            <Button
              disabled={busy || !selectedRoleId}
              onClick={async () => {
                if (!roleUser) return;
                setBusy(true);
                try {
                  await call("assign_role", { userId: roleUser.id, roleId: selectedRoleId });
                  toast({ title: "Role updated" });
                  setRoleUser(null);
                  load();
                } catch (e) {
                  toast({ title: "Failed", description: (e as Error).message, variant: "destructive" });
                } finally { setBusy(false); }
              }}
            >Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}