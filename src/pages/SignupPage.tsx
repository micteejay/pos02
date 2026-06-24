import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { UserPlus, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordError = confirmPassword && password !== confirmPassword
    ? "Passwords do not match"
    : password && password.length < 8
    ? "Min 8 characters"
    : "";

  const canSubmit = name && email && password && password.length >= 8 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { ok, message, needsEmailConfirmation } = await signup(email, password, name);
    setLoading(false);
    if (ok) {
      if (needsEmailConfirmation) {
        toast.success("Account created! Please check your email to confirm.");
      } else {
        toast.success("Account created successfully!");
      }
    } else {
      setError(message || "An account with this email already exists.");
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:flex lg:w-1/2 bg-white relative overflow-hidden">
        <img src="/logo.png" alt="Vite POS" className="absolute inset-0 w-full h-full object-cover" />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <div className="bg-white p-4 rounded-xl shadow-sm w-full max-w-[280px] flex justify-center mx-auto">
              <img src="/logo.png" alt="Vite POS" className="h-24 w-auto object-contain" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Create your account</h2>
          <p className="text-sm text-muted-foreground mb-8">Start your free trial today</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Full Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="mt-1" autoFocus />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@company.com" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" className="mt-1" />
              {passwordError && <p className="text-xs text-destructive mt-1">{passwordError}</p>}
            </div>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
