import { z } from "zod";
import { usernameSchema, passwordSchema } from "@/lib/validation";
import { apiError, json, readJson, sameOrigin } from "@/lib/http";
import { registerMember } from "@/lib/password-auth";
import { rateLimit, requestIdentity } from "@/lib/rate-limit";
import { newSessionToken, setSessionCookie, logout } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { username, password, inviteCode } = await readJson(
      request,
      z
        .object({
          username: usernameSchema,
          password: passwordSchema,
          inviteCode: z.string().trim().min(1).max(100),
        })
        .strict(),
      3000,
    );
    await rateLimit(`register:ip:${requestIdentity(request)}`, 5, 3600);
    await rateLimit("register:global", 100, 3600);
    const token = newSessionToken();
    const user = await registerMember(username, password, inviteCode, token);
    await logout();
    await setSessionCookie(token);
    return json({ user }, 201);
  } catch (error) {
    return apiError(error);
  }
}
