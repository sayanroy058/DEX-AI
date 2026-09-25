import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Lock, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { partnerLogin } from "@/lib/partnerApi";
import { isPartnerAuthenticated } from "@/lib/partnerAuth";

export default function PartnerLogin() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Partner Login | BitDx";
  }, []);

  if (isPartnerAuthenticated()) {
    return <Navigate to="/partner/profit" replace />;
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (!loginId.trim() || !password) {
      setError("Login ID and password are required.");
      return;
    }
    setLoading(true);
    try {
      await partnerLogin(loginId, password);
      navigate("/partner/profit", { replace: true });
    } catch {
      setError("Invalid partner credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-md glass rounded-xl border border-primary/25 p-6 sm:p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow-primary">
            <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Partner Login</h1>
            <p className="text-sm text-muted-foreground">View your profit-sharing history</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="loginId">Login ID</Label>
            <Input id="loginId" value={loginId} onChange={(event) => setLoginId(event.target.value)} placeholder="partner1" autoComplete="username" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
          </div>

          {error && (
            <div className="rounded-lg border border-sell/30 bg-sell/10 px-3 py-2 text-sm text-sell">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90" disabled={loading}>
            {loading ? <Lock className="h-4 w-4 mr-2 animate-pulse" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
