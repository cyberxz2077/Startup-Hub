import { NextResponse } from "next/server";
// Old OAuth bookmarks have no effect on authentication.
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/?view=login", request.url));
}
