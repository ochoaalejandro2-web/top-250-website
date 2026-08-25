import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Shield, Truck, User } from "lucide-react";
import { listProducts } from "@/lib/shop/server";
import { useCart } from "@/lib/shop/cart";
import { BRAND, openShopChat } from "@/lib/shop/brand";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ContactForm } from "@/components/contact-form";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  loader: async () => ({ products: await listProducts() }),
  component: Home,
});

function Home() {
  const { products } = Route.useLoaderData();
  const add = useCart((s) => s.add);

  return (
    <main>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              {BRAND} · Gaming accessories · Phoenix, AZ
            </p>
            <h1 className="mt-3 text-4xl leading-none sm:text-5xl">Precision gear. Prices up front.</h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Eight pieces. See the price, ask a question, then buy. Checkout uses your address for a USPS or
              UPS estimate. Create a customer profile to track the order.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href="#shop">Shop the lineup</a>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/login" search={{ as: "customer" }}>
                  <User className="size-4" />
                  Customer login
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/login" search={{ as: "admin", next: "/admin" }}>
                  <Shield className="size-4" />
                  Admin login
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <img src="/products/mouse.jpg" alt="Strike Mouse" className="aspect-[4/3] rounded-2xl object-cover" />
            <img src="/products/keyboard.jpg" alt="Apex Keyboard" className="aspect-[4/3] rounded-2xl object-cover" />
            <img
              src="/products/headset.jpg"
              alt="Pulse Headset"
              className="col-span-2 aspect-[21/9] rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap gap-6 px-4 py-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Truck className="size-4 text-primary" />
            Ships USPS or UPS from Phoenix
          </span>
          <span>Estimates at checkout from your ZIP</span>
          <span>Ask us before you buy — form below, or the chat button</span>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-6xl px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl">The collection</h2>
          <p className="text-muted-foreground">Everything we sell. Price visible immediately.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p) => (
            <article key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <Link to="/product/$id" params={{ id: p.id }} className="block aspect-[16/11] overflow-hidden bg-muted">
                <img src={p.imageUrl} alt={p.fullName} className="h-full w-full object-cover" />
              </Link>
              <div className="flex flex-1 flex-col p-4">
                <Badge>{p.tag}</Badge>
                <h3 className="mt-2 text-lg">{p.name}</h3>
                <p className="mt-1 line-clamp-3 flex-1 text-sm text-muted-foreground">{p.description}</p>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span className="font-medium text-primary">{money(p.priceCents)}</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      add(p.id);
                      toast.success(`${p.name} added to cart`);
                    }}
                  >
                    Buy
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-card/40">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:grid-cols-2">
          <article className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">USPS</p>
            <h2 className="mt-2 text-xl">Priority Mail</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Usually the lower quote. Best for lighter kits (mouse, hub, cam). Calculated from your ZIP at
              checkout.
            </p>
          </article>
          <article className="rounded-2xl border border-border bg-card p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">UPS</p>
            <h2 className="mt-2 text-xl">Ground</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Usually a bit more, often faster on heavier boards and headsets. Same ZIP estimate at checkout.
            </p>
          </article>
        </div>
      </section>

      <section id="contact" className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2 lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Before you buy</p>
          <h2 className="mt-2 text-2xl">Contact {BRAND}</h2>
          <p className="mt-3 text-muted-foreground">
            Not sure about an item or shipping? Send a message first. No login needed. You can also use the
            assistant in the corner for instant answers.
          </p>
          <Button className="mt-6" type="button" variant="outline" onClick={() => openShopChat()}>
            <MessageCircle className="size-4" />
            Open the AI assistant
          </Button>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
