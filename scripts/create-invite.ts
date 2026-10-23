import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
nextEnv.loadEnvConfig(process.cwd(), true);
const args = process.argv.slice(2);
const index = args.indexOf("--email");
const email =
  index >= 0
    ? z
        .string()
        .email()
        .parse(args[index + 1])
        .trim()
        .toLowerCase()
    : undefined;
if (!process.env.DATABASE_URL) {
  console.error("请先填写 .env.local 中的 DATABASE_URL。");
  process.exit(1);
}
const prisma = new PrismaClient();
try {
  const code = `HUB-${randomBytes(18).toString("base64url")}`;
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await prisma.invitation.create({
    data: {
      codeHash: createHash("sha256").update(code).digest("hex"),
      email,
      expiresAt,
    },
  });
  console.log(
    `单次邀请码：${code}\n有效期至：${expiresAt.toISOString()}\n绑定邮箱：${email || "不绑定"}\n数据库仅存哈希，请自行把邀请码交给受邀人。`,
  );
} catch {
  console.error("邀请码创建失败，请确认数据库已迁移且连接正常。");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
