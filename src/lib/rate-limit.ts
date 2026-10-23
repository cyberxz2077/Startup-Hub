import "server-only";
import { createHash } from "node:crypto";
import { prisma } from "./db";
import { HttpError } from "./http";

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function rateLimit(
  identity: string,
  limit: number,
  seconds: number,
) {
  const key = hashToken(identity);
  const rows = await prisma.$queryRaw<{ hits: number }[]>`
    INSERT INTO rate_limits (key, hits, expires_at)
    VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN rate_limits.expires_at <= NOW() THEN 1 ELSE rate_limits.hits + 1 END,
      expires_at = CASE WHEN rate_limits.expires_at <= NOW() THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE rate_limits.expires_at END
    RETURNING hits`;
  if (rows[0].hits > limit)
    throw new HttpError(429, "操作太频繁，请稍后再试。");
}

export function requestIdentity(request: Request) {
  // Vercel overwrites this header; do not trust arbitrary forwarded IPs on other hosts.
  return process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
    : "local-or-proxy";
}
