import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public marketing pages live in app/(marketing)/ — the route group doesn't
// appear in the URL, so keep this list in sync when adding a page there.
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/students(.*)",
  "/educators(.*)",
  "/clients(.*)",
  "/employers(.*)",
  "/demo(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    (await auth()).protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp4|webm|ogg)).*)",
    "/(api|trpc)(.*)",
  ],
};
