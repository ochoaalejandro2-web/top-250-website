import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { listProducts, placeOrder, quoteShipping } from "@/lib/shop/server";
import { useCart } from "@/lib/shop/cart";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Carrier } from "@/lib/shop/shipping";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function CheckoutPage() {
  const { user, isPending } = useCurrentUserState();
  if (isPending) return <main className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Loading…</main>;
  if (!user) return <Navigate to="/login" search={{ as: "customer", next: "/checkout" }} />;
  return <CheckoutForm />;
}

function CheckoutForm() {
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
      toast.success(`Order #${res.orderId} placed`);
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
        Cart is empty.{" "}
        <Link to="/" className="text-primary">
          Shop
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-2">
      <form className="space-y-4" onSubmit={submit}>
        <h1 className="text-3xl">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          Ships from Phoenix via USPS or UPS.{" "}
          <Link to="/contact" className="text-primary">
            Questions first? Contact us
          </Link>
          .
        </p>
        <Field label="Full name" value={name} onChange={setName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Phone" value={phone} onChange={setPhone} />
        <Field label="Street address" value={address} onChange={setAddress} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="City" value={city} onChange={setCity} />
          <Field label="State" value={state} onChange={setState} />
        </div>
        <Field label="ZIP" value={zip} onChange={setZip} />
        <div className="space-y-1">
          <Label>Carrier</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["USPS", "UPS"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setMethod(c)}
                className={`rounded-xl border px-3 py-3 text-left text-sm ${
                  method === c ? "border-primary bg-primary/10" : "border-border bg-card"
                }`}
              >
                <strong>{c}</strong>
                <p className="text-muted-foreground">
                  {quote.data ? money(quote.data[c]) : zip.length >= 5 ? "…" : "Enter ZIP"}
                </p>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={!canSubmit || busy}>
          Place order · {money(total)}
        </Button>
      </form>
      <aside className="rounded-2xl border border-border bg-card p-5 h-fit">
        <h2 className="text-lg">Order</h2>
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
        <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>{method}</span>
            <span>{quote.data ? money(ship) : "—"}</span>
          </div>
          <div className="flex justify-between text-base font-medium">
            <span>Total</span>
            <span>{money(total)}</span>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={label !== "Phone"} />
    </div>
  );
}
