import "server-only";
import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { publicUser, sessionDuration } from "./auth";
import { hashToken } from "./rate-limit";
import { HttpError } from "./http";
import { hashPassword, verifyPassword } from "./password";

export function checkRegistrationInvite(inviteCode: string) {
  const configured = process.env.REGISTRATION_INVITE_CODE?.trim();
  if (!configured) throw new HttpError(503, "注册暂未开放，请稍后再来。");
  if (
    !timingSafeEqual(
      Buffer.from(hashToken(inviteCode)),
      Buffer.from(hashToken(configured)),
    )
  )
    throw new HttpError(403, "邀请码不正确，请向邀请人确认。");
}

const sessionData = (token: string) => ({
  tokenHash: hashToken(token),
  expiresAt: new Date(Date.now() + sessionDuration * 1000),
});

export async function registerMember(
  username: string,
  password: string,
  inviteCode: string,
  token: string,
) {
  checkRegistrationInvite(inviteCode);
  const passwordHash = await hashPassword(password);
  try {
    // Nested create commits the unique username, password and session atomically.
    return await prisma.user.create({
      data: {
        username,
        passwordHash,
        name: username,
        joinedAt: new Date(),
        sessions: { create: sessionData(token) },
      },
      select: publicUser,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new HttpError(409, "这个用户名已被使用，请换一个，或直接登录。");
    throw error;
  }
}

export async function loginMember(
  username: string,
  password: string,
  token: string,
) {
  const user = await prisma.user.findUnique({
    where: { username },
    select: { ...publicUser, passwordHash: true, joinedAt: true },
  });
  const valid = await verifyPassword(password, user?.passwordHash || null);
  if (!valid || !user?.joinedAt)
    throw new HttpError(401, "用户名或密码不正确。");
  await prisma.authSession.create({
    data: { userId: user.id, ...sessionData(token) },
  });
  const { passwordHash: _password, joinedAt: _joined, ...safeUser } = user;
  return safeUser;
}
