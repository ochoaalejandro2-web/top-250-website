import { Link } from "@tanstack/react-router";
import { BRAND } from "@/lib/shop/brand";

export function BrandMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <span
      className={`grid place-items-center rounded-md bg-primary font-black text-black neon-glow ${className}`}
      aria-hidden="true"
    >
      T
    </span>
  );
}

export function BrandLogo() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <BrandMark className="h-10 w-10 text-xl" />
      <span className="leading-tight">
        <span className="block text-lg font-extrabold tracking-wide text-white">{BRAND}</span>
        <span className="block text-[10px] font-semibold tracking-[0.22em] text-primary">PHOENIX, AZ</span>
      </span>
    </Link>
  );
}
