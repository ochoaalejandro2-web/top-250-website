import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { confirmCheckout } from "@/lib/shop/server";
import { useCart } from "@/lib/shop/cart";
import { money } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type SuccessSearch = { session_id: string };

export const Route = createFileRoute("/checkout/success")({
  validateSearch: (s: Record<string, unknown>): SuccessSearch => ({
    session_id: typeof s.session_id === "string" ? s.session_id : "",
  }),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  const { t } = useI18n();
  const { session_id: sessionId } = Route.useSearch();
  const clear = useCart((s) => s.clear);
  const confirmation = useQuery({
    queryKey: ["checkout-success", sessionId],
    queryFn: () => confirmCheckout({ data: { sessionId } }),
    enabled: sessionId.startsWith("cs_"),
    retry: 1,
  });

  useEffect(() => {
    if (confirmation.data?.paid) clear();
  }, [confirmation.data?.paid, clear]);

  if (!sessionId.startsWith("cs_")) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl">{t("success.missing")}</h1>
        <p className="mt-3 text-muted-foreground">{t("success.missingBody")}</p>
        <Button asChild className="mt-6">
          <Link to="/account">{t("success.account")}</Link>
        </Button>
      </main>
    );
  }

  if (confirmation.isLoading) {
    return <main className="mx-auto max-w-2xl px-4 py-16 text-muted-foreground">{t("success.loading")}</main>;
  }

  if (confirmation.isError || !confirmation.data) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-3xl">{t("success.unpaid")}</h1>
        <p className="mt-3 text-muted-foreground">
          {confirmation.error instanceof Error ? confirmation.error.message : t("success.unpaidBody")}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/checkout">{t("success.retry")}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/account">{t("success.account")}</Link>
          </Button>
        </div>
      </main>
    );
  }

  const order = confirmation.data;
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t("success.kicker")}</p>
      <h1 className="mt-2 text-3xl">{t("success.title")}</h1>
      <p className="mt-3 text-muted-foreground">{t("success.lead")}</p>
      <article className="mt-8 neon-panel rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong>{t("success.order", { id: order.orderId })}</strong>
          <Badge>{order.paid ? t("success.paidBadge") : order.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("success.ship", {
            method: order.shippingMethod,
            city: order.city,
            state: order.state,
            zip: order.zip,
          })}
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.productId} className="flex justify-between gap-3">
              <span>
                {item.name} × {item.qty}
              </span>
              <span>{money(item.priceCents * item.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-base font-medium">
          <span>{t("success.paid")}</span>
          <span className="neon-text">{money(order.totalCents)}</span>
        </div>
        {order.testMode ? <p className="mt-3 text-xs text-muted-foreground">{t("success.testMode")}</p> : null}
      </article>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/account">{t("success.account")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/">{t("success.shop")}</Link>
        </Button>
      </div>
    </main>
  );
}
