"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CartLine } from "@/lib/cart/types";
import { useCart } from "@/lib/cart/cart-context";

export function AddToCartRow({
  line,
  defaultRemark,
}: {
  line: Omit<CartLine, "quantity" | "remark">;
  defaultRemark?: string | null;
}) {
  const { addLine } = useCart();
  const [qty, setQty] = React.useState<number>(1);
  const [added, setAdded] = React.useState(false);

  return (
    <div className="flex items-center gap-2">
      <Input
        className="w-20"
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
      />
      <Button
        type="button"
        size="sm"
        onClick={() => {
          const q = Number.isFinite(qty) && qty >= 1 ? Math.floor(qty) : 1;
          addLine({
            ...line,
            quantity: q,
            remark: defaultRemark ?? "",
          });
          setAdded(true);
          window.setTimeout(() => setAdded(false), 1000);
        }}
      >
        {added ? "Added" : "Add"}
      </Button>
    </div>
  );
}

