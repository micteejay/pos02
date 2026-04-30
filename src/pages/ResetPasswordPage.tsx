import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { KeyRound, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash automatically and
    // emits a PASSWORD_RECOVERY event. We just listen + check current session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If hash contains a recovery token, the listener above will fire.
      // If a session already exists, we still allow updating password.
      setHasRecoverySession(!!session || window.location.hash.includes("type=recovery"));
      setChecking(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (err) { setError(err.message || "Could not update password."); return; }
    setDone(true);
    toast.success("Password updated. Signing you in…");
    setTimeout(() => navigate("/"), 1200);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Reset password</span>
        </div>

        {checking ? (
          <div className="text-center text-sm text-muted-foreground">Checking reset link…</div>
        ) : !hasRecoverySession ? (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>This password reset link is invalid or has expired. Please request a new one from the sign-in page.</span>
            </div>
            <Link to="/login" className="block w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center hover:bg-primary/90">
              Back to sign in
            </Link>
          </div>
        ) : done ? (
          <div className="bg-card border border-border rounded-xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-success" />
            </div>
            <p className="text-sm text-foreground">Your password has been updated.</p>
            <p className="text-xs text-muted-foreground">Redirecting…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-6 space-y-4">
            <p className="text-sm text-muted-foreground">Choose a new password for your account.</p>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground">New password</label>
              <div className="relative mt-1">
                <Input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" className="pr-10" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Confirm new password</label>
              <Input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter password" className="mt-1" />
            </div>
            <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitting ? "Updating…" : "Update password"}
            </button>
            <Link to="/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">Back to sign in</Link>
          </form>
        )}
      </div>
    </div>
  );
}