import { authMiddleware as auth } from "./auth.edge";
import { NextResponse } from "next/server";

const proxy = auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;
    const userRole = req.auth?.user?.role;

    // Public routes
    const isPublicRoute = nextUrl.pathname === "/" || nextUrl.pathname === "/login";
    const isAuthApi = nextUrl.pathname.startsWith("/api/auth");

    // Allow public routes and auth API
    if (isPublicRoute || isAuthApi) {
        // Redirect logged-in users away from login page
        if (nextUrl.pathname === "/login" && isLoggedIn) {
            return NextResponse.redirect(new URL("/dashboard", nextUrl));
        }
        return NextResponse.next();
    }

    // Protected routes require authentication
    if (!isLoggedIn) {
        return NextResponse.redirect(new URL("/login", nextUrl));
    }

    // Admin routes require ADMIN role
    if (nextUrl.pathname.startsWith("/admin")) {
        if (userRole !== "ADMIN") {
            return NextResponse.redirect(new URL("/dashboard?error=unauthorized", nextUrl));
        }
    }

    return NextResponse.next();
});

export { proxy };

export const config = {
    matcher: [
        // Match all routes except static files and images
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
