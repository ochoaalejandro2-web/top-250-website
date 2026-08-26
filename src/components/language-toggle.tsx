import { useI18n } from "@/lib/i18n/locale";
import type { Locale } from "@/lib/i18n/messages";

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex items-center gap-1.5 font-semibold tracking-wide" role="group" aria-label="Language">
      <LangBtn active={locale === "en"} onClick={() => setLocale("en")}>
        EN
      </LangBtn>
      <span className="text-white/70" aria-hidden="true">
        |
      </span>
      <LangBtn active={locale === "es"} onClick={() => setLocale("es")}>
        ES
      </LangBtn>
    </div>
  );
}

function LangBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active ? "text-primary neon-text" : "text-white/70 hover:text-white"}
      aria-pressed={active}
      lang={children.toLowerCase() as Locale}
    >
      {children}
    </button>
  );
}
