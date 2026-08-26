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
              #{o.id} · {o.customerName}
            </strong>
            <Badge>{o.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {o.email} · {o.address}, {o.city}, {o.state} {o.zip}
          </p>
          <p className="text-sm">
            {o.shippingMethod} {money(o.shippingCents)} · total {money(o.totalCents)}
          </p>
          <ul className="mt-2 text-sm text-muted-foreground">
            {o.items.map((it) => (
              <li key={it.productId}>
                {it.name} × {it.qty}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {["pending", "packed", "shipped", "cancelled"].map((s) => (
              <Button key={s} size="sm" variant="outline" onClick={() => void setStatus(o.id, s)}>
                {s}
              </Button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function ProductsPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-products"], queryFn: () => adminListProducts() });
  const [editing, setEditing] = useState<Product | null>(null);

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        {(q.data ?? []).map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setEditing(p)}
            className="flex w-full gap-3 rounded-2xl border border-border bg-card p-3 text-left"
          >
            <img src={p.imageUrl} alt="" className="h-16 w-20 rounded-lg object-cover" />
            <span>
              <strong>{p.name}</strong>
              <span className="block text-sm text-muted-foreground">
                {money(p.priceCents)} · stock {p.stock} {p.active ? "" : "· hidden"}
              </span>
            </span>
          </button>
        ))}
        <Button
          variant="outline"
          onClick={() =>
            setEditing({
              id: "",
              name: "",
              fullName: "",
              tag: "",
              description: "",
              priceCents: 0,
              weightLb: 0.5,
              imageUrl: "/products/mouse.jpg",
              stock: 10,
              active: true,
              sortOrder: 99,
            })
          }
        >
          New product
        </Button>
      </div>
      {editing && (
        <ProductForm
          product={editing}
          onSaved={async () => {
            setEditing(null);
            await qc.invalidateQueries({ queryKey: ["admin-products"] });
            await qc.invalidateQueries({ queryKey: ["products"] });
          }}
        />
      )}
    </div>
  );
}

function MessagesPanel() {
  const q = useQuery({ queryKey: ["admin-messages"], queryFn: () => listContactMessages() });
  if (q.isLoading) return <p className="mt-6 text-muted-foreground">Loading messages…</p>;
  if (!(q.data ?? []).length) return <p className="mt-6 text-muted-foreground">No contact messages yet.</p>;

  return (
    <div className="mt-6 space-y-4">
      {(q.data ?? []).map((m) => (
        <article key={m.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{m.name}</strong>
            <Badge>{m.topic}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {m.email}
            {m.phone ? ` · ${m.phone}` : ""}
          </p>
          <p className="mt-3 text-sm whitespace-pre-wrap">{m.message}</p>
        </article>
      ))}
    </div>
  );
}

function SettingsPanel() {
  const q = useQuery({ queryKey: ["store-settings"], queryFn: () => getStoreSettings() });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const current = q.data?.adminCode ?? "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveStoreSettings({ data: { adminCode: code || current } });
      toast.success("Access code saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-6 max-w-md space-y-3 rounded-2xl border border-border bg-card p-5" onSubmit={save}>
      <h2 className="text-lg">Store access code</h2>
      <p className="text-sm text-muted-foreground">
        Share this only with someone who should manage {BRAND}. Default is TOP-250.
      </p>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={current || "TOP-250"}
      />
      <Button type="submit" disabled={busy}>
        Save code
      </Button>
    </form>
  );
}

function ProductForm({ product, onSaved }: { product: Product; onSaved: () => Promise<void> }) {
  const [p, setP] = useState(product);
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveProduct({
        data: {
          id: p.id,
          name: p.name,
          fullName: p.fullName,
          tag: p.tag,
          description: p.description,
          priceCents: p.priceCents,
          weightLb: p.weightLb,
          imageUrl: p.imageUrl,
          stock: p.stock,
          active: p.active,
        },
      });
      toast.success("Product saved");
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1_500_000) {
      toast.error("Image is too large. Please use a picture under 1.5 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setP({ ...p, imageUrl: reader.result as string });
      toast.success("Image loaded");
    };
    reader.readAsDataURL(file);
  }

  return (
    <form className="space-y-3 rounded-2xl border border-border bg-card p-4" onSubmit={save}>
      <div className="space-y-1">
        <Label>Id (slug)</Label>
        <Input value={p.id} onChange={(e) => setP({ ...p, id: e.target.value })} required />
      </div>
      <div className="space-y-1">
        <Label>Name</Label>
        <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required />
      </div>
      <div className="space-y-1">
        <Label>Full name</Label>
        <Input value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} required />
      </div>
      <div className="space-y-1">
        <Label>Tag</Label>
        <Input value={p.tag} onChange={(e) => setP({ ...p, tag: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Price (cents)</Label>
          <Input
            type="number"
            value={p.priceCents}
            onChange={(e) => setP({ ...p, priceCents: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1">
          <Label>Stock</Label>
          <Input type="number" value={p.stock} onChange={(e) => setP({ ...p, stock: Number(e.target.value) })} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>Weight (lb)</Label>
        <Input
          type="number"
          step="0.01"
          value={p.weightLb}
          onChange={(e) => setP({ ...p, weightLb: Number(e.target.value) })}
        />
      </div>

      <div className="space-y-2">
        <Label>Product Image</Label>
        {p.imageUrl && (
          <img
            src={p.imageUrl}
            alt="Preview"
            className="h-32 w-full rounded-lg object-cover border border-border"
          />
        )}
        <Input type="file" accept="image/*" onChange={handleImageUpload} />
        <p className="text-xs text-muted-foreground">Or paste an image URL below</p>
        <Input
          value={p.imageUrl.startsWith("data:") ? "" : p.imageUrl}
          onChange={(e) => setP({ ...p, imageUrl: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} />
        Visible in shop
      </label>
      <Button type="submit" disabled={busy}>
        Save product
      </Button>
    </form>
  );
}