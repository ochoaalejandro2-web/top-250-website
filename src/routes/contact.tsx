import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Truck } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { openShopChat } from "@/lib/shop/brand";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  const { t } = useI18n();
  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t("contact.kicker")}</p>
        <h1 className="mt-2 text-3xl">{t("contact.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("contact.lead")}</p>
        <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Truck className="mt-0.5 size-4 text-primary" />
            {t("contact.bulletShip")}
          </li>
          <li className="flex gap-2">
            <MessageCircle className="mt-0.5 size-4 text-primary" />
            {t("contact.bulletChat")}
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => openShopChat()}>
            {t("contact.chat")}
          </Button>
          <Button variant="neonRed" asChild>
            <Link to="/">{t("contact.seeLineup")}</Link>
          </Button>
        </div>
      </div>
      <ContactForm />
    </main>
  );
}
