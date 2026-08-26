import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { listProducts, placeOrder, quoteShipping } from "@/lib/shop/server";
import { useCart } from "@/lib/shop/cart";
import { money } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Carrier } from "@/lib/shop/shipping";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const { t } = useI18n();
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <main className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">{t("common.loading")}</main>;
  if (!user) return <Navigate to="/login" search={{ as: "customer", next: "/checkout" }} />;
  return <CheckoutForm />;
}

function CheckoutForm() {
  const { t } = useI18n();
  const user = useCurrentUser();
  const nav = useNavigate();
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const products = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const byId = new Map((products.data ?? []).map((p) => [p.id, p]));
  const rows = lines
    .map((l) => {
      const p = byId.get(l.productId);
      return p ? { ...l, product: p } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  const [name, setName] = useState(user?.displayName ?? "");
  const [email, setEmail] = useState(user?.primaryEmail ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("AZ");
  const [zip, setZip] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<Carrier>("USPS");
  const [busy, setBusy] = useState(false);

  const weight = rows.reduce((n, r) => n + r.product.weightLb * r.qty, 0);
  const subtotal = rows.reduce((n, r) => n + r.product.priceCents * r.qty, 0);
  const quote = useQuery({
    queryKey: ["ship", zip, weight],
    queryFn: () => quoteShipping({ data: { zip, weightLb: weight } }),
    enabled: zip.replace(/\D/g, "").length >= 5 && weight > 0,
  });
  const ship = quote.data?.[method] ?? 0;
  const total = subtotal + ship;

  const empty = rows.length === 0;
  const canSubmit = useMemo(
    () => name && email && address && city && state && zip.replace(/\D/g, "").length >= 5 && !empty,
    [name, email, address, city, state, zip, empty],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await placeOrder({
        data: {
          name,
          email,
          phone,
          address,
          city,
          state,
          zip,
          shippingMethod: method,
          notes,
          items: rows.map((r) => ({ productId: r.productId, qty: r.qty })),
        },
      });
      clear();
      toast.success(t("toast.order", { id: res.orderId }));
      await nav({ to: "/account" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not place order");
    } finally {
      setBusy(false);
    }
  }

  if (empty) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        {t("checkout.empty")}{" "}
        <Link to="/" className="text-primary">
          {t("checkout.shop")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-2">
      <form className="space-y-4" onSubmit={submit}>
        <h1 className="text-3xl">{t("checkout.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("checkout.lead")}{" "}
          <Link to="/contact" className="text-primary">
            {t("checkout.questions")}
          </Link>
          .
        </p>
        <Field label={t("checkout.fullName")} value={name} onChange={setName} />
        <Field label={t("checkout.email")} type="email" value={email} onChange={setEmail} />
        <Field label={t("checkout.phone")} value={phone} onChange={setPhone} optional />
        <Field label={t("checkout.address")} value={address} onChange={setAddress} />
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("checkout.city")} value={city} onChange={setCity} />
          <Field label={t("checkout.state")} value={state} onChange={setState} />
        </div>
        <Field label={t("checkout.zip")} value={zip} onChange={setZip} />
        <div className="space-y-1">
          <Label>{t("checkout.carrier")}</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["USPS", "UPS"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setMethod(c)}
                className={`rounded-xl border px-3 py-3 text-left text-sm ${
                  method === c ? "border-primary bg-primary/10 neon-glow" : "border-white/15 bg-black"
                }`}
              >
                <strong>{c}</strong>
                <p className="text-muted-foreground">
                  {quote.data ? money(quote.data[c]) : zip.length >= 5 ? "…" : t("checkout.enterZip")}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="notes">{t("checkout.notes")}</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={!canSubmit || busy}>
          {t("checkout.place", { total: money(total) })}
        </Button>
      </form>
      <aside className="h-fit neon-panel rounded-2xl p-5">
        <h2 className="text-lg">{t("checkout.order")}</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {rows.map((r) => (
            <li key={r.productId} className="flex justify-between gap-3">
              <span>
                {r.product.name} × {r.qty}
              </span>
              <span>{money(r.product.priceCents * r.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1 border-t border-white/10 pt-4 text-sm">
          <div className="flex justify-between">
            <span>{t("checkout.subtotal")}</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>{method}</span>
            <span>{quote.data ? money(ship) : "—"}</span>
          </div>
          <div className="flex justify-between text-base font-medium">
            <span>{t("checkout.total")}</span>
            <span className="neon-text">{money(total)}</span>
          </div>
        </div>
      </aside>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  optional,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  optional?: boolean;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={!optional} />
    </div>
  );
}
