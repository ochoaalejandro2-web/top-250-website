import { Link } from "@tanstack/react-router";
import { useCart } from "@/lib/shop/cart";
import { isCustomProductPhoto, splitTags } from "@/lib/shop/catalog";
import type { Product } from "@/lib/shop/server";
import { money } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale";
import { ProductArt } from "@/components/product-art";
import { toast } from "sonner";

export function ProductCard({ product: p }: { product: Product }) {
  const add = useCart((s) => s.add);
  const { t } = useI18n();
  const tags = splitTags(p.tag);
  const customPhoto = isCustomProductPhoto(p.imageUrl);

  return (
    <article className="flex flex-col overflow-hidden neon-panel">
      <Link to="/product/$id" params={{ id: p.id }} className="block aspect-[16/11] overflow-hidden bg-black">
        {customPhoto ? (
          <img src={p.imageUrl} alt={p.fullName} className="h-full w-full object-cover" />
        ) : (
          <ProductArt id={p.id} name={p.name} className="h-full w-full" />
        )}
      </Link>
      <div className="h-px bg-destructive" />
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-extrabold text-white">{p.name}</h3>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag, i) => (
              <span
                key={tag}
                className={
                  i % 2 === 0
                    ? "rounded-full border border-primary/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary"
                    : "rounded-full border border-destructive/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-destructive"
                }
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{p.description}</p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xl font-extrabold neon-text">{money(p.priceCents)}</span>
          <button
            type="button"
            className="grid h-12 w-12 place-items-center rounded-full bg-primary text-[11px] font-black text-black neon-glow"
            onClick={() => {
              add(p.id);
              toast.success(t("toast.added", { name: p.name }));
            }}
          >
            {t("card.buy")}
          </button>
        </div>
      </div>
    </article>
  );
}
