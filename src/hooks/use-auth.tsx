import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

export interface CompanyProfile {
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
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  saveCompanyProfile: (profile: CompanyProfile) => void;
}

const AuthContext = createContext<AuthContextType>(null!);

const ADMIN_EMAIL = "admin";
const ADMIN_PASSWORD = "admin12345";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth-user");
    return stored ? JSON.parse(stored) : null;
  });

  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(() => {
    const stored = localStorage.getItem("company-profile");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Check admin credentials
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const u: AuthUser = { id: "u1", email: "admin@app.com", name: "Admin", role: "Super Admin" };
      setUser(u);
      localStorage.setItem("auth-user", JSON.stringify(u));
      return true;
    }
    // Check registered users
    const registeredUsers = JSON.parse(localStorage.getItem("registered-users") || "[]");
    const found = registeredUsers.find((u: any) => u.email === email && u.password === password);
    if (found) {
      const u: AuthUser = { id: found.id, email: found.email, name: found.name, role: "Viewer" };
      setUser(u);
      localStorage.setItem("auth-user", JSON.stringify(u));
      return true;
    }
    return false;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    const registeredUsers = JSON.parse(localStorage.getItem("registered-users") || "[]");
    if (registeredUsers.some((u: any) => u.email === email)) return false;
    const newUser = { id: `u${Date.now()}`, email, password, name };
    registeredUsers.push(newUser);
    localStorage.setItem("registered-users", JSON.stringify(registeredUsers));
    const u: AuthUser = { id: newUser.id, email, name, role: "Viewer" };
    setUser(u);
    localStorage.setItem("auth-user", JSON.stringify(u));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("auth-user");
  }, []);

  const saveCompanyProfile = useCallback((profile: CompanyProfile) => {
    setCompanyProfile(profile);
    localStorage.setItem("company-profile", JSON.stringify(profile));
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      companyProfile,
      hasCompanyProfile: !!companyProfile,
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
