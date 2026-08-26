import { useState } from "react";
import { submitContact } from "@/lib/shop/server";
import { openShopChat } from "@/lib/shop/brand";
import { useI18n } from "@/lib/i18n/locale";
import type { MessageKey } from "@/lib/i18n/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TOPICS: { value: string; key: MessageKey }[] = [
  { value: "Product question", key: "form.topic.product" },
  { value: "Shipping (USPS / UPS)", key: "form.topic.shipping" },
  { value: "Before I buy", key: "form.topic.before" },
  { value: "Order help", key: "form.topic.order" },
  { value: "Other", key: "form.topic.other" },
];

export function ContactForm() {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState(TOPICS[2].value);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitContact({ data: { name, email, phone, topic, message } });
      setSent(true);
      toast.success(t("toast.message"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="neon-panel rounded-2xl p-6">
        <h3 className="text-lg">{t("form.sentTitle")}</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("form.sentBody", { name: name.split(" ")[0] || "" })}
        </p>
        <Button className="mt-4" type="button" onClick={() => openShopChat()}>
          {t("form.openAssistant")}
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-3 neon-panel rounded-2xl p-5" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("form.name")} value={name} onChange={setName} required />
        <Field label={t("form.email")} type="email" value={email} onChange={setEmail} required />
      </div>
      <Field label={t("form.phone")} value={phone} onChange={setPhone} />
      <div className="space-y-1">
        <Label htmlFor="topic">{t("form.topic")}</Label>
        <select
          id="topic"
          className="flex h-11 w-full rounded-lg border border-white/15 bg-black px-3 text-sm"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          {TOPICS.map((item) => (
            <option key={item.value} value={item.value}>
              {t(item.key)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="message">{t("form.message")}</Label>
        <Textarea
          id="message"
          required
          minLength={8}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={t("form.messagePh")}
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? t("form.sending") : t("form.send")}
      </Button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => setOn(e, onChange)} required={required} />
    </div>
  );
}

function setOn(e: React.ChangeEvent<HTMLInputElement>, onChange: (v: string) => void) {
  onChange(e.target.value);
}
