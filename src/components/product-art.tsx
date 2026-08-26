import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const stroke = "#00ff6a";

export function ProductArt({
  id,
  name,
  className,
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const Icon = ICONS[id] ?? GenericIcon;
  return (
    <div className={cn("relative grid place-items-center overflow-hidden bg-black", className)}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,255,106,0.18),transparent_58%)]" />
      <Icon />
      <span className="sr-only">{name}</span>
    </div>
  );
}

function frame(children: ReactNode) {
  return (
    <svg viewBox="0 0 120 90" className="relative z-10 h-[72%] w-[72%]" fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

function MouseIcon() {
  return frame(
    <>
      <rect x="42" y="12" width="36" height="62" rx="18" stroke={stroke} strokeWidth="2.4" />
      <path d="M60 12v22" stroke={stroke} strokeWidth="2.4" />
      <path d="M48 34h24" stroke={stroke} strokeWidth="2" />
      <circle cx="60" cy="48" r="4" stroke={stroke} strokeWidth="2" />
    </>,
  );
}

function KeyboardIcon() {
  return frame(
    <>
      <rect x="14" y="28" width="92" height="38" rx="6" stroke={stroke} strokeWidth="2.4" />
      <path d="M26 40h8M40 40h8M54 40h8M68 40h8M82 40h8" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M30 52h60" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
    </>,
  );
}

function HeadsetIcon() {
  return frame(
    <>
      <path d="M28 52c0-18 14-32 32-32s32 14 32 32" stroke={stroke} strokeWidth="2.4" />
      <rect x="22" y="48" width="16" height="22" rx="6" stroke={stroke} strokeWidth="2.4" />
      <rect x="82" y="48" width="16" height="22" rx="6" stroke={stroke} strokeWidth="2.4" />
      <path d="M38 68c8 8 36 8 44 0" stroke={stroke} strokeWidth="2" />
    </>,
  );
}

function DeskpadIcon() {
  return frame(
    <>
      <rect x="16" y="28" width="88" height="40" rx="8" stroke={stroke} strokeWidth="2.4" />
      <path d="M28 48h64" stroke={stroke} strokeWidth="2" strokeDasharray="4 6" />
    </>,
  );
}

function ControllerIcon() {
  return frame(
    <>
      <path
        d="M30 40c0-6 6-10 12-10h36c6 0 12 4 12 10l6 18c2 6-2 12-8 12h-12l-8-8h-16l-8 8H32c-6 0-10-6-8-12z"
        stroke={stroke}
        strokeWidth="2.4"
      />
      <circle cx="44" cy="50" r="4" stroke={stroke} strokeWidth="2" />
      <circle cx="76" cy="50" r="4" stroke={stroke} strokeWidth="2" />
    </>,
  );
}

function CamIcon() {
  return frame(
    <>
      <rect x="28" y="32" width="64" height="36" rx="8" stroke={stroke} strokeWidth="2.4" />
      <circle cx="60" cy="50" r="10" stroke={stroke} strokeWidth="2.4" />
      <circle cx="60" cy="50" r="4" stroke={stroke} strokeWidth="2" />
      <path d="M40 32l8-8h24l8 8" stroke={stroke} strokeWidth="2.2" />
    </>,
  );
}

function GlowIcon() {
  return frame(
    <>
      <rect x="48" y="18" width="24" height="14" rx="3" stroke={stroke} strokeWidth="2.2" />
      <path d="M60 32v10M36 54h48M28 66h64" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="36" cy="54" r="3" stroke={stroke} strokeWidth="2" />
      <circle cx="84" cy="54" r="3" stroke={stroke} strokeWidth="2" />
    </>,
  );
}

function HubIcon() {
  return frame(
    <>
      <rect x="30" y="30" width="60" height="32" rx="6" stroke={stroke} strokeWidth="2.4" />
      <path d="M42 42h8M54 42h8M66 42h8M42 54h36" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
    </>,
  );
}

function GenericIcon() {
  return frame(
    <>
      <rect x="34" y="22" width="52" height="48" rx="10" stroke={stroke} strokeWidth="2.4" />
      <path d="M48 46h24" stroke={stroke} strokeWidth="2.2" />
    </>,
  );
}

const ICONS: Record<string, () => ReactNode> = {
  mouse: MouseIcon,
  keyboard: KeyboardIcon,
  headset: HeadsetIcon,
  deskpad: DeskpadIcon,
  controller: ControllerIcon,
  webcam: CamIcon,
  rgbkit: GlowIcon,
  hub: HubIcon,
};
