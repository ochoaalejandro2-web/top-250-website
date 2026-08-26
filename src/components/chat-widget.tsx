import { useEffect, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { askShopAi } from "@/lib/shop/server";
import { OPEN_CHAT_EVENT } from "@/lib/shop/brand";
import { useI18n } from "@/lib/i18n/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Msg = { role: "user" | "assistant"; content: string };

export function ChatWidget() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(true);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    setMessages([{ role: "assistant", content: t("chat.hello") }]);
  }, [locale, t]);

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
      setMessages([...next, { role: "assistant", content: t("chat.fail") }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 sm:bottom-6">
      {open ? (
        <div className="flex h-[min(520px,72vh)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl neon-panel bg-black shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-black px-4 py-3">
            <div>
              <p className="text-sm font-medium">{t("chat.title")}</p>
              <p className="text-xs text-muted-foreground">{t("chat.sub")}</p>
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
                    : "mr-8 rounded-2xl rounded-bl-sm bg-white/5 px-3 py-2 text-foreground"
                }
              >
                {m.content}
              </div>
            ))}
            {busy && <p className="text-xs text-muted-foreground">{t("chat.thinking")}</p>}
          </div>
          <form
            className="flex gap-2 border-t border-white/10 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("chat.placeholder")}
              aria-label={t("nav.help")}
            />
            <Button type="submit" size="icon" disabled={busy}>
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2">
          {hint && (
            <div className="max-w-56 rounded-2xl rounded-br-sm neon-panel px-3 py-2 text-sm">
              {t("chat.hint")}
              <button type="button" className="mt-1 block text-xs text-muted-foreground" onClick={() => setHint(false)}>
                {t("chat.dismiss")}
              </button>
            </div>
          )}
          <Button size="lg" onClick={() => setOpen(true)} className="shadow-lg">
            <MessageCircle className="size-4" />
            {t("chat.open")}
          </Button>
        </div>
      )}
    </div>
  );
}
