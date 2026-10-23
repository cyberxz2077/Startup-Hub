import nextEnv from "@next/env";
import { spawnSync } from "node:child_process";
nextEnv.loadEnvConfig(process.cwd(), true);
if (!process.env.DIRECT_URL || !process.env.DATABASE_URL) {
  console.error(
    "请先在 .env.local 填写 DATABASE_URL 和 DIRECT_URL，并阅读 docs/重新上线.md。",
  );
  process.exit(1);
}
const result = spawnSync(
  process.execPath,
  ["node_modules/prisma/build/index.js", "migrate", "deploy"],
  { stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
