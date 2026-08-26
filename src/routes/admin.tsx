import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  adminListProducts,
  becomeStoreAdmin,
  getMe,
  getStoreSettings,
  listAllOrders,
  listContactMessages,
  saveProduct,
  saveStoreSettings,
  updateOrderStatus,
  type Product,
} from "@/lib/shop/server";
import { BRAND } from "@/lib/shop/brand";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isPending } = useCurrentUserState();
  const me = useQuery({ queryKey: ["me", user?.id], queryFn: () => getMe(), enabled: Boolean(user) });
  const [tab, setTab] = useState<"orders" | "products" | "messages" | "settings">("orders");

  if (isPending || (user && me.isLoading)) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-muted-foreground">Loading…</main>;
  }
  if (!user) return <Navigate to="/login" search={{ as: "admin", next: "/admin" }} />;
  if (!me.data?.is_admin) {
    return <ClaimAdmin />;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {BRAND} — catalog, orders, contact messages, USPS / UPS.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["orders", "Orders"],
            ["products", "Products"],
            ["messages", "Messages"],
            ["settings", "Settings"],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} variant={tab === id ? "default" : "outline"} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>
      {tab === "orders" && <OrdersPanel />}
      {tab === "products" && <ProductsPanel />}
      {tab === "messages" && <MessagesPanel />}
      {tab === "settings" && <SettingsPanel />}
    </main>
  );
}

function ClaimAdmin() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function claim(withCode: boolean) {
    setBusy(true);
    try {
      await becomeStoreAdmin({ data: { code: withCode ? code : "" } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Admin access granted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim admin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl">Store administrator</h1>
      <p className="mt-3 text-muted-foreground">
        This account is a customer profile. If nobody owns {BRAND} yet, claim it. If it already has an owner,
        enter the store access code (default TOP-250 until changed).
      </p>
      <div className="mt-6 space-y-3">
        <Button className="w-full" disabled={busy} onClick={() => void claim(false)}>
          Claim store (first admin)
        </Button>
        <div className="space-y-1">
          <Label htmlFor="code">Store access code</Label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="TOP-250" />
        </div>
        <Button variant="outline" className="w-full" disabled={busy || !code} onClick={() => void claim(true)}>
          Unlock with code
        </Button>
        <p className="text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            Back to shop
          </Link>
        </p>
      </div>
    </main>
  );
}

function OrdersPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-orders"], queryFn: () => listAllOrders() });

  async function setStatus(id: number, status: string) {
    try {
      await updateOrderStatus({ data: { id, status } });
      await qc.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success(`Order #${id} → ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  if (q.isLoading) return <p className="mt-6 text-muted-foreground">Loading orders…</p>;
  if (!(q.data ?? []).length) return <p className="mt-6 text-muted-foreground">No orders yet.</p>;

  return (
    <div className="mt-6 space-y-4">
      {(q.data ?? []).map((o) => (
        <article key={o.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>
