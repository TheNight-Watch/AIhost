import { type NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "@/lib/utils";

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

  const isLocaleRoot = path === "/" || path === "";

  if (isLocaleRoot) {
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
