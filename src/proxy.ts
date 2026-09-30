import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// İyimser kontrol: geçerli oturum çerezi yoksa giriş sayfasına yönlendir.
// Asıl yetki kontrolü sayfalarda ve server action'larda requireUser() ile yapılır.
export async function proxy(request: NextRequest) {
  const userId = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!userId) {
    const url = new URL("/giris", request.url);
    if (request.nextUrl.pathname !== "/") url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!giris|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
