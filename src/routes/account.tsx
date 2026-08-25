import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { listMyOrders } from "@/lib/shop/server";
import { money } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/account")({ component: AccountPage });

function AccountPage() {
  const { user, isPending } = useCurrentUserState();
  const orders = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: () => listMyOrders(),
    enabled: Boolean(user),
  });

  if (isPending) return <main className="mx-auto max-w-3xl px-4 py-16 text-muted-foreground">Loading…</main>;
  if (!user) return <RedirectToSignIn />;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl">Your profile</h1>
      <p className="mt-2 text-muted-foreground">
        {user.displayName ?? "Customer"} · {user.primaryEmail ?? "No email on file"}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Customer account for TOP-250 orders and shipping updates.</p>
      <h2 className="mt-10 text-xl">Orders</h2>
      {orders.isLoading && <p className="mt-4 text-muted-foreground">Loading orders…</p>}
      {(orders.data ?? []).length === 0 && !orders.isLoading && (
        <p className="mt-4 text-muted-foreground">No orders yet. Place one from the shop.</p>
      )}
      <div className="mt-4 space-y-4">
        {(orders.data ?? []).map((o) => (
          <article key={o.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>Order #{o.id}</strong>
              <Badge>{o.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {o.shippingMethod} to {o.city}, {o.state} {o.zip} · {money(o.totalCents)}
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {o.items.map((it) => (
                <li key={it.productId}>
                  {it.name} × {it.qty} — {money(it.priceCents * it.qty)}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </main>
  );
}
