import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getMembershipProfile } from "@/lib/membership-server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/features",
  "/pricing",
  "/tutorials(.*)",
  "/docs(.*)",
  "/blog(.*)",
  "/contact",
  "/login(.*)",
  "/signup(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/forgot-password(.*)",
  "/verify-email(.*)",
  "/reset-password(.*)",
  "/pending-approval(.*)",
  "/auth/callback(.*)",
  "/api/webhooks(.*)",
  "/api/auth(.*)",
]);

const isApprovalExempt = createRouteMatcher([
  "/pending-approval(.*)",
  "/api/membership(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();
  const { pathname } = request.nextUrl;

  if (!isPublicRoute(request) && !userId) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    userId &&
    (pathname === "/login" ||
      pathname === "/signup" ||
      pathname.startsWith("/sign-in") ||
      pathname.startsWith("/sign-up"))
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (userId && !isPublicRoute(request) && !isApprovalExempt(request)) {
    const meta = sessionClaims?.publicMetadata as
      | { approvalStatus?: string }
      | undefined;
    let approvalStatus = meta?.approvalStatus;

    if (!approvalStatus) {
      const profile = await getMembershipProfile(userId);
      approvalStatus = profile?.approval_status;
    }

    if (approvalStatus && approvalStatus !== "approved") {
      if (pathname.startsWith("/onboarding")) {
        return NextResponse.redirect(new URL("/pending-approval", request.url));
      }
      if (
        !pathname.startsWith("/pending-approval") &&
        !pathname.startsWith("/api/")
      ) {
        return NextResponse.redirect(new URL("/pending-approval", request.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
