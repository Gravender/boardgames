import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const protectedPrefixes = [
  "/dashboard",
  "/games",
  "/players",
  "/groups",
  "/locations",
  "/calendar",
  "/friends",
  "/share-requests",
  "/settings",
] as const;

const isProtectedPath = (pathname: string) =>
  protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;
  if (sessionCookie && ["/login", "/sign-up"].includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!sessionCookie && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/games/:path*",
    "/players/:path*",
    "/groups/:path*",
    "/locations/:path*",
    "/calendar/:path*",
    "/friends/:path*",
    "/share-requests/:path*",
    "/settings/:path*",
    "/login",
    "/sign-up",
  ],
};
