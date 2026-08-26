import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shield, User } from "lucide-react";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { becomeStoreAdmin } from "@/lib/shop/server";
import { BRAND } from "@/lib/shop/brand";
import { useI18n } from "@/lib/i18n/locale";
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
  const { t } = useI18n();
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
      <Card className="w-full neon-panel p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{BRAND}</p>
        <h1 className="mt-2 text-2xl">{role === "admin" ? t("login.adminTitle") : t("login.customerTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {role === "admin" ? t("login.adminLead") : t("login.customerLead")}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setRole("customer")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm ${
              role === "customer" ? "border-primary bg-primary/10 text-foreground" : "border-white/15 text-muted-foreground"
            }`}
          >
            <User className="size-4" />
            {t("login.customer")}
          </button>
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm ${
              role === "admin" ? "border-destructive bg-destructive/10 text-foreground" : "border-white/15 text-muted-foreground"
            }`}
          >
            <Shield className="size-4" />
            {t("login.admin")}
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
                {t("login.continueWith", { provider: p.label })}
              </Button>
            ))}
            <div className="relative py-2 text-center text-xs text-muted-foreground">{t("login.orEmail")}</div>
            <form className="space-y-3" onSubmit={onEmail}>
              {mode === "up" && (
                <div className="space-y-1">
                  <Label htmlFor="name">{t("login.name")}</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="email">{t("login.email")}</Label>
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
                <Label htmlFor="password">{t("login.password")}</Label>
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
                  <Label htmlFor="admin-code">{t("login.code")}</Label>
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
                    ? t("login.createAdmin")
                    : t("login.createCustomer")
                  : role === "admin"
                    ? t("login.signAdmin")
                    : t("login.signCustomer")}
              </Button>
            </form>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground underline"
              onClick={() => setMode(mode === "up" ? "in" : "up")}
            >
              {mode === "up" ? t("login.haveAccount") : t("login.newHere")}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t("login.disabled")}</p>
        )}
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            {t("login.back")}
          </Link>
        </p>
      </Card>
    </main>
  );
}
