import "server-only";
import { createClient } from "@supabase/supabase-js";
import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./http";
import { hashToken } from "./rate-limit";
import { publicUser, sessionDuration } from "./auth";

function authClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new HttpError(503, "邮箱登录暂未开放，请稍后再来。");
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (url, init) =>
        fetch(url, { ...init, signal: AbortSignal.timeout(15000) }),
    },
  });
}

export async function validInvitation(email: string, code: string) {
  if (!code) return null;
  return prisma.invitation.findFirst({
    where: {
      codeHash: hashToken(code),
      usedAt: null,
      expiresAt: { gt: new Date() },
      OR: [{ email: null }, { email }],
    },
  });
}

export async function sendEmailCode(email: string, inviteCode: string) {
  const client = authClient();
  const member = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!member && !(await validInvitation(email, inviteCode)))
    throw new HttpError(403, "首次加入需要有效的邀请码，请检查邮箱和邀请码。");
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error)
    throw new HttpError(
      error.status === 429 ? 429 : 503,
      error.status === 429
        ? "验证码发送过于频繁，请稍后再试。"
        : "验证码暂时发送失败，请稍后重试。",
    );
}

export async function verifyEmailCode(email: string, token: string) {
  const { data, error } = await authClient().auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (
    error ||
    !data.user?.email_confirmed_at ||
    data.user.email?.toLowerCase() !== email
  )
    throw new HttpError(400, "验证码错误或已过期，请重新获取。");
  return { email, authUserId: data.user.id };
}

// Invitation claim, membership and app session commit together. A Supabase identity
// alone never grants membership. Legacy accounts are not guessed/linked by name.
export async function admitMember(
  identity: { email: string; authUserId: string },
  inviteCode: string,
  token: string,
) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          let user = await tx.user.findUnique({
            where: { email: identity.email },
            select: { ...publicUser, authUserId: true },
          });
          if (user && user.authUserId !== identity.authUserId)
            throw new HttpError(403, "账号关联需要管理员处理。");
          if (!user) {
            const invitation = await tx.invitation.findFirst({
              where: {
                codeHash: hashToken(inviteCode),
                usedAt: null,
                expiresAt: { gt: new Date() },
                OR: [{ email: null }, { email: identity.email }],
              },
            });
            if (!invitation)
              throw new HttpError(403, "邀请码无效、已使用或已过期。");
            const claim = await tx.invitation.updateMany({
              where: {
                id: invitation.id,
                usedAt: null,
                expiresAt: { gt: new Date() },
              },
              data: { usedAt: new Date() },
            });
            if (claim.count !== 1) throw new HttpError(409, "邀请码已被使用。");
            user = await tx.user.create({
              data: { ...identity, emailVerifiedAt: new Date() },
              select: { ...publicUser, authUserId: true },
            });
            await tx.invitation.update({
              where: { id: invitation.id },
              data: { usedBy: user.id },
            });
          }
          await tx.authSession.create({
            data: {
              tokenHash: hashToken(token),
              userId: user.id,
              expiresAt: new Date(Date.now() + sessionDuration * 1000),
            },
          });
          const { authUserId: _authUserId, ...safeUser } = user;
          return safeUser;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code) &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
  throw new HttpError(409, "注册冲突，请重新获取验证码。");
}
