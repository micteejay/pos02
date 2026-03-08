import { useState } from "react";
import { useAuth, CompanyProfile } from "@/hooks/use-auth";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Building2, Upload, Check, ArrowRight, Globe, Phone, Mail, MapPin, Hash, Briefcase } from "lucide-react";

export default function CompanySetupPage() {
  const { saveCompanyProfile, hasCompanyProfile } = useAuth();
  const navigate = useNavigate();

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

  const handleComplete = () => {
    saveCompanyProfile(form);
    navigate("/");
  };

  const canProceedStep1 = form.name && form.country && form.phone && form.email;
  const canProceedStep2 = form.industry && form.currency;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Set Up Your Company</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete your company profile to get started</p>
        </div>

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
      </div>
    </div>
  );
}
