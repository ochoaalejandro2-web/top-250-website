import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listProducts } from "@/lib/shop/server";
import { useCart } from "@/lib/shop/cart";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { money } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductArt } from "@/components/product-art";
import { isCustomProductPhoto } from "@/lib/shop/catalog";

export const Route = createFileRoute("/cart")({ component: CartPage });

function CartPage() {
  const { t } = useI18n();
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
      <h1 className="text-3xl">{t("cart.title")}</h1>
      {rows.length === 0 ? (
        <p className="mt-6 text-muted-foreground">
          {t("cart.empty")}{" "}
          <Link to="/" className="text-primary">
            {t("cart.shop")}
          </Link>
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((r) => (
            <div key={r.productId} className="flex gap-4 neon-panel rounded-2xl p-3">
              {isCustomProductPhoto(r.product.imageUrl) ? (
                <img src={r.product.imageUrl} alt="" className="h-20 w-28 rounded-lg object-cover" />
              ) : (
                <ProductArt id={r.product.id} name={r.product.name} className="h-20 w-28 rounded-lg" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{r.product.name}</p>
                <p className="text-sm text-primary">{money(r.product.priceCents)}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="w-20"
                    value={r.qty}
                    onChange={(e) => setQty(r.productId, Number(e.target.value))}
                  />
                  <button type="button" className="text-sm text-destructive" onClick={() => remove(r.productId)}>
                    {t("cart.remove")}
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <span>{t("cart.subtotal")}</span>
            <strong className="neon-text">{money(subtotal)}</strong>
          </div>
          <p className="text-sm text-muted-foreground">{t("cart.shipHint")}</p>
          {user ? (
            <Button asChild className="w-full">
              <Link to="/checkout">{t("cart.checkout")}</Link>
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link to="/login" search={{ as: "customer", next: "/checkout" }}>
                {t("cart.loginCheckout")}
              </Link>
            </Button>
          )}
          <p className="text-center text-sm">
            <Link to="/contact" className="text-muted-foreground hover:text-foreground">
              {t("cart.questions")}
            </Link>
          </p>
        </div>
      )}
    </main>
  );
}
