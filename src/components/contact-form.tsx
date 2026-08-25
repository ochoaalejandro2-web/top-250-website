import { useState } from "react";
import { submitContact } from "@/lib/shop/server";
import { openShopChat } from "@/lib/shop/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TOPICS = ["Product question", "Shipping (USPS / UPS)", "Before I buy", "Order help", "Other"];

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [topic, setTopic] = useState(TOPICS[2]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitContact({ data: { name, email, phone, topic, message } });
      setSent(true);
      toast.success("Message sent. We’ll reply by email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <h3 className="text-lg">Got it</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Thanks {name.split(" ")[0] || ""}. We read every note before packing orders. For a faster answer,
          chat with the shop assistant.
        </p>
        <Button className="mt-4" type="button" onClick={() => openShopChat()}>
          Open the assistant
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-3 rounded-2xl border border-border bg-card p-5" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Your name" value={name} onChange={setName} required />
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
      </div>
      <Field label="Phone (optional)" value={phone} onChange={setPhone} />
      <div className="space-y-1">
        <Label htmlFor="topic">Topic</Label>
        <select
          id="topic"
          className="flex h-11 w-full rounded-lg border border-border bg-card px-3 text-sm"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          {TOPICS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          required
          minLength={8}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask about a product, size, or shipping to your ZIP…"
        />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Sending…" : "Send message"}
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
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} />
    </div>
  );
}
