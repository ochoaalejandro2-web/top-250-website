import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  size = "md",
  label,
}: {
  value: number;
  size?: "sm" | "md";
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const cls = size === "sm" ? "size-3.5" : "size-4";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={label ?? `${clamped} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(cls, star <= clamped ? "fill-primary text-primary" : "text-white/20")}
          aria-hidden
        />
      ))}
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (rating: number) => void;
  label: string;
}) {
  return (
    <div>
      <p className="mb-1 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((star) => {
          const selected = value === star;
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`${star} ${star === 1 ? "star" : "stars"}`}
              className={cn(
                "grid size-10 place-items-center rounded-lg border transition-colors",
                star <= value
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-white/15 text-white/35 hover:border-white/30 hover:text-white/70",
              )}
              onClick={() => onChange(star)}
            >
              <Star className={cn("size-5", star <= value && "fill-primary")} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
