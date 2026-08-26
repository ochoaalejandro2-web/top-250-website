import { createFileRoute, Link } from "@tanstack/react-router";
import { getProduct } from "@/lib/shop/server";
import { useCart } from "@/lib/shop/cart";
import { money } from "@/lib/utils";
import { splitTags, isCustomProductPhoto } from "@/lib/shop/catalog";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { ProductArt } from "@/components/product-art";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => ({ product: await getProduct({ data: params.id }) }),
  component: ProductPage,
});

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const add = useCart((s) => s.add);
  const { t } = useI18n();

  if (!p) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <p>{t("product.notFound")}</p>
        <Link to="/" className="text-primary">
          {t("product.shop")}
        </Link>
      </main>
    );
  }

  const tags = splitTags(p.tag);

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-2">
      {isCustomProductPhoto(p.imageUrl) ? (
        <img src={p.imageUrl} alt={p.fullName} className="aspect-[4/3] w-full rounded-2xl object-cover neon-panel" />
      ) : (
        <ProductArt id={p.id} name={p.fullName} className="aspect-[4/3] w-full rounded-2xl neon-panel" />
      )}
      <div>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span
              key={tag}
              className={
                i % 2 === 0
                  ? "rounded-full border border-primary/70 px-2.5 py-0.5 text-xs font-semibold uppercase text-primary"
                  : "rounded-full border border-destructive/80 px-2.5 py-0.5 text-xs font-semibold uppercase text-destructive"
              }
            >
              {tag}
            </span>
          ))}
        </div>
        <h1 className="mt-3 text-3xl">{p.fullName}</h1>
        <p className="mt-3 text-muted-foreground">{p.description}</p>
        <p className="mt-6 text-3xl neon-text">{money(p.priceCents)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("product.meta", { stock: p.stock, weight: p.weightLb })}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              add(p.id);
              toast.success(t("product.added"));
            }}
          >
            {t("product.add")}
          </Button>
          <Button variant="outline" asChild>
            <Link to="/cart">{t("product.viewCart")}</Link>
          </Button>
          <Button variant="neonRed" asChild>
            <Link to="/contact">{t("product.ask")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
