import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { listApprovedReviews } from "@/lib/shop/server";
import { averageRating } from "@/lib/shop/reviews";
import { useI18n } from "@/lib/i18n/locale";
import { ReviewForm } from "@/components/review-form";
import { StarRating } from "@/components/star-rating";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reviews")({
  loader: async () => ({ reviews: await listApprovedReviews() }),
  staleTime: 0,
  shouldReload: true,
  component: ReviewsPage,
});

function ReviewsPage() {
  const initial = Route.useLoaderData();
  const listing = useQuery({
    queryKey: ["reviews"],
    queryFn: () => listApprovedReviews(),
    initialData: initial.reviews,
    refetchOnMount: "always",
    staleTime: 0,
  });
  const reviews = listing.data ?? initial.reviews;
  const { t, locale } = useI18n();
  const avg = averageRating(reviews);

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{t("reviews.kicker")}</p>
        <h1 className="mt-2 text-3xl sm:text-4xl">{t("reviews.title")}</h1>
        <p className="mt-3 max-w-xl text-muted-foreground">{t("reviews.lead")}</p>

        {reviews.length > 0 ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl neon-panel px-4 py-3">
            <StarRating value={Math.round(avg)} label={t("reviews.averageLabel", { avg })} />
            <p className="text-sm text-white/85">
              {t("reviews.summary", { avg, count: reviews.length })}
            </p>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">{t("reviews.empty")}</p>
        )}

        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="neon-panel rounded-2xl p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{review.name}</p>
                  <StarRating value={review.rating} size="sm" />
                </div>
                {review.createdAt ? (
                  <time className="text-xs text-muted-foreground" dateTime={review.createdAt}>
                    {formatReviewDate(review.createdAt, locale)}
                  </time>
                ) : null}
              </div>
              <p className="mt-3 text-sm whitespace-pre-wrap text-white/85">{review.comment}</p>
            </article>
          ))}
        </div>

        <Button className="mt-8" variant="outline" asChild>
          <Link to="/">{t("reviews.seeLineup")}</Link>
        </Button>
      </div>

      <div className="lg:sticky lg:top-24">
        <h2 className="text-lg">{t("reviews.form.title")}</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">{t("reviews.form.lead")}</p>
        <ReviewForm />
      </div>
    </main>
  );
}

function formatReviewDate(iso: string, locale: "en" | "es") {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
