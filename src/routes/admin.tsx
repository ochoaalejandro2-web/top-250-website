import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { signOut } from "@/lib/auth/client";
import {
  adminListProducts,
  becomeStoreAdmin,
  getMe,
  getStoreSettings,
  listAllOrders,
  listContactMessages,
  removeProduct,
  saveProduct,
  saveStoreSettings,
  updateOrderStatus,
  uploadProductPhoto,
  type Product,
} from "@/lib/shop/server";
import { money } from "@/lib/utils";
import { isCustomProductPhoto, slugFromName } from "@/lib/shop/catalog";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ProductArt } from "@/components/product-art";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { t } = useI18n();
  const { user, isPending } = useCurrentUserState();
  const me = useQuery({ queryKey: ["me", user?.id], queryFn: () => getMe(), enabled: Boolean(user) });
  const [tab, setTab] = useState<"products" | "orders" | "messages" | "settings">("products");

  if (isPending || (user && me.isLoading)) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-muted-foreground">{t("common.loading")}</main>;
  }
  if (!user) return <Navigate to="/login" search={{ as: "admin", next: "/admin" }} />;
  if (!me.data?.is_admin) {
    return <ClaimAdmin />;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t("admin.kicker")}</p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-4xl">{t("admin.title")}</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void signOut();
          }}
        >
          {t("nav.logout")}
        </Button>
      </div>
      <p className="mt-4 max-w-2xl rounded-xl neon-panel-red px-4 py-3 text-sm text-white/80">{t("admin.liveNote")}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["products", t("admin.tab.catalog")],
            ["orders", t("admin.tab.orders")],
            ["messages", t("admin.tab.messages")],
            ["settings", t("admin.tab.settings")],
          ] as const
        ).map(([id, label]) => (
          <Button key={id} variant={tab === id ? "default" : "outline"} onClick={() => setTab(id)}>
            {label}
          </Button>
        ))}
      </div>
      {tab === "products" && <ProductsPanel />}
      {tab === "orders" && <OrdersPanel />}
      {tab === "messages" && <MessagesPanel />}
      {tab === "settings" && <SettingsPanel />}
    </main>
  );
}

function ClaimAdmin() {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();

  async function claim(withCode: boolean) {
    setBusy(true);
    try {
      await becomeStoreAdmin({ data: { code: withCode ? code : "" } });
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(t("toast.admin"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not claim admin");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="text-2xl">{t("admin.claimTitle")}</h1>
      <p className="mt-3 text-muted-foreground">{t("admin.claimLead")}</p>
      <div className="mt-6 space-y-3">
        <Button className="w-full" disabled={busy} onClick={() => void claim(false)}>
          {t("admin.claimFirst")}
        </Button>
        <div className="space-y-1">
          <Label htmlFor="code">{t("admin.code")}</Label>
          <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="TOP-250" />
        </div>
        <Button variant="outline" className="w-full" disabled={busy || !code} onClick={() => void claim(true)}>
          {t("admin.unlock")}
        </Button>
        <p className="text-sm">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            {t("admin.back")}
          </Link>
        </p>
      </div>
    </main>
  );
}

function OrdersPanel() {
  const { t } = useI18n();
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

  if (q.isLoading) return <p className="mt-6 text-muted-foreground">{t("common.loading")}</p>;
  if (!(q.data ?? []).length) return <p className="mt-6 text-muted-foreground">{t("admin.noOrders")}</p>;

  return (
    <div className="mt-6 space-y-4">
      {(q.data ?? []).map((o) => (
        <article key={o.id} className="neon-panel rounded-2xl p-4">
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
            {o.shippingMethod} {money(o.shippingCents)} · {money(o.totalCents)}
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

function emptyProduct(): Product {
  return {
    id: "",
    name: "",
    fullName: "",
    tag: "",
    description: "",
    priceCents: 0,
    weightLb: 0.5,
    imageUrl: "",
    stock: 10,
    active: true,
    sortOrder: 99,
  };
}

function ProductsPanel() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-products"], queryFn: () => adminListProducts() });
  const [editing, setEditing] = useState<Product>(emptyProduct());

  async function onSaved() {
    await qc.invalidateQueries({ queryKey: ["admin-products"] });
    await qc.invalidateQueries({ queryKey: ["products"] });
    setEditing(emptyProduct());
  }

  async function onRemove(id: string) {
    try {
      await removeProduct({ data: id });
      toast.success(t("toast.removed"));
      if (editing.id === id) setEditing(emptyProduct());
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["products"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Remove failed");
    }
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">{t("admin.addTitle")}</h2>
        <ProductForm product={editing} onSaved={onSaved} />
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-primary">{t("admin.existing")}</h2>
        <div className="space-y-3">
          {(q.data ?? []).map((p) => (
            <article key={p.id} className="flex gap-3 neon-panel-red rounded-2xl p-3">
              {isCustomProductPhoto(p.imageUrl) ? (
                <img src={p.imageUrl} alt="" className="h-16 w-20 rounded-lg object-cover" />
              ) : (
                <ProductArt id={p.id} name={p.name} className="h-16 w-20 rounded-lg" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-white">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {money(p.priceCents)}
                  {p.active ? "" : ` · ${t("admin.hidden")}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p)}>
                    {t("admin.edit")}
                  </Button>
                  <Button size="sm" variant="neonRed" onClick={() => void onRemove(p.id)}>
                    {t("admin.remove")}
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessagesPanel() {
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["admin-messages"], queryFn: () => listContactMessages() });
  if (q.isLoading) return <p className="mt-6 text-muted-foreground">{t("common.loading")}</p>;
  if (!(q.data ?? []).length) return <p className="mt-6 text-muted-foreground">{t("admin.noMessages")}</p>;

  return (
    <div className="mt-6 space-y-4">
      {(q.data ?? []).map((m) => (
        <article key={m.id} className="neon-panel rounded-2xl p-4">
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
  const { t } = useI18n();
  const q = useQuery({ queryKey: ["store-settings"], queryFn: () => getStoreSettings() });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const current = q.data?.adminCode ?? "";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await saveStoreSettings({ data: { adminCode: code || current } });
      toast.success(t("toast.code"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-6 max-w-md space-y-3 neon-panel rounded-2xl p-5" onSubmit={save}>
      <h2 className="text-lg">{t("admin.code")}</h2>
      <p className="text-sm text-muted-foreground">{t("admin.settingsLead")}</p>
      <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={current || "TOP-250"} />
      <Button type="submit" disabled={busy}>
        {t("admin.saveCode")}
      </Button>
    </form>
  );
}

function ProductForm({ product, onSaved }: { product: Product; onSaved: () => Promise<void> }) {
  const { t } = useI18n();
  const [p, setP] = useState(product);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setP(product);
  }, [product]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const id = p.id.trim() || slugFromName(p.name);
      await saveProduct({
        data: {
          id,
          name: p.name,
          fullName: p.fullName || p.name,
          tag: p.tag,
          description: p.description,
          priceCents: p.priceCents,
          weightLb: p.weightLb,
          imageUrl: p.imageUrl,
          stock: p.stock,
          active: p.active,
        },
      });
      toast.success(t("toast.product"));
      await onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 6_000_000) {
      toast.error("Image is too large. Please use a picture under 6 MB.");
      return;
    }
    setUploading(true);
    try {
      const dataBase64 = await readFileAsBase64(file);
      const res = await uploadProductPhoto({
        data: { filename: file.name, contentType: file.type || "image/jpeg", dataBase64 },
      });
      setP((cur) => ({ ...cur, imageUrl: res.url }));
      toast.success(t("toast.photo"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form className="space-y-3 neon-panel rounded-2xl p-4" onSubmit={save}>
      <div className="space-y-1">
        <Label>{t("admin.name")}</Label>
        <Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} required />
      </div>
      <div className="space-y-1">
        <Label>{t("admin.price")}</Label>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={(p.priceCents / 100).toFixed(2)}
          onChange={(e) => setP({ ...p, priceCents: Math.round(Number(e.target.value) * 100) })}
        />
      </div>
      <div className="space-y-1">
        <Label>{t("admin.description")}</Label>
        <Textarea value={p.description} onChange={(e) => setP({ ...p, description: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>{t("admin.tags")}</Label>
        <Input
          value={p.tag}
          onChange={(e) => setP({ ...p, tag: e.target.value })}
          placeholder={t("admin.tagsPh")}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("admin.photo")}</Label>
        {p.imageUrl ? (
          isCustomProductPhoto(p.imageUrl) ? (
            <img src={p.imageUrl} alt="" className="h-32 w-full rounded-lg object-cover border border-white/10" />
          ) : (
            <ProductArt id={p.id || "new"} name={p.name} className="h-32 w-full rounded-lg" />
          )
        ) : (
          <div className="grid h-32 place-items-center rounded-lg border border-dashed border-white/20 text-xs text-muted-foreground">
            {uploading ? t("admin.uploading") : t("admin.photo")}
          </div>
        )}
        <Input type="file" accept="image/*" onChange={(e) => void handleImageUpload(e)} />
        <p className="text-xs text-muted-foreground">{t("admin.photoHint")}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{t("admin.slug")}</Label>
          <Input value={p.id} onChange={(e) => setP({ ...p, id: e.target.value })} placeholder={slugFromName(p.name)} />
        </div>
        <div className="space-y-1">
          <Label>{t("admin.stock")}</Label>
          <Input type="number" value={p.stock} onChange={(e) => setP({ ...p, stock: Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>{t("admin.fullName")}</Label>
          <Input value={p.fullName} onChange={(e) => setP({ ...p, fullName: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>{t("admin.weight")}</Label>
          <Input
            type="number"
            step="0.01"
            value={p.weightLb}
            onChange={(e) => setP({ ...p, weightLb: Number(e.target.value) })}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={p.active} onChange={(e) => setP({ ...p, active: e.target.checked })} />
        {t("admin.visible")}
      </label>
      <Button type="submit" disabled={busy || uploading}>
        {busy ? t("admin.saving") : t("admin.save")}
      </Button>
    </form>
  );
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
