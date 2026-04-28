import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // TEMP DEBUG — investigating production 404s. Logs every request the
  // middleware sees + what it returned, so we can tell whether the
  // failing /admin/clients/[uuid] requests are reaching middleware at
  // all and what status the middleware emits. Remove once cause is
  // identified.
  const pathname = request.nextUrl.pathname;
  console.log("[middleware-debug] enter", {
    pathname,
    method: request.method,
  });
  const res = await updateSession(request);
  console.log("[middleware-debug] exit", {
    pathname,
    status: res.status,
    redirectTo: res.headers.get("location") ?? null,
  });
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - static assets
     * - image files
     * - favicon
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
