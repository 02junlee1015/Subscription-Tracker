"use client";

import * as React from "react";

import type { CartLine } from "./types";

type CartState = {
  lines: CartLine[];
};

type CartActions = {
  addLine: (line: CartLine) => void;
  removeLine: (partId: string) => void;
  setQuantity: (partId: string, quantity: number) => void;
  setRemark: (partId: string, remark: string) => void;
  clear: () => void;
};

const CartContext = React.createContext<(CartState & CartActions) | null>(null);

const STORAGE_KEY = "b2b_cart_v1";

function clampQty(qty: number) {
  if (!Number.isFinite(qty)) return 1;
  return Math.max(1, Math.floor(qty));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = React.useState<CartLine[]>([]);

  // Hydrate
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as CartState;
      if (parsed?.lines?.length) setLines(parsed.lines);
    } catch {
      // ignore
    }
  }, []);

  // Persist
  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines } satisfies CartState));
    } catch {
      // ignore
    }
  }, [lines]);

  const api = React.useMemo(() => {
    const addLine = (line: CartLine) => {
      setLines((prev) => {
        const idx = prev.findIndex((x) => x.partId === line.partId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            quantity: clampQty(next[idx].quantity + clampQty(line.quantity)),
            remark: line.remark ?? next[idx].remark,
          };
          return next;
        }
        return [...prev, { ...line, quantity: clampQty(line.quantity), remark: line.remark ?? "" }];
      });
    };

    const removeLine = (partId: string) => {
      setLines((prev) => prev.filter((x) => x.partId !== partId));
    };

    const setQuantity = (partId: string, quantity: number) => {
      setLines((prev) =>
        prev.map((x) => (x.partId === partId ? { ...x, quantity: clampQty(quantity) } : x))
      );
    };

    const setRemark = (partId: string, remark: string) => {
      setLines((prev) => prev.map((x) => (x.partId === partId ? { ...x, remark } : x)));
    };

    const clear = () => setLines([]);

    return { addLine, removeLine, setQuantity, setRemark, clear };
  }, []);

  const value: CartState & CartActions = { lines, ...api };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = React.useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}

export function useCartSummary() {
  const { lines } = useCart();
  const distinct = lines.length;
  const totalQty = lines.reduce((sum, l) => sum + (l.quantity ?? 0), 0);
  return { distinct, totalQty };
}

