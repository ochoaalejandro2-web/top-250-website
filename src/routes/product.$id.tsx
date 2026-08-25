import { createFileRoute, Link } from "@tanstack/react-router";
import { getProduct } from "@/lib/shop/server";
import { useCart } from "@/lib/shop/cart";
import { money } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => ({ product: await getProduct({ data: params.id }) }),
  component: ProductPage,
});

function ProductPage() {
  const { product: p } = Route.useLoaderData();
  const add = useCart((s) => s.add);

  if (!p) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16">
        <p>Product not found.</p>
        <Link to="/" className="text-primary">
          Shop
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 lg:grid-cols-2">
      <img src={p.imageUrl} alt={p.fullName} className="aspect-[4/3] w-full rounded-2xl object-cover" />
      <div>
        <Badge>{p.tag}</Badge>
        <h1 className="mt-3 text-3xl">{p.fullName}</h1>
        <p className="mt-3 text-muted-foreground">{p.description}</p>
        <p className="mt-6 text-2xl text-primary">{money(p.priceCents)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {p.stock} in stock · {p.weightLb} lb · ships USPS or UPS from Phoenix
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={() => {
              add(p.id);
              toast.success("Added to cart");
            }}
          >
            Add to cart
          </Button>
          <Button variant="outline" asChild>
            <Link to="/cart">View cart</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/contact">Ask before buying</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
