import { withAuth } from "next-auth/middleware";

export default withAuth(function middleware(req) {
    console.log('🛡️ Proxy (Middleware) running for path:', req.nextUrl.pathname);
    // Optional: add custom logic here
});

export const config = {
    // Protect all routes except the login page, API auth routes, and public assets
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api/auth (auth internal API)
         * - api/webhook (webhooks should be public but secret-protected)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - auth/signin (your custom login page)
         */
        "/((?!api/auth|api/webhook|_next/static|_next/image|favicon.ico|auth/signin).*)",
    ],
};
