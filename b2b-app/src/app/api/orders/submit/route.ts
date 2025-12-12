import ExcelJS from "exceljs";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ItemSchema = z.object({
  partId: z.string().min(1),
  quantity: z.number().int().min(1),
  remark: z.string().optional().default(""),
});

const BodySchema = z.object({
  items: z.array(ItemSchema).min(1),
});

type PartForExcel = {
  id: string;
  oe_number: string;
  part_name: string;
  vehicle_models: { name: string } | { name: string }[] | null;
};

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) return new Response("Unauthorized", { status: 401 });

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({ user_id: user.id, status: "submitted" })
      .select("id,created_at")
      .single();
    if (orderError || !order) {
      return new Response(orderError?.message ?? "Failed to create order", {
        status: 400,
      });
    }

    // Insert order items
    const itemsToInsert = body.items.map((i) => ({
      order_id: order.id,
      part_id: i.partId,
      quantity: i.quantity,
      remark: i.remark ?? "",
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(itemsToInsert);
    if (itemsError) {
      return new Response(itemsError.message ?? "Failed to insert items", {
        status: 400,
      });
    }

    // Fetch part details for Excel (server-truth)
    const partIds = body.items.map((i) => i.partId);
    const { data: parts, error: partsError } = await supabase
      .from("parts")
      .select("id,oe_number,part_name, vehicle_models:vehicle_models(name)")
      .in("id", partIds);

    if (partsError) {
      return new Response(partsError.message ?? "Failed to fetch parts", {
        status: 400,
      });
    }

    const partMap = new Map<string, PartForExcel>(
      ((parts ?? []) as PartForExcel[]).map((p) => [p.id, p])
    );

    // Excel generation
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Order");

    sheet.columns = [
      { header: "OE Number", key: "oe_number", width: 22 },
      { header: "Vehicle Model", key: "vehicle_model", width: 18 },
      { header: "Part Name", key: "part_name", width: 28 },
      { header: "Quantity", key: "quantity", width: 10 },
      { header: "Remark", key: "remark", width: 28 },
    ];

    sheet.getRow(1).font = { bold: true };

    for (const i of body.items) {
      const p = partMap.get(i.partId);
      const vehicleModelName = Array.isArray(p?.vehicle_models)
        ? p?.vehicle_models[0]?.name ?? ""
        : p?.vehicle_models?.name ?? "";
      const partName = p?.part_name ?? "";
      const oeNumber = p?.oe_number ?? "";

      sheet.addRow({
        oe_number: oeNumber,
        vehicle_model: vehicleModelName,
        part_name: partName,
        quantity: i.quantity,
        remark: i.remark ?? "",
      });
    }

    const buffer = (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
    const fileName = `order_${order.id}.xlsx`;

    // Store filename (optional)
    await supabase.from("orders").update({ file_name: fileName }).eq("id", order.id);

    return new Response(Buffer.from(buffer), {
      status: 200,
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${fileName}"`,
        "cache-control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg =
      e instanceof z.ZodError
        ? e.issues?.[0]?.message ?? "Invalid request"
        : e instanceof Error
          ? e.message
          : "Unexpected server error";
    return new Response(String(msg), { status: 400 });
  }
}

