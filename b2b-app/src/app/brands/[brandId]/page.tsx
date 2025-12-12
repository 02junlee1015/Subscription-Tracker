import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BrandPage({
  params,
}: {
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: brand } = await supabase
    .from("brands")
    .select("id,name,code")
    .eq("id", brandId)
    .maybeSingle();

  if (!brand) return notFound();

  const { data: models } = await supabase
    .from("vehicle_models")
    .select("id,name")
    .eq("brand_id", brandId)
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {brand.name} <span className="text-sm text-[hsl(var(--muted-foreground))]">({brand.code} Parts)</span>
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Choose a vehicle model.</p>
        </div>
        <Link className="text-sm underline" href="/">
          ← Back to brands
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(models ?? []).map((m) => (
          <Link key={m.id} href={`/models/${m.id}`}>
            <Card className="transition-colors hover:bg-[hsl(var(--secondary))]">
              <CardHeader>
                <CardTitle>{m.name}</CardTitle>
                <CardDescription>{brand.name}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        ))}
      </div>
      {!models?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>No vehicle models</CardTitle>
            <CardDescription>Add models in Supabase (admin) or update the seed data.</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      ) : null}
    </div>
  );
}

