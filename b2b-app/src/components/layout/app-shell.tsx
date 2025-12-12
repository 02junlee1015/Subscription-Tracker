"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CartProvider, useCartSummary } from "@/lib/cart/cart-context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <CartProvider>
      <ShellInner pathname={pathname}>{children}</ShellInner>
    </CartProvider>
  );
}

function ShellInner({
  pathname,
  children,
}: {
  pathname: string;
  children: React.ReactNode;
}) {
  const { distinct } = useCartSummary();
  const nav = [
    { href: "/", label: "Home / Brands" },
    { href: "/cart", label: `Cart (${distinct})` },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <div className="min-h-dvh bg-[hsl(var(--background))]">
      <header className="sticky top-0 z-10 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-semibold tracking-tight">
            B2B Parts Ordering
          </Link>
          <nav className="flex items-center gap-2">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm hover:bg-[hsl(var(--secondary))]",
                  pathname === item.href && "bg-[hsl(var(--secondary))] font-medium"
                )}
              >
                {item.label}
              </Link>
            ))}
            <form action="/logout" method="post">
              <Button type="submit" variant="outline" size="sm">
                Logout
              </Button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

