import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

const PUBLIC_ROUTES = new Set(["/login", "/signup", "/request-access"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip Next internals/static
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // If env isn't set yet, allow navigating to auth pages only.
  if (!url || !anonKey) {
    if (PUBLIC_ROUTES.has(pathname)) return NextResponse.next();
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = "/login";
    return NextResponse.redirect(nextUrl);
  }

  const response = NextResponse.next();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic = PUBLIC_ROUTES.has(pathname);

  if (!user && !isPublic) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = "/login";
    return NextResponse.redirect(nextUrl);
  }

  if (user && isPublic) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = "/";
    return NextResponse.redirect(nextUrl);
  }

  // Admin gate: basic role check from public.users
  if (user && pathname.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.role !== "admin") {
      const nextUrl = request.nextUrl.clone();
      nextUrl.pathname = "/";
      return NextResponse.redirect(nextUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};

