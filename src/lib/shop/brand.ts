export const BRAND = "TOP-250";

/** Public owner initials — never publish a full personal name on the shop. */
export const OWNER = "AO";

export const OPEN_CHAT_EVENT = "top250:open-chat";

export function openShopChat() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_CHAT_EVENT));
}
