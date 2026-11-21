import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  CORRELATION_ID_HEADER,
  getOrCreateCorrelationId,
} from "@/lib/observability/request-context";

export async function middleware(request: NextRequest) {
  const correlationId = getOrCreateCorrelationId(request.headers);
  const createResponse = () => {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(CORRELATION_ID_HEADER, correlationId);
    const nextResponse = NextResponse.next({ request: { headers: requestHeaders } });
    nextResponse.headers.set(CORRELATION_ID_HEADER, correlationId);
    return nextResponse;
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Allow the prototype to run without backend credentials.
  // Correlation IDs are still propagated when Supabase is not configured.
  if (!url || !key) {
    return createResponse();
  }

  let response = createResponse();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = createResponse();
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh and validate the session claims on each matched request.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
