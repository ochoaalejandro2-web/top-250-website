import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Truck } from "lucide-react";
import { ContactForm } from "@/components/contact-form";
import { BRAND, openShopChat } from "@/lib/shop/brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({ component: ContactPage });

function ContactPage() {
  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-12 lg:grid-cols-2">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Before you buy</p>
        <h1 className="mt-2 text-3xl">Ask {BRAND} anything</h1>
        <p className="mt-3 text-muted-foreground">
          Questions about an item, fit, stock, or how much USPS or UPS will cost to your ZIP? Send a note
          first — no account required. We pack from Phoenix and reply as soon as we can.
        </p>
        <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <Truck className="mt-0.5 size-4 text-primary" />
            Shipping is USPS (usually cheaper) or UPS Ground (usually faster).
          </li>
          <li className="flex gap-2">
            <MessageCircle className="mt-0.5 size-4 text-primary" />
            The assistant in the corner can quote a rough shipping range from a ZIP code.
          </li>
        </ul>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="button" onClick={() => openShopChat()}>
            Chat now
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">See the lineup</Link>
          </Button>
        </div>
      </div>
      <ContactForm />
    </main>
  );
}
