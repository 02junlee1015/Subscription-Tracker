import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ParamsSchema = z.object({
  requestId: z.string().min(1),
});

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ requestId: string }> }
) {
  try {
    const { requestId } = ParamsSchema.parse(await ctx.params);

    // Verify admin session
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    // Load request
    const { data: reqRow, error: reqErr } = await supabase
      .from("access_requests")
      .select("id,email,status")
      .eq("id", requestId)
      .maybeSingle();

    if (reqErr || !reqRow) return new Response("Not found", { status: 404 });
    if (reqRow.status !== "pending") return new Response("Already processed", { status: 400 });

    // Invite user via service role (Supabase sends email)
    const admin = createSupabaseAdminClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { data: invited, error: inviteErr } =
      await admin.auth.admin.inviteUserByEmail(reqRow.email, {
        redirectTo: `${siteUrl}/login`,
      });

    if (inviteErr) {
      return new Response(inviteErr.message ?? "Invite failed", { status: 400 });
    }

    const authUserId = invited.user?.id ?? null;

    // Mark approved
    const { error: updErr } = await supabase
      .from("access_requests")
      .update({
        status: "approved",
        decided_at: new Date().toISOString(),
        decided_by: user.id,
        auth_user_id: authUserId,
      })
      .eq("id", requestId);

    if (updErr) {
      return new Response(updErr.message ?? "Failed to update request", { status: 400 });
    }

    return new Response("OK", { status: 200 });
  } catch (e: unknown) {
    const msg =
      e instanceof z.ZodError
        ? e.issues?.[0]?.message ?? "Invalid request"
        : e instanceof Error
          ? e.message
          : "Unexpected error";
    return new Response(String(msg), { status: 400 });
  }
}

