import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
    const token = request.cookies.get("sapiocode_token")?.value;
    const isAuthPage = request.nextUrl.pathname.startsWith("/login") ||
        request.nextUrl.pathname.startsWith("/register");

    const isDashboardPage = request.nextUrl.pathname.startsWith("/dashboard");
    const isProgressPage = request.nextUrl.pathname.startsWith("/progress");

    if ((isDashboardPage || isProgressPage) && !token) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (isAuthPage && token) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/progress/:path*", "/login", "/register", "/"],
};
