import { useEffect, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { askShopAi } from "@/lib/shop/server";
import { BRAND, OPEN_CHAT_EVENT } from "@/lib/shop/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content: `Hi — I’m the ${BRAND} assistant. Ask about any product, price, or USPS / UPS shipping from Phoenix.`,
    },
  ]);

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setHint(false);
    };
    window.addEventListener(OPEN_CHAT_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen);
  }, []);

  async function send() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: q }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await askShopAi({
        data: {
          question: q,
          history: next.filter((m) => m.role === "user" || m.content.length < 600),
        },
      });
      setMessages([...next, { role: "assistant", content: res.ok ? res.text : res.error }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Could not reach the assistant." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 sm:bottom-6">
      {open ? (
        <div className="flex h-[min(520px,72vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
          <div className="flex items-center justify-between border-b border-border bg-muted px-4 py-3">
            <div>
              <p className="text-sm font-medium">{BRAND} assistant</p>
              <p className="text-xs text-muted-foreground">Products, prices, USPS & UPS</p>
            </div>
            <button type="button" className="p-1 text-muted-foreground" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-8 rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-primary-foreground"
                    : "mr-8 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-foreground"
                }
              >
                {m.content}
              </div>
            ))}
            {busy && <p className="text-xs text-muted-foreground">Thinking…</p>}
          </div>
          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Shipping to 85001?"
              aria-label="Ask the shop"
            />
            <Button type="submit" size="icon" disabled={busy}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2">
          {hint && (
            <div className="max-w-56 rounded-2xl rounded-br-sm border border-border bg-card px-3 py-2 text-sm shadow-lg">
              Questions before you buy? Chat about gear or shipping.
              <button
                type="button"
                className="mt-1 block text-xs text-muted-foreground"
                onClick={() => setHint(false)}
              >
                Dismiss
              </button>
            </div>
          )}
          <Button size="lg" onClick={() => setOpen(true)} className="shadow-lg">
            <MessageCircle className="size-4" />
            Chat with us
          </Button>
        </div>
      )}
    </div>
  );
}
