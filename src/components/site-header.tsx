import { Link } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useCart } from "@/lib/shop/cart";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/shop/server";
import { useI18n } from "@/lib/i18n/locale";
import { BrandLogo } from "@/components/brand-logo";
import { LanguageToggle } from "@/components/language-toggle";

export function SiteHeader() {
  const { t } = useI18n();
  const { user } = useCurrentUserState();
  const count = useCart((s) => s.lines.reduce((n, l) => n + l.qty, 0));
  const me = useQuery({
    queryKey: ["me", user?.id],
    queryFn: () => getMe(),
    enabled: Boolean(user),
  });
  const isAdmin = Boolean(me.data?.is_admin);

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <BrandLogo />
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm font-medium">
          <Link to="/" className="text-white/85 hover:text-white">
            {t("nav.shop")}
          </Link>
          <Link to="/shipping" className="text-white/85 hover:text-white">
            {t("nav.shipping")}
          </Link>
          <Link to="/contact" className="text-white/85 hover:text-white">
            {t("nav.contact")}
          </Link>
          {isAdmin ? (
            <Link to="/admin" className="font-semibold text-destructive">
              {t("nav.admin")}
            </Link>
          ) : (
            <Link
              to="/login"
              search={{ as: "admin", next: "/admin" }}
              className="font-semibold text-destructive"
            >
              {t("nav.admin")}
            </Link>
          )}
          <LanguageToggle />
          <Link to="/cart" className="relative text-white/85 hover:text-white" aria-label={t("nav.cart")}>
            <ShoppingBag className="size-4" />
            {count > 0 && (
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-black">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <>
              <Link to="/account" className="hidden text-white/85 hover:text-white sm:inline">
                {t("nav.orders")}
              </Link>
              <UserButton />
            </>
          ) : (
            <Link to="/login" search={{ as: "customer" }} className="text-white/85 hover:text-white">
              {t("nav.login")}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
