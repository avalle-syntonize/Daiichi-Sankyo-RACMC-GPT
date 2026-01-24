import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Global middleware for protecting routes and adding security headers
 * Implements:
 * - Route protection for authenticated pages
 * - Security headers for all responses
 * - Custom header validation for API routes
 */
export default withAuth(
  function middleware(req: NextRequest) {
    const response = NextResponse.next();

    // Add security headers to all responses
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-XSS-Protection", "1; mode=block");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.azure.com https://*.microsoft.com"
    );

    // Validate custom security header for API routes
    if (req.nextUrl.pathname.startsWith("/api/") && !req.nextUrl.pathname.startsWith("/api/auth/")) {
      const customHeader = req.headers.get("X-SWA-Custom-Header");
      
      // Allow requests without the custom header from same origin (server-side calls)
      // But enforce it for external requests
      const origin = req.headers.get("origin");
      const referer = req.headers.get("referer");
      
      if (origin && origin !== req.nextUrl.origin && !customHeader) {
        return NextResponse.json(
          { error: "Forbidden - Missing security header" },
          { status: 403 }
        );
      }
    }

    return response;
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/",
    },
  }
);

// Configure which routes to protect
export const config = {
  matcher: [
    "/chatbot/:path*",
    "/home/:path*",
    "/api/secure-test/:path*",
    "/api/storage/:path*",
  ],
};
