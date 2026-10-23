import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
const db = process.env.TEST_DATABASE_URL;
if (
  db &&
  (!["localhost", "127.0.0.1"].includes(new URL(db).hostname) ||
    new URL(db).pathname !== "/startup_hub_test")
)
  throw new Error(
    "Integration tests require the isolated local startup_hub_test database.",
  );
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(
        new URL("./tests/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    env: db ? { DATABASE_URL: db, DIRECT_URL: db } : {},
    include: ["tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
