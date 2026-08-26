import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/shipping")({ component: ShippingPage });

function ShippingPage() {
  const { t } = useI18n();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t("shipping.kicker")}</p>
      <h1 className="mt-2 text-4xl">{t("shipping.title")}</h1>
      <p className="mt-4 max-w-2xl text-muted-foreground">{t("shipping.lead")}</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <article className="neon-panel rounded-2xl p-6">
          <Truck className="size-5 text-primary" />
          <h2 className="mt-3 text-xl">{t("shipping.uspsTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("shipping.uspsBody")}</p>
        </article>
        <article className="neon-panel-red rounded-2xl p-6">
          <Truck className="size-5 text-destructive" />
          <h2 className="mt-3 text-xl">{t("shipping.upsTitle")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("shipping.upsBody")}</p>
        </article>
      </div>
      <Button className="mt-8" asChild>
        <Link to="/">{t("shipping.cta")}</Link>
      </Button>
    </main>
  );
}
