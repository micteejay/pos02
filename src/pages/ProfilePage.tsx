import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useAudit } from "@/hooks/use-audit";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  User, Mail, Shield, Camera, Save, Check, Building2, Clock, KeyRound, Briefcase, Store,
} from "lucide-react";

export default function ProfilePage() {
  const { user, companyProfile } = useAuth();
  const { currentUser, roles } = useAppSettings();
  const { logAction } = useAudit();

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatar);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load real avatar URL from profiles
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("avatar, name, email").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        if (data.avatar) setAvatarUrl(data.avatar);
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
      }
    });
    // Fetch active sessions
    supabase.from("user_sessions").select("*").eq("user_id", user.id).order("started_at", { ascending: false }).limit(10).then(({ data }) => {
      if (data) setSessions(data);
    });
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error("Upload failed"); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar: url }).eq("id", user.id);
    setAvatarUrl(url);
    setUploading(false);
    toast.success("Avatar updated");
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ name, email }).eq("id", user.id);
    if (error) { toast.error("Failed to save profile"); setSaving(false); return; }
    logAction("profile.update", "Profile", name, "Profile updated");
    setSaved(true);
    toast.success("Profile saved successfully");
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const isAvatarUrl = avatarUrl?.startsWith("http");
  const initials = name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "U";

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your personal information and preferences</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${saved ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/30" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}>
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        {/* Avatar & Quick Info */}
        <div className="glass-card rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                {isAvatarUrl ? <AvatarImage src={avatarUrl} /> : null}
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
              </Avatar>
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="absolute inset-0 rounded-full bg-background/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Camera className="w-6 h-6 text-foreground" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-foreground">{name}</h2>
              <p className="text-sm text-muted-foreground">{email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary">{currentUser.role}</span>
                {currentUser.department && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{currentUser.department}</span>
                )}
                {currentUser.store && (
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">{currentUser.store}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <User className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Personal Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email Address</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Role</Label>
                <div className="mt-1 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                  <Shield className="w-3.5 h-3.5" /> {currentUser.role}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Roles are assigned by administrators</p>
              </div>
            </div>
          </div>

          {/* Organization Info */}
          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Organization</h3>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Company</Label>
                <div className="mt-1 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                  <Building2 className="w-3.5 h-3.5" /> {companyProfile?.name || "Not set"}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Department</Label>
                <div className="mt-1 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                  <Briefcase className="w-3.5 h-3.5" /> {currentUser.department || "Not assigned"}
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Assigned Store</Label>
                <div className="mt-1 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted/50 text-sm text-muted-foreground">
                  <Store className="w-3.5 h-3.5" /> {currentUser.store || "Not assigned"}
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="glass-card rounded-xl p-6 lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              <KeyRound className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Active Sessions</h3>
            </div>
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No session history recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {s.user_agent ? s.user_agent.slice(0, 60) : "Unknown device"}
                          {s.is_active && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500">Active</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.ip_address || "Unknown IP"} · Started {new Date(s.started_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
