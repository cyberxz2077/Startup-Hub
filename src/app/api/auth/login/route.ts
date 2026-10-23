import { NextResponse } from "next/server";
import { z } from "zod";
import { usernameSchema } from "@/lib/validation";
import { apiError, json, readJson, sameOrigin } from "@/lib/http";
import { loginMember } from "@/lib/password-auth";
import { rateLimit, requestIdentity } from "@/lib/rate-limit";
import { newSessionToken, setSessionCookie, logout } from "@/lib/auth";

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/?view=login", request.url));
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { username, password } = await readJson(
      request,
      z
        .object({
          username: usernameSchema,
          password: z.string().min(1).max(128),
        })
        .strict(),
      3000,
    );
    await rateLimit(`login:ip:${requestIdentity(request)}`, 20, 600);
    await rateLimit(`login:username:${username}`, 10, 600);
    await rateLimit("login:global", 600, 3600);
    const token = newSessionToken();
    const user = await loginMember(username, password, token);
    await logout();
    await setSessionCookie(token);
    return json({ user });
  } catch (error) {
    return apiError(error);
  }
}
