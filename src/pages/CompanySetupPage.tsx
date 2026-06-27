import { useEffect, useState, useRef } from "react";
import { useAuth, CompanyProfile } from "@/hooks/use-auth";
import { useAppSettings } from "@/hooks/use-app-settings";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Building2, Upload, Check, ArrowRight, Globe, Phone, Mail, MapPin, Hash, Briefcase, PackageOpen, FolderOpen, AlertTriangle, RotateCcw } from "lucide-react";
import { previewBackupFile, importCompanyBackup, type BackupManifest, type BackupProgress } from "@/utils/company-backup";

const currencyMap: Record<string, string> = {
  NGN: "₦", USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$", INR: "₹", BRL: "R$", ZAR: "R",
};

export default function CompanySetupPage() {
  const { saveCompanyProfile, user } = useAuth();
  const { updateSettings } = useAppSettings();
  const navigate = useNavigate();

  // ── Mode: null = choose, "fresh" = setup form, "restore" = import flow
  const [mode, setMode] = useState<null | "fresh" | "restore">(null);

  // ── Restore state
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewManifest, setPreviewManifest] = useState<BackupManifest | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<BackupProgress | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Staff users created under an existing company should never see the
  // onboarding form. If we can find their company via any assignment,
  // backfill the link and push them to the dashboard.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      // 1) Try stores assigned to this user
      const { data: assignment } = await supabase
        .from("user_store_assignments")
        .select("store_id, stores(company_id)")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      const companyFromStore = (assignment as any)?.stores?.company_id;

      // 2) Try profile.store_id / department_id
      let inferredCompanyId: string | null = companyFromStore || null;
      if (!inferredCompanyId) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("store_id, department_id")
          .eq("id", user.id)
          .maybeSingle();
        if (prof?.store_id) {
          const { data: s } = await supabase.from("stores").select("company_id").eq("id", prof.store_id).maybeSingle();
          inferredCompanyId = s?.company_id || null;
        }
        if (!inferredCompanyId && prof?.department_id) {
          const { data: d } = await supabase.from("departments").select("company_id").eq("id", prof.department_id).maybeSingle();
          inferredCompanyId = d?.company_id || null;
        }
      }

      if (cancelled) return;
      if (inferredCompanyId) {
        await supabase.from("profiles").update({ company_id: inferredCompanyId }).eq("id", user.id);
        toast.success("Linked to your company — welcome!");
        // Hard reload so AuthProvider re-fetches the company profile cleanly
        window.location.replace("/");
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CompanyProfile>({
    name: "",
    address: "",
    city: "",
    state: "",
    country: "Nigeria",
    phone: "",
    email: "",
    website: "",
    taxId: "",
    industry: "Retail",
    currency: "NGN",
    taxRate: 7.5,
    businessType: "Limited Company",
    logoUrl: "",
    rcNumber: "",
  });

  const updateForm = (updates: Partial<CompanyProfile>) => setForm(prev => ({ ...prev, ...updates }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 2 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateForm({ logoUrl: ev.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleComplete = async () => {
    await saveCompanyProfile(form);
    updateSettings({
      appName: form.name,
      currency: form.currency,
      currencySymbol: currencyMap[form.currency] || form.currency,
      taxRate: form.taxRate,
      logoUrl: form.logoUrl,
      receiptHeader: form.name,
    });
    navigate("/");
  };

  // ── Restore handlers
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const { ok, manifest, message } = await previewBackupFile(file);
    if (!ok) { toast.error(message); return; }
    setPendingFile(file);
    setPreviewManifest(manifest!);
    setShowConfirm(true);
  };

  const handleRestore = async () => {
    if (!pendingFile || !user?.id) return;
    setShowConfirm(false);
    setRestoreProgress({ stage: "importing", message: "Starting restore…", percent: 0 });
    const result = await importCompanyBackup(pendingFile, user.id, (p) => setRestoreProgress(p));
    if (result.ok) {
      toast.success("Company restored! Taking you to your dashboard…");
      setTimeout(() => window.location.replace("/"), 1500);
    } else {
      toast.error(result.message);
      setRestoreProgress({ stage: "error", message: result.message, percent: 0 });
    }
  };

  const canProceedStep1 = form.name && form.country && form.phone && form.email;
  const canProceedStep2 = form.industry && form.currency;
  const totalRows = previewManifest ? Object.values(previewManifest.row_counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === null ? "Get Started" : mode === "restore" ? "Restore Company" : "Set Up Your Company"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === null ? "Choose how you'd like to set up your account" :
             mode === "restore" ? "Import your backup file to restore everything" :
             "Complete your company profile to get started"}
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════
            MODE SELECT
        ════════════════════════════════════════════════════════ */}
        {mode === null && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
            {/* Start Fresh */}
            <button
              onClick={() => setMode("fresh")}
              className="glass-card rounded-2xl p-6 text-left hover:border-primary/40 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-bold text-foreground mb-1">Start Fresh</h3>
              <p className="text-xs text-muted-foreground">Set up a brand-new company from scratch. Fill in your company details and get started in minutes.</p>
              <div className="flex items-center gap-1 text-primary text-xs font-medium mt-4">
                Continue <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>

            {/* Restore Backup */}
            <button
              onClick={() => setMode("restore")}
              className="glass-card rounded-2xl p-6 text-left hover:border-warning/40 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mb-4 group-hover:bg-warning/20 transition-colors">
                <PackageOpen className="w-6 h-6 text-warning" />
              </div>
              <h3 className="font-bold text-foreground mb-1">Restore Backup</h3>
              <p className="text-xs text-muted-foreground">Have a <code className="text-primary">.vitepbak</code> file? Import your previous company — inventory, sales, customers, and settings all restored.</p>
              <div className="flex items-center gap-1 text-warning text-xs font-medium mt-4">
                Import file <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            RESTORE MODE
        ════════════════════════════════════════════════════════ */}
        {mode === "restore" && (
          <div className="glass-card rounded-2xl p-8 animate-fade-in">
            {!restoreProgress ? (
              <div className="space-y-5">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <p className="text-xs text-warning">Make sure you have your <code className="bg-warning/10 px-1 rounded">.vitepbak</code> file ready. This will set up your company using data from your previous account.</p>
                </div>

                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors">
                  <PackageOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">Select your backup file</p>
                  <p className="text-xs text-muted-foreground mb-4">Supports <code>.vitepbak</code> files exported from VITE POS</p>
                  <input ref={fileRef} type="file" accept=".vitepbak" className="hidden" onChange={handleFileSelect} />
                  <button onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors mx-auto">
                    <FolderOpen className="w-4 h-4" /> Browse File
                  </button>
                </div>

                <button onClick={() => setMode(null)} className="w-full py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                  ← Back
                </button>
              </div>
            ) : (
              <div className="space-y-5 text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto ${restoreProgress.stage === "error" ? "bg-destructive/10" : restoreProgress.stage === "done" ? "bg-success/10" : "bg-warning/10"}`}>
                  {restoreProgress.stage === "done"
                    ? <Check className="w-8 h-8 text-success" />
                    : restoreProgress.stage === "error"
                    ? <AlertTriangle className="w-8 h-8 text-destructive" />
                    : <RotateCcw className="w-8 h-8 text-warning animate-spin" />
                  }
                </div>
                <div>
                  <p className="font-semibold text-foreground">{restoreProgress.stage === "done" ? "Restore Complete!" : restoreProgress.stage === "error" ? "Restore Failed" : "Restoring…"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{restoreProgress.message}</p>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${restoreProgress.stage === "error" ? "bg-destructive" : restoreProgress.stage === "done" ? "bg-success" : "bg-warning"}`}
                    style={{ width: `${restoreProgress.percent}%` }} />
                </div>
                {restoreProgress.stage === "error" && (
                  <button onClick={() => { setRestoreProgress(null); setPendingFile(null); setPreviewManifest(null); }}
                    className="px-5 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors">
                    Try Again
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            FRESH SETUP (existing 3-step form)
        ════════════════════════════════════════════════════════ */}
        {mode === "fresh" && (
          <>
            {/* Progress */}
            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {step > s ? <Check className="w-4 h-4" /> : s}
                  </div>
                  {s < 3 && <div className={`w-12 h-0.5 rounded-full ${step > s ? "bg-primary" : "bg-muted"}`} />}
                </div>
              ))}
            </div>

            <div className="glass-card rounded-2xl p-8 animate-fade-in">
              {/* Step 1: Basic Info */}
              {step === 1 && (

            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">Company Information</h2>
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden shrink-0">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <Building2 className="w-8 h-8 text-primary/40" />
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors cursor-pointer">
                    <Upload className="w-4 h-4" />Upload Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  <p className="text-[10px] text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Company Name *</label>
                <Input value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="Micteejay Globatech" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">RC Number</label>
                <Input value={form.rcNumber} onChange={(e) => updateForm({ rcNumber: e.target.value })} placeholder="RC: 7179364" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Address</label>
                <Input value={form.address} onChange={(e) => updateForm({ address: e.target.value })} placeholder="Shop 6 Bobby Plaza Similoluwa" className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">City</label>
                  <Input value={form.city} onChange={(e) => updateForm({ city: e.target.value })} placeholder="Ado Ekiti" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">State</label>
                  <Input value={form.state} onChange={(e) => updateForm({ state: e.target.value })} placeholder="Ekiti" className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Country *</label>
                <Input value={form.country} onChange={(e) => updateForm({ country: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone *</label>
                  <Input value={form.phone} onChange={(e) => updateForm({ phone: e.target.value })} placeholder="08169491162" className="mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email *</label>
                  <Input type="email" value={form.email} onChange={(e) => updateForm({ email: e.target.value })} placeholder="company@email.com" className="mt-1" />
                </div>
              </div>
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Business Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">Business Details</h2>
              <p className="text-xs text-muted-foreground -mt-2 mb-2">These settings will configure your app's currency, tax rate, and branding automatically.</p>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Industry *</label>
                <select value={form.industry} onChange={(e) => updateForm({ industry: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option>Retail</option><option>Wholesale</option><option>Manufacturing</option><option>Technology</option><option>Healthcare</option><option>Construction</option><option>Energy</option><option>Food & Beverage</option><option>Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Business Type</label>
                <select value={form.businessType} onChange={(e) => updateForm({ businessType: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                  <option>Sole Proprietorship</option><option>Limited Company</option><option>Partnership</option><option>Corporation</option><option>NGO</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Currency *</label>
                  <select value={form.currency} onChange={(e) => updateForm({ currency: e.target.value })} className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                    <option value="NGN">₦ NGN — Nigerian Naira</option>
                    <option value="USD">$ USD — US Dollar</option>
                    <option value="EUR">€ EUR — Euro</option>
                    <option value="GBP">£ GBP — British Pound</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Default Tax Rate (%)</label>
                  <Input type="number" min={0} max={100} value={form.taxRate} onChange={(e) => updateForm({ taxRate: Number(e.target.value) })} className="mt-1" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Tax ID / TIN</label>
                <Input value={form.taxId} onChange={(e) => updateForm({ taxId: e.target.value })} placeholder="Optional" className="mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Website</label>
                <Input value={form.website} onChange={(e) => updateForm({ website: e.target.value })} placeholder="https://company.com" className="mt-1" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Back</button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Complete */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground mb-4">Review & Complete</h2>
              <div className="space-y-3 p-4 rounded-xl bg-muted/30 border border-border">
                <div className="flex items-center gap-4">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo" className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-7 h-7 text-primary" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-foreground">{form.name}</h3>
                    {form.rcNumber && <p className="text-xs text-muted-foreground">RC: {form.rcNumber}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {form.address && <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="w-3 h-3" />{form.address}, {form.city}</div>}
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Globe className="w-3 h-3" />{form.country}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Phone className="w-3 h-3" />{form.phone}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Mail className="w-3 h-3" />{form.email}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Briefcase className="w-3 h-3" />{form.industry} · {form.businessType}</div>
                  <div className="flex items-center gap-1.5 text-muted-foreground"><Hash className="w-3 h-3" />{form.currency} · {form.taxRate}% tax</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-primary font-medium">✨ Your company name, logo, currency ({currencyMap[form.currency] || form.currency} {form.currency}), and tax rate ({form.taxRate}%) will be applied across the entire app — POS, invoices, receipts, and reports.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep(2)} className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">Back</button>
                <button
                  onClick={handleComplete}
                  className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Complete Setup
                </button>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* ── Confirm Restore Modal ── */}
      {showConfirm && previewManifest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md border border-border animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <PackageOpen className="w-5 h-5 text-warning" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Restore This Backup?</h3>
                <p className="text-xs text-muted-foreground">Your account will be set up using this backup</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-muted/30 space-y-2 mb-5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Company</span>
                <span className="font-semibold text-foreground">{previewManifest.company_name}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Exported</span>
                <span className="font-medium text-foreground">{new Date(previewManifest.exported_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total records</span>
                <span className="font-medium text-foreground">{totalRows.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tables</span>
                <span className="font-medium text-foreground">{previewManifest.tables_exported.length}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-5">You will be the Super Admin of the restored company. All inventory, sales, customers, and settings will be imported.</p>
            <div className="flex gap-3">
              <button onClick={() => { setShowConfirm(false); setPendingFile(null); setPreviewManifest(null); }}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button onClick={handleRestore}
                className="flex-1 py-2.5 rounded-xl bg-warning text-warning-foreground text-sm font-semibold hover:bg-warning/90 transition-colors flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Restore Now
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

