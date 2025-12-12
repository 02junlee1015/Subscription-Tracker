import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { email } = BodySchema.parse(json);

    const supabase = await createSupabaseServerClient();

    // Insert pending request (idempotent on email)
    const { error } = await supabase
      .from("access_requests")
      .insert({ email, status: "pending" });

    if (error) {
      // Unique violation => already requested, treat as success
      if ((error as any).code === "23505") {
        return new Response("Already requested. Please wait for approval.", {
          status: 200,
        });
      }
      return new Response(error.message ?? "Failed to submit request", {
        status: 400,
      });
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

