import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartLine = { productId: string; qty: number };

type CartState = {
  lines: CartLine[];
  add: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (productId, qty = 1) => {
        const lines = [...get().lines];
        const i = lines.findIndex((l) => l.productId === productId);
        if (i >= 0) lines[i] = { productId, qty: lines[i].qty + qty };
        else lines.push({ productId, qty });
        set({ lines });
      },
      setQty: (productId, qty) => {
        if (qty <= 0) set({ lines: get().lines.filter((l) => l.productId !== productId) });
        else
          set({
            lines: get().lines.map((l) => (l.productId === productId ? { ...l, qty } : l)),
          });
      },
      remove: (productId) => set({ lines: get().lines.filter((l) => l.productId !== productId) }),
      clear: () => set({ lines: [] }),
    }),
    { name: "top250-cart" },
  ),
);
