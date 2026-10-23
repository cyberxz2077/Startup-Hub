import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { hashToken } from "./rate-limit";
import { HttpError } from "./http";

export const sessionCookie = () =>
  process.env.NODE_ENV === "production" ? "__Host-hub_session" : "hub_session";
export const sessionDuration = 60 * 60 * 24 * 7;
export const publicUser = {
  id: true,
  email: true,
  username: true,
  name: true,
  avatar: true,
  bio: true,
} as const;

// Both the new invitation accounts and previously verified email members are
// eligible. Historical OAuth records do not silently gain membership.
export const memberWhere = {
  OR: [{ joinedAt: { not: null } }, { emailVerifiedAt: { not: null } }],
};

export async function getSession() {
  const token = (await cookies()).get(sessionCookie())?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const session = await prisma.authSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: publicUser } },
  });
  return session && !session.revokedAt && session.expiresAt > new Date()
    ? session.user
    : null;
}

export async function requireSession() {
  const user = await getSession();
  if (!user) throw new HttpError(401, "请先登录，再继续操作。");
  return user;
}

export function newSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(sessionCookie(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionDuration,
  });
}

export async function logout() {
  const store = await cookies();
  const token = store.get(sessionCookie())?.value;
  if (token)
    await prisma.authSession.updateMany({
      where: { tokenHash: hashToken(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  store.set(sessionCookie(), "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
