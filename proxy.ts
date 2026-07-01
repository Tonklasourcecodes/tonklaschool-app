import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admins don't need to be matched to an approver name — everyone else does,
  // so PO/JO items assigned to them by name show up on their approvals page.
  const user = req.auth.user as { role?: string; approverName?: string } | undefined;
  const needsName = user?.role !== "admin" && !user?.approverName;
  const isSetupRoute = pathname.startsWith("/setup-name") || pathname.startsWith("/api/setup-name") || pathname.startsWith("/api/people");
  if (needsName && !isSetupRoute) {
    return NextResponse.redirect(new URL("/setup-name", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
