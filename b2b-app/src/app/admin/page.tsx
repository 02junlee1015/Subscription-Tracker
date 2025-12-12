import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AccessRequestsPanel } from "./ui";

export const dynamic = "force-dynamic";

type BrandRow = { id: string; name: string; code: string };
type ModelRow = {
  id: string;
  name: string;
  brand: { name: string } | { name: string }[] | null;
};
type PartRow = {
  id: string;
  oe_number: string;
  part_name: string;
  category: string | null;
  model:
    | { name: string; brand: { name: string } | { name: string }[] | null }
    | { name: string }[]
    | null;
};
type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  user_id: string;
  file_name: string | null;
};

type AccessRequestRow = {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  decided_at: string | null;
};

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role,email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") redirect("/");

  const [
    { data: brands },
    { data: models },
    { data: parts },
    { data: orders },
    { data: accessRequests },
  ] =
    await Promise.all([
      supabase.from("brands").select("id,name,code").order("name"),
      supabase
        .from("vehicle_models")
        .select("id,name, brand:brands(name)")
        .order("name")
        .limit(50),
      supabase
        .from("parts")
        .select(
          "id,oe_number,part_name,category, model:vehicle_models(name, brand:brands(name))"
        )
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("orders")
        .select("id,created_at,status,user_id,file_name")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("access_requests")
        .select("id,email,status,created_at,decided_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Logged in as {profile.email} (admin)
        </p>
      </div>

      <AccessRequestsPanel initial={(accessRequests ?? []) as AccessRequestRow[]} />

      <Card>
        <CardHeader>
          <CardTitle>Brands</CardTitle>
          <CardDescription>Read-only list.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {((brands ?? []) as BrandRow[]).map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>{b.code}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle models</CardTitle>
          <CardDescription>Showing up to 50.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {((models ?? []) as ModelRow[]).map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    {Array.isArray(m.brand) ? m.brand[0]?.name ?? "-" : m.brand?.name ?? "-"}
                  </TableCell>
                  <TableCell>{m.name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Parts</CardTitle>
          <CardDescription>Showing latest 50.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>OE No.</TableHead>
                <TableHead>Part name</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {((parts ?? []) as PartRow[]).map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    {Array.isArray(p.model)
                      ? "-"
                      : Array.isArray(p.model?.brand)
                        ? p.model?.brand[0]?.name ?? "-"
                        : p.model?.brand?.name ?? "-"}
                  </TableCell>
                  <TableCell>
                    {Array.isArray(p.model) ? p.model[0]?.name ?? "-" : p.model?.name ?? "-"}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.oe_number}</TableCell>
                  <TableCell>{p.part_name}</TableCell>
                  <TableCell>{p.category ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
          <CardDescription>Showing latest 20.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>File</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {((orders ?? []) as OrderRow[]).map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleString()}</TableCell>
                  <TableCell>{o.status}</TableCell>
                  <TableCell>{o.file_name ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

