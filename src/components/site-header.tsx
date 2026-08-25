import { Link } from "@tanstack/react-router";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCart } from "@/lib/shop/cart";
import { BRAND, openShopChat } from "@/lib/shop/brand";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/shop/server";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user } = useCurrentUserState();
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const me = useQuery({
    queryKey: ["me", user?.id],
    queryFn: () => getMe(),
    enabled: Boolean(user),
  });
  const isAdmin = Boolean(me.data?.is_admin);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-md border border-primary/40 bg-card font-display text-xs tracking-wide text-primary">
            250
          </span>
          <span className="font-display text-lg tracking-wide">{BRAND}</span>
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm">
          <Link to="/" className="px-2 py-2 text-muted-foreground hover:text-foreground">
            Shop
          </Link>
          <Link to="/contact" className="px-2 py-2 text-muted-foreground hover:text-foreground">
            Contact
          </Link>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-2 text-muted-foreground hover:text-foreground"
            onClick={() => openShopChat()}
          >
            <MessageCircle className="size-4" />
            Help
          </button>
          <Link to="/cart" className="relative px-2 py-2 text-muted-foreground hover:text-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">Cart</span>
            </span>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/account" className="px-2 py-2 text-muted-foreground hover:text-foreground">
                My orders
              </Link>
              <UserButton />
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/login" search={{ as: "customer" }}>
                Customer login
              </Link>
            </Button>
          )}
          {isAdmin ? (
            <Button asChild size="sm" variant="outline">
              <Link to="/admin">Admin</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline">
              <Link to="/login" search={{ as: "admin", next: "/admin" }}>
                Admin login
              </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
