import { Link } from "@tanstack/react-router";
import { openShopChat } from "@/lib/shop/brand";
import { useI18n } from "@/lib/i18n/locale";
import { BrandLogo } from "@/components/brand-logo";

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="mt-8 border-t border-white/10">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <BrandLogo />
          <p className="mt-3 text-sm text-muted-foreground">{t("footer.blurb")}</p>
          <p className="mt-2 text-xs text-muted-foreground">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">{t("footer.shop")}</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-primary">
                {t("footer.all")}
              </Link>
            </li>
            <li>
              <Link to="/shipping" className="hover:text-primary">
                {t("nav.shipping")}
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-primary">
                {t("footer.cart")}
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-primary">
                {t("footer.contact")}
              </Link>
            </li>
            <li>
              <button type="button" className="hover:text-primary" onClick={() => openShopChat()}>
                {t("footer.assistant")}
              </button>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold text-white">{t("footer.accounts")}</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link to="/login" search={{ as: "customer" }} className="hover:text-primary">
                {t("footer.customerLogin")}
              </Link>
            </li>
            <li>
              <Link to="/login" search={{ as: "admin", next: "/admin" }} className="hover:text-primary">
                {t("footer.adminLogin")}
              </Link>
            </li>
            <li>
              <Link to="/account" className="hover:text-primary">
                {t("footer.history")}
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-primary">
                {t("footer.dashboard")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
