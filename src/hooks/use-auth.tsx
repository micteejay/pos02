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
  companyId: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  companyProfile: CompanyProfile | null;
  hasCompanyProfile: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ ok: boolean; message?: string; needsEmailConfirmation?: boolean }>;
  logout: () => void;
  saveCompanyProfile: (profile: CompanyProfile) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = useCallback(async (supaUser: User) => {
    console.log("[fetchUserProfile] Start for user:", supaUser.email);
    // Get profile (including company_id, store_id, and department_id)
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("name, email, avatar, company_id, store_id, department_id")
      .eq("id", supaUser.id)
      .single();

    if (profileErr) {
      console.log("[fetchUserProfile] Profile fetch error:", profileErr);
    } else {
      console.log("[fetchUserProfile] Profile fetch success:", profile);
    }

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
        const { data, error } = await supabase.rpc("has_role", { _user_id: supaUser.id, _role: key });
        if (error) console.log(`[fetchUserProfile] rpc has_role error for ${key}:`, error);
        return data ? label : null;
      })
    );

    const roleName = (roleChecks.find((role) => role !== null) ?? "Viewer") as string;
    console.log("[fetchUserProfile] Derived role name:", roleName);

    let profileCompanyId = profile?.company_id || null;

    // Self-healing: if company_id is null, infer it from store_id or department_id
    if (!profileCompanyId) {
      if (profile?.store_id) {
        const { data: storeRow } = await supabase
          .from("stores")
          .select("company_id")
          .eq("id", profile.store_id)
          .single();
        if (storeRow?.company_id) {
          profileCompanyId = storeRow.company_id;
          console.log("[fetchUserProfile] Self-healed profileCompanyId from store_id:", profileCompanyId);
          // Background update to self-heal profile row
          supabase
            .from("profiles")
            .update({ company_id: profileCompanyId })
            .eq("id", supaUser.id)
            .then(({ error }) => {
              if (error) console.error("Self-healing company_id update failed:", error);
            });
        }
      }
      if (!profileCompanyId && profile?.department_id) {
        const { data: deptRow } = await supabase
          .from("departments")
          .select("company_id")
          .eq("id", profile.department_id)
          .single();
        if (deptRow?.company_id) {
          profileCompanyId = deptRow.company_id;
          console.log("[fetchUserProfile] Self-healed profileCompanyId from department_id:", profileCompanyId);
          // Background update to self-heal profile row
          supabase
            .from("profiles")
            .update({ company_id: profileCompanyId })
            .eq("id", supaUser.id)
            .then(({ error }) => {
              if (error) console.error("Self-healing company_id update failed:", error);
            });
        }
      }
    }

    const authUser: AuthUser = {
      id: supaUser.id,
      email: supaUser.email || "",
      name: profile?.name || supaUser.email?.split("@")[0] || "User",
      role: roleName,
      companyId: profileCompanyId,
    };
    console.log("[fetchUserProfile] Setting user state:", authUser);
    setUser(authUser);

    // Fetch company profile: by company_id on profile (works for both owners and staff)
    let company: any = null;
    if (profileCompanyId) {
      const { data: companyRow, error: compErr } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("id", profileCompanyId)
        .single();
      if (compErr) console.log("[fetchUserProfile] Company fetch error:", compErr);
      company = companyRow;
    } else {
      // Fallback: check if user owns a company (pre-migration scenario)
      const { data: companyRows, error: compRowsErr } = await supabase
        .from("company_profiles")
        .select("*")
        .eq("owner_id", supaUser.id)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (compRowsErr) console.log("[fetchUserProfile] Fallback company fetch error:", compRowsErr);
      company = companyRows?.[0] ?? null;
    }

    console.log("[fetchUserProfile] Loaded company profile:", company);

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
    let active = true;
    let lastUserId: string | null = null;

    const handleSessionChange = async (session: Session | null) => {
      if (!active) return;

      const currentUserId = session?.user?.id || null;
      if (currentUserId === lastUserId && lastUserId !== null) {
        setLoading(false);
        return;
      }
      lastUserId = currentUserId;

      try {
        if (session?.user) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setCompanyProfile(null);
        }
      } catch (err) {
        console.error("Error in auth state change:", err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    // Get initial session. If the browser has a stale refresh token, clear the
    // local auth cache so protected screens can show a normal sign-in state.
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (active) {
        if (error) {
          await supabase.auth.signOut({ scope: "local" });
          setUser(null);
          setCompanyProfile(null);
          setLoading(false);
          return;
        }
        handleSessionChange(session);
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (active) {
          if (event === "SIGNED_OUT" || !session) {
            lastUserId = null;
            setUser(null);
            setCompanyProfile(null);
            setLoading(false);
          } else {
            await handleSessionChange(session);
          }
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const login = useCallback(async (identifier: string, password: string): Promise<{ ok: boolean; message?: string }> => {
    let email = identifier;
    if (!identifier.includes("@")) {
      // Try synthetic email pattern first (used by create-user edge function)
      const syntheticEmail = `${identifier.toLowerCase().replace(/\s+/g, ".")}@staff.internal`;
      const { data, error: syntheticError } = await supabase.auth.signInWithPassword({ email: syntheticEmail, password });
      if (!syntheticError) {
        if (data.session) await fetchUserProfile(data.session.user);
        return { ok: true };
      }

      // Fallback: look up by display name in profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email")
        .ilike("name", identifier)
        .limit(1)
        .single();
      if (profileData?.email) {
        const { data, error } = await supabase.auth.signInWithPassword({ email: profileData.email, password });
        if (!error && data.session) await fetchUserProfile(data.session.user);
        return error ? { ok: false, message: error.message } : { ok: true };
      }
      return { ok: false, message: syntheticError?.message || "Invalid login credentials" };
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.session) await fetchUserProfile(data.session.user);
    return error ? { ok: false, message: error.message } : { ok: true };
  }, [fetchUserProfile]);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<{ ok: boolean; message?: string; needsEmailConfirmation?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, needsEmailConfirmation: !data.session };
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

      // Promote to Super Admin via secure server-side function (also sets company_id on profile)
      await supabase.rpc("promote_to_super_admin", { _user_id: user.id });
      setUser(prev => prev ? { ...prev, role: "Super Admin", companyId: profile.id || null } : prev);
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
