"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCart, useCartSummary } from "@/lib/cart/cart-context";

export default function CartPage() {
  const { lines, removeLine, setQuantity, setRemark, clear } = useCart();
  const { distinct, totalQty } = useCartSummary();

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submitAndDownload() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders/submit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: lines }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || "Failed to submit");
      }
      const blob = await res.blob();
      const dispo = res.headers.get("content-disposition");
      const fileName =
        dispo?.match(/filename=\"?([^\";]+)\"?/i)?.[1] ?? "order.xlsx";

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      clear();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submit failed";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Cart</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {distinct} line items · {totalQty} total quantity
          </p>
        </div>
        <Button
          disabled={submitting || lines.length === 0}
          onClick={submitAndDownload}
        >
          {submitting ? "Submitting..." : "Submit & Download Excel"}
        </Button>
      </div>

      {error ? (
        <Card className="border-[hsl(var(--destructive))]">
          <CardHeader>
            <CardTitle className="text-[hsl(var(--destructive))]">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
          <CardDescription>Edit quantity/remark before submitting.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Vehicle model</TableHead>
                <TableHead>OE No.</TableHead>
                <TableHead>Part name</TableHead>
                <TableHead className="w-[140px]">Qty</TableHead>
                <TableHead>Remark</TableHead>
                <TableHead className="text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((l) => (
                <TableRow key={l.partId}>
                  <TableCell>{l.brandName}</TableCell>
                  <TableCell>{l.vehicleModelName}</TableCell>
                  <TableCell className="font-mono text-xs">{l.oeNumber}</TableCell>
                  <TableCell>{l.partName}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={l.quantity}
                      onChange={(e) => setQuantity(l.partId, Number(e.target.value))}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={l.remark}
                      onChange={(e) => setRemark(l.partId, e.target.value)}
                      placeholder="Remark"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => removeLine(l.partId)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {lines.length === 0 ? (
            <div className="py-10 text-sm text-[hsl(var(--muted-foreground))]">
              Your cart is empty. Go to Home / Brands and add parts.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

