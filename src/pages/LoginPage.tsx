import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate, Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogIn, Eye, EyeOff, AlertCircle, Mail, ArrowLeft, X } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your username or email."); return; }
    if (!password) { setError("Please enter your password."); return; }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.ok) {
      // Surface organization context as soon as we land on the app.
      // The actual company name is loaded by the auth provider; show a
      // generic toast here and the AppLayout chip will reflect the company.
      toast.success("Signed in. Loading your organization…");
      navigate("/");
      return;
    }
    const msg = result.message || "";
    if (/invalid login|invalid credentials/i.test(msg)) {
      setError("Wrong username or password. Please try again.");
    } else if (/email not confirmed|not confirmed/i.test(msg)) {
      setError("Your email is not yet confirmed. Please check your inbox.");
    } else if (/rate limit|too many/i.test(msg)) {
      setError("Too many attempts. Please wait a moment and try again.");
    } else if (/network|fetch/i.test(msg)) {
      setError("Network error. Check your connection and retry.");
    } else {
      setError("Could not sign in. Please check your credentials.");
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim() || !resetEmail.includes("@")) {
      toast.error("Enter the email address linked to your account.");
      return;
    }
    setResetSending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetSending(false);
    if (error) {
      toast.error(error.message || "Could not send reset email.");
      return;
    }
    setResetSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-accent blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md text-center px-8">
          <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
            <span className="text-primary-foreground font-bold text-3xl">E</span>
          </div>
          <h1 className="text-3xl font-bold text-sidebar-accent-foreground mb-3">Enterprise Hub</h1>
          <p className="text-sidebar-foreground text-sm leading-relaxed">
            Complete business management platform. Inventory, sales, POS, supply chain, and more — all in one place.
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">E</span>
            </div>
            <span className="text-xl font-bold text-foreground">Enterprise Hub</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Welcome back</h2>
          <p className="text-sm text-muted-foreground mb-8">Sign in to your account to continue</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email or Username</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <div className="relative mt-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!email || !password || loading}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-3 text-right">
            <button
              type="button"
              onClick={() => { setShowForgot(true); setResetSent(false); setResetEmail(email.includes("@") ? email : ""); }}
              className="text-xs text-primary hover:underline"
            >
              Forgot your password?
            </button>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary font-medium hover:underline">
              Create account
            </Link>
          </p>

 //         <div className="mt-8 p-3 rounded-lg bg-muted/50 border border-border">
//            <p className="text-[10px] text-muted-foreground text-center">
//              Demo: username <code className="text-primary font-mono">admin</code> / password <code className="text-primary font-mono">admin12345</code>
 //           </p>
 //         </div>
 //       </div>
 //     </div>

      {/* Forgot password modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowForgot(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Reset your password</h3>
              <button onClick={() => setShowForgot(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            {resetSent ? (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-success/10 text-success text-sm">
                  We've sent a password reset link to <strong>{resetEmail}</strong>. Check your inbox (and spam folder) and click the link to set a new password.
                </div>
                <button onClick={() => setShowForgot(false)} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  Back to sign in
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendReset} className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Enter the email associated with your account. We'll email you a secure link to choose a new password.
                </p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-9"
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Note: staff accounts created with a username only (no email) cannot self-reset. Ask an admin to reset your password.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowForgot(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-muted">
                    <ArrowLeft className="w-4 h-4 inline mr-1" /> Back
                  </button>
                  <button type="submit" disabled={resetSending} className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                    {resetSending ? "Sending..." : "Send reset link"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
