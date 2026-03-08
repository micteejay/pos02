import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface CompanyProfile {
  id?: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  taxId: string;
  industry: string;
  currency: string;
  taxRate: number;
  businessType: string;
  logoUrl: string;
  rcNumber: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  companyProfile: CompanyProfile | null;
  hasCompanyProfile: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  saveCompanyProfile: (profile: CompanyProfile) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (supaUser: User) => {
    // Get profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, email, avatar")
      .eq("id", supaUser.id)
      .single();

    // Resolve role via secure role checks (works even when direct user_roles reads are restricted)
    const rolePriority = [
      { key: "super_admin", label: "Super Admin" },
      { key: "admin", label: "Admin" },
      { key: "manager", label: "Manager" },
      { key: "sales_rep", label: "Sales Rep" },
      { key: "warehouse_staff", label: "Warehouse Staff" },
      { key: "viewer", label: "Viewer" },
    ] as const;

    const roleChecks = await Promise.all(
      rolePriority.map(async ({ key, label }) => {
        const { data } = await supabase.rpc("has_role", { _user_id: supaUser.id, _role: key });
        return data ? label : null;
      })
    );

    const roleName = roleChecks.find((role): role is string => !!role) || "Viewer";

    const authUser: AuthUser = {
      id: supaUser.id,
      email: supaUser.email || "",
      name: profile?.name || supaUser.email?.split("@")[0] || "User",
      role: roleName,
    };
    setUser(authUser);

    // Fetch latest company profile for this owner (handles legacy duplicate rows safely)
    const { data: companyRows } = await supabase
      .from("company_profiles")
      .select("*")
      .eq("owner_id", supaUser.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    const company = companyRows?.[0] ?? null;

    if (company) {
      setCompanyProfile({
        id: company.id,
        name: company.name,
        address: company.address || "",
        city: company.city || "",
        state: company.state || "",
        country: company.country || "Nigeria",
        phone: company.phone || "",
        email: company.email || "",
        website: company.website || "",
        taxId: company.tax_id || "",
        industry: company.industry || "Retail",
        currency: company.currency || "NGN",
        taxRate: Number(company.tax_rate) || 7.5,
        businessType: company.business_type || "Limited Company",
        logoUrl: company.logo_url || "",
        rcNumber: company.rc_number || "",
      });
    } else {
      setCompanyProfile(null);
    }
  }, []);

  useEffect(() => {
    let initialLoad = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid potential deadlock with Supabase client
          // but only set loading=false AFTER profile is fetched
          setTimeout(async () => {
            await fetchUserProfile(session.user);
            if (!initialLoad) return; // getSession already handled it
            setLoading(false);
          }, 0);
        } else {
          setUser(null);
          setCompanyProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        await fetchUserProfile(session.user);
      }
      initialLoad = false;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  const login = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    let email = identifier;
    // If not an email, look up the email by username in profiles
    if (!identifier.includes("@")) {
      const { data } = await supabase
        .from("profiles")
        .select("email")
        .ilike("name", identifier)
        .limit(1)
        .single();
      if (!data?.email) return false;
      email = data.email;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !error;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    return !error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCompanyProfile(null);
  }, []);

  const saveCompanyProfile = useCallback(async (profile: CompanyProfile) => {
    if (!user) return;

    const payload = {
      owner_id: user.id,
      name: profile.name,
      address: profile.address || null,
      city: profile.city || null,
      state: profile.state || null,
      country: profile.country || "Nigeria",
      phone: profile.phone || null,
      email: profile.email || null,
      website: profile.website || null,
      tax_id: profile.taxId || null,
      industry: profile.industry || "Retail",
      currency: profile.currency || "NGN",
      tax_rate: profile.taxRate,
      business_type: profile.businessType || "Limited Company",
      logo_url: profile.logoUrl || null,
      rc_number: profile.rcNumber || null,
    };

    const { data: existingRows } = await supabase
      .from("company_profiles")
      .select("id")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    const existingCompanyId = profile.id || existingRows?.[0]?.id;

    if (existingCompanyId) {
      await supabase.from("company_profiles").update(payload).eq("id", existingCompanyId);
      profile.id = existingCompanyId;
    } else {
      const { data } = await supabase.from("company_profiles").insert(payload).select("id").single();
      if (data) profile.id = data.id;

      // Promote to Super Admin via secure server-side function
      await supabase.rpc("promote_to_super_admin", { _user_id: user.id });
      setUser(prev => prev ? { ...prev, role: "Super Admin" } : prev);
    }

    setCompanyProfile(profile);
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      companyProfile,
      hasCompanyProfile: !!companyProfile,
      loading,
      login,
      signup,
      logout,
      saveCompanyProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
