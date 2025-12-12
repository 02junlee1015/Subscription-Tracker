import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: brands } = await supabase
    .from("brands")
    .select("id,name,code")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Brands</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Choose Brand → Vehicle Model → Parts → Cart → Download Excel.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(brands ?? []).map((b) => (
          <Link key={b.id} href={`/brands/${b.id}`}>
            <Card className="transition-colors hover:bg-[hsl(var(--secondary))]">
              <CardHeader>
                <CardTitle>{b.name}</CardTitle>
                <CardDescription>{b.code} Parts</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>

      {!brands?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No catalog data yet</CardTitle>
            <CardDescription>
              Run <code>supabase/schema.sql</code> in the Supabase SQL editor to create/seed brands,
              vehicle models, and parts.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : null}
    </div>
  );
}
