import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, User } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { becomeStoreAdmin } from "@/lib/shop/server";
import { BRAND } from "@/lib/shop/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

type Role = "customer" | "admin";

type LoginSearch = {
  as: Role;
  next?: string;
};

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => {
    const as: Role = s.as === "admin" ? "admin" : "customer";
    const next = typeof s.next === "string" ? s.next : undefined;
    return next ? { as, next } : { as };
  },
  component: Login,
});

function Login() {
  const { as: initialRole, next } = Route.useSearch();
  const [role, setRole] = useState<Role>(initialRole);
  const [mode, setMode] = useState<"in" | "up">("up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dest = role === "admin" ? next || "/admin" : next || "/account";

  async function afterAuth() {
    if (role === "admin") {
      try {
        await becomeStoreAdmin({ data: { code: adminCode } });
      } catch (err) {
        if (adminCode.trim()) {
          throw err;
        }
      }
    }
    window.location.href = dest;
  }

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({ email, password, name });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message);
      }
      await afterAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-[80vh] max-w-lg place-items-center px-4 py-12">
      <Card className="w-full p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{BRAND}</p>
        <h1 className="mt-2 text-2xl">{role === "admin" ? "Administrator login" : "Customer login"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "admin"
            ? "Manage products and orders. The first admin account owns the store. Later, use the store access code."
            : "Create a profile with any email so you can checkout and see your orders."}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm ${
              role === "customer" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
            }`}
          >
            <User className="size-4" />
            Customer
          </button>
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm ${
              role === "admin" ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground"
            }`}
          >
            <Shield className="size-4" />
            Administrator
          </button>
        </div>

        {authEnabled ? (
          <div className="mt-6 space-y-3">
            {GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: dest })}
              >
                Continue with {p.label}
              </Button>
            ))}
            <div className="relative py-2 text-center text-xs text-muted-foreground">or email</div>
            <form className="space-y-3" onSubmit={onEmail}>
              {mode === "up" && (
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "up" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
              </div>
              {role === "admin" && (
                <div className="space-y-1">
                  <Label htmlFor="admin-code">Store access code (if the shop already has an owner)</Label>
                  <Input
                    id="admin-code"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="TOP-250"
                  />
                </div>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "up"
                  ? role === "admin"
                    ? "Create admin account"
                    : "Create customer account"
                  : role === "admin"
                    ? "Sign in as admin"
                    : "Sign in as customer"}
              </Button>
            </form>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground underline"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">Sign-in is disabled.</p>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Back to shop
          </Link>
        </p>
      </Card>
    </main>
  );
}
