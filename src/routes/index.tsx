import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ArrowRight, House, Package } from "lucide-react";
import { listProducts } from "@/lib/shop/server";
import { openShopChat } from "@/lib/shop/brand";
import { money } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product-card";
import { ProductArt } from "@/components/product-art";
import { isCustomProductPhoto } from "@/lib/shop/catalog";
import { ContactForm } from "@/components/contact-form";

export const Route = createFileRoute("/")({
  loader: async () => ({ products: await listProducts() }),
  staleTime: 0,
  shouldReload: true,
  component: Home,
});

function Home() {
  const initial = Route.useLoaderData();
  const listing = useQuery({
    queryKey: ["products"],
    queryFn: () => listProducts(),
    initialData: initial.products,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const products = listing.data ?? initial.products;
  const { t } = useI18n();
  const count = products.length;
  const preview = products.slice(0, 4);

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t("hero.kicker")}</p>
            <h1 className="mt-4 text-4xl leading-[0.95] sm:text-6xl">
              <span className="block text-white">{t("hero.title1")}</span>
              <span className="mt-1 block neon-text">{t("hero.title2")}</span>
            </h1>
            <p className="mt-5 max-w-md text-white/80">{t("hero.sub")}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild>
                <a href="#lineup">{t("hero.shop")}</a>
              </Button>
              <Button variant="neonRed" asChild>
                <Link to="/contact">{t("hero.ask")}</Link>
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 rounded-3xl bg-primary/20 blur-3xl" />
            <div className="relative neon-panel rounded-2xl p-4">
              <div className="grid grid-cols-2 gap-3">
                {preview.map((p) => (
                  <Link
                    key={p.id}
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="rounded-xl border border-white/10 bg-black/60 p-3"
                  >
                    {isCustomProductPhoto(p.imageUrl) ? (
                      <img src={p.imageUrl} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
                    ) : (
                      <ProductArt id={p.id} name={p.name} className="aspect-[4/3] w-full rounded-lg" />
                    )}
                    <p className="mt-2 text-sm font-semibold text-white">{p.name}</p>
                    <p className="text-sm text-white/80">{money(p.priceCents)}</p>
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{t("preview.footerLeft", { count })}</span>
                <span className="text-primary">{t("preview.footerRight")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/10">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:grid-cols-3">
          <Feature icon={<Package className="size-5 text-primary" />} title={t("features.shipTitle")} body={t("features.shipBody")} />
          <Feature
            icon={<House className="size-5 text-destructive" />}
            title={t("features.zipTitle")}
            body={t("features.zipBody")}
            divider
          />
          <Feature icon={<ArrowRight className="size-5 text-primary" />} title={t("features.askTitle")} body={t("features.askBody")} />
        </div>
      </section>

      <hr className="neon-divider" />

      <section id="lineup" className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/50">{t("lineup.kicker")}</p>
            <h2 className="mt-2 text-3xl text-white sm:text-4xl">{t("lineup.title", { count })}</h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">{t("lineup.body")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section id="contact" className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t("contact.kicker")}</p>
          <h2 className="mt-2 text-3xl">{t("contact.title")}</h2>
          <p className="mt-3 text-muted-foreground">{t("contact.lead")}</p>
          <Button className="mt-6" type="button" variant="outline" onClick={() => openShopChat()}>
            {t("form.openAssistant")}
          </Button>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
  divider,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  divider?: boolean;
}) {
  return (
    <div className={`flex gap-3 sm:px-2 ${divider ? "sm:border-x sm:border-white/10" : ""}`}>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-white/15 bg-black">
        {icon}
      </span>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
