import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// OWASP scrypt configuration: 32 MiB, N=2^15, r=8, p=3.
const parameters = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const prefix = "scrypt$32768$8$3";
const dummy = `${prefix}$${"00".repeat(16)}$${"00".repeat(64)}`;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, parameters, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `${prefix}$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, hash: string | null) {
  const valid =
    !!hash && /^scrypt\$32768\$8\$3\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(hash);
  const parts = (valid ? hash! : dummy).split("$");
  // Missing users and malformed stored hashes do the same expensive work.
  const actual = await derive(password, Buffer.from(parts[4], "hex"));
  const equal = timingSafeEqual(actual, Buffer.from(parts[5], "hex"));
  return valid && equal;
}
