import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("sapiocode_token")?.value;
  const pathname = request.nextUrl.pathname;
  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register");

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/progress") ||
    pathname.startsWith("/workbench") ||
    pathname.startsWith("/teacher");

  // Root redirect
  if (pathname === "/") {
    if (token) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protected routes — require auth
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Auth pages — redirect to dashboard if already logged in
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/progress/:path*",
    "/workbench/:path*",
    "/teacher/:path*",
    "/login",
    "/register",
  ],
};
