import { useState } from "react";
import { submitReview } from "@/lib/shop/server";
import { REVIEW_MAX_COMMENT, REVIEW_MIN_COMMENT } from "@/lib/shop/reviews";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarPicker } from "@/components/star-rating";
import { toast } from "sonner";

export function ReviewForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitReview({ data: { name, rating, comment } });
      setSent(true);
      toast.success(t("toast.review"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reviews.form.error"));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="neon-panel rounded-2xl p-6">
        <h3 className="text-lg">{t("reviews.form.sentTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("reviews.form.sentBody", { name: name.split(" ")[0] || "" })}
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-3 neon-panel rounded-2xl p-5" onSubmit={onSubmit}>
      <div className="space-y-1">
        <Label htmlFor="review-name">{t("reviews.form.name")}</Label>
        <Input
          id="review-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={60}
          autoComplete="name"
        />
      </div>
      <StarPicker value={rating} onChange={setRating} label={t("reviews.form.rating")} />
      <div className="space-y-1">
        <Label htmlFor="review-comment">{t("reviews.form.comment")}</Label>
        <Textarea
          id="review-comment"
          required
          minLength={REVIEW_MIN_COMMENT}
          maxLength={REVIEW_MAX_COMMENT}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder={t("reviews.form.commentPh")}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t("reviews.form.moderateHint")}</p>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? t("reviews.form.sending") : t("reviews.form.send")}
      </Button>
    </form>
  );
}
