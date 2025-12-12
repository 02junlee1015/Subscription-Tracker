import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AddToCartRow } from "./ui";

export const dynamic = "force-dynamic";

type BrandRel = { id: string; name: string; code: string };
type ModelRel = {
  id: string;
  name: string;
  brand_id: string;
  brands: BrandRel | BrandRel[] | null;
};

type PartRow = {
  id: string;
  oe_number: string;
  part_name: string;
  category: string | null;
  remark_default: string | null;
};

export default async function ModelPartsPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: model } = await supabase
    .from("vehicle_models")
    .select("id,name,brand_id, brands:brands(id,name,code)")
    .eq("id", modelId)
    .maybeSingle();

  if (!model) return notFound();

  const { data: parts } = await supabase
    .from("parts")
    .select("id,oe_number,part_name,category,remark_default")
    .eq("vehicle_model_id", modelId)
    .order("category", { ascending: true })
    .order("oe_number", { ascending: true });

  const typedModel = model as unknown as ModelRel;
  const brand = Array.isArray(typedModel.brands)
    ? typedModel.brands[0] ?? null
    : typedModel.brands;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{typedModel.name}</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {brand ? `${brand.name} (${brand.code} Parts)` : "Brand"}
          </p>
        </div>
        <Link
          className="text-sm underline"
          href={brand ? `/brands/${brand.id}` : "/"}
        >
          ← Back
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parts</CardTitle>
          <CardDescription>Add parts to the cart. Quantity must be ≥ 1.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OE No.</TableHead>
                <TableHead>Vehicle Model</TableHead>
                <TableHead>Part Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Remark (default)</TableHead>
                <TableHead className="text-right">Add</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(parts as PartRow[] | null)?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.oe_number}</TableCell>
                  <TableCell>{typedModel.name}</TableCell>
                  <TableCell>{p.part_name}</TableCell>
                  <TableCell>{p.category ?? "-"}</TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {p.remark_default ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <AddToCartRow
                      defaultRemark={p.remark_default}
                      line={{
                        partId: p.id,
                        oeNumber: p.oe_number,
                        partName: p.part_name,
                        brandName: brand?.name ?? "",
                        brandCode: brand?.code ?? "",
                        vehicleModelName: typedModel.name,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!parts?.length ? (
            <div className="py-10 text-sm text-[hsl(var(--muted-foreground))]">
              No parts found for this model.
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

