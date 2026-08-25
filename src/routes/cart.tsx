import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/shop/server";
import { useCart } from "@/lib/shop/cart";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { user } = useCurrentUserState();
  const lines = useCart((s) => s.lines);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const products = useQuery({ queryKey: ["products"], queryFn: () => listProducts() });
  const byId = new Map((products.data ?? []).map((p) => [p.id, p]));
  const rows = lines
    .map((l) => {
      const p = byId.get(l.productId);
      return p ? { ...l, product: p } : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const subtotal = rows.reduce((n, r) => n + r.product.priceCents * r.qty, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl">Cart</h1>
      {rows.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          Empty.{" "}
          <Link to="/" className="text-primary">
            Shop the lineup
          </Link>
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => (
            <div key={r.productId} className="flex gap-4 rounded-2xl border border-border bg-card p-3">
              <img src={r.product.imageUrl} alt="" className="h-20 w-28 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.product.name}</p>
                <p className="text-sm text-muted-foreground">{money(r.product.priceCents)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={r.qty}
                    onChange={(e) => setQty(r.productId, Number(e.target.value))}
                  />
                  <button type="button" className="text-sm text-muted-foreground" onClick={() => remove(r.productId)}>
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <span>Subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <p className="text-sm text-muted-foreground">USPS / UPS calculated from your ZIP on the next step.</p>
          {user ? (
            <Button asChild className="w-full">
              <Link to="/checkout">Checkout</Link>
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link to="/login" search={{ as: "customer", next: "/checkout" }}>
                Customer login to checkout
              </Link>
            </Button>
          )}
          <p className="text-center text-sm">
            <Link to="/contact" className="text-muted-foreground hover:text-foreground">
              Questions before you buy? Contact us
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
