import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { locales, defaultLocale } from "@/lib/utils";

const PROTECTED_PATHS = ["/dashboard", "/upload", "/voice-select", "/script"];
const AUTH_PATHS = ["/login", "/register"];

function getLocaleAndPath(pathname: string): { locale: string | null; path: string } {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`)) {
      return { locale, path: pathname.slice(`/${locale}`.length) };
    }
    if (pathname === `/${locale}`) {
      return { locale, path: "/" };
    }
  }
  return { locale: null, path: pathname };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API and static files
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Redirect to default locale if no locale in path
  const { locale, path } = getLocaleAndPath(pathname);
  if (!locale) {
    request.nextUrl.pathname = `/${defaultLocale}${pathname}`;
    return NextResponse.redirect(request.nextUrl);
  }

  // Update Supabase auth session (also refreshes tokens)
  let response: NextResponse;
  let user = null;
  try {
    const session = await updateSession(request);
    response = session.response;
    user = session.user;
  } catch {
    // Supabase not configured — skip auth checks
    return NextResponse.next();
  }

  // Redirect locale root (e.g. /zh, /en) to dashboard or login
  const isLocaleRoot = path === "/" || path === "";
  const isProtected = PROTECTED_PATHS.some((p) => path.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => path.startsWith(p));

  if (isLocaleRoot || isProtected || isAuthPage) {
    try {
      if (isLocaleRoot) {
        const url = request.nextUrl.clone();
        url.pathname = user ? `/${locale}/dashboard` : `/${locale}/login`;
        return NextResponse.redirect(url);
      }

      if (isProtected && !user) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/login`;
        return NextResponse.redirect(url);
      }

      if (isAuthPage && user) {
        const url = request.nextUrl.clone();
        url.pathname = `/${locale}/dashboard`;
        return NextResponse.redirect(url);
      }
    } catch {
      // Supabase not configured — allow access
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
