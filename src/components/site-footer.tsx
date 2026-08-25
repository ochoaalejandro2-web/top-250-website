import { Link } from "@tanstack/react-router";
import { BRAND, openShopChat } from "@/lib/shop/brand";

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg">{BRAND}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Gaming accessories from Phoenix, Arizona. Ships with USPS and UPS.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-medium">Shop</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground">
                All products
              </Link>
            </li>
            <li>
              <Link to="/cart" className="hover:text-foreground">
                Cart
              </Link>
            </li>
            <li>
              <Link to="/contact" className="hover:text-foreground">
                Contact before you buy
              </Link>
            </li>
            <li>
              <button type="button" className="hover:text-foreground" onClick={() => openShopChat()}>
                Ask the assistant
              </button>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-medium">Accounts</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>
              <Link to="/login" search={{ as: "customer" }} className="hover:text-foreground">
                Customer login
              </Link>
            </li>
            <li>
              <Link to="/login" search={{ as: "admin", next: "/admin" }} className="hover:text-foreground">
                Administrator login
              </Link>
            </li>
            <li>
              <Link to="/account" className="hover:text-foreground">
                Order history
              </Link>
            </li>
            <li>
              <Link to="/admin" className="hover:text-foreground">
                Admin dashboard
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
