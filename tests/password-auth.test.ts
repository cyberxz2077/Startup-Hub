import { randomUUID } from "node:crypto";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key: string, value: string) => jar.set(key, value),
  }),
}));
import { hashPassword, verifyPassword } from "../src/lib/password";
import {
  checkRegistrationInvite,
  registerMember,
} from "../src/lib/password-auth";
import { usernameSchema, passwordSchema } from "../src/lib/validation";
import { prisma } from "../src/lib/db";
import { newSessionToken, sessionCookie, getSession } from "../src/lib/auth";
import { POST as register } from "../src/app/api/auth/register/route";
import { POST as login } from "../src/app/api/auth/login/route";
import { POST as oldVerify } from "../src/app/api/auth/verify/route";
import { POST as message } from "../src/app/api/inbox/route";
import { POST as profile } from "../src/app/api/profiles/route";
import { initialProfileData } from "../src/types";

describe("password and registration boundaries", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("uses salted, slow password hashes and rejects wrong or missing hashes", async () => {
    const password = "a long QA-only passphrase";
    const [a, b] = await Promise.all([
      hashPassword(password),
      hashPassword(password),
    ]);
    expect(a).not.toBe(b);
    expect(a).not.toContain(password);
    expect(await verifyPassword(password, a)).toBe(true);
    expect(await verifyPassword("wrong", a)).toBe(false);
    expect(await verifyPassword(password, null)).toBe(false);
    expect(await verifyPassword(password, "malformed")).toBe(false);
  });
  it("normalizes usernames and bounds password inputs without trimming passwords", () => {
    expect(usernameSchema.parse(" Ｂｕｉｌｄｅｒ ")).toBe("builder");
    expect(usernameSchema.parse("一泽_2077")).toBe("一泽_2077");
    expect(usernameSchema.safeParse("../admin").success).toBe(false);
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false);
    expect(passwordSchema.parse(" password with spaces ")).toBe(
      " password with spaces ",
    );
  });
  it("requires the configured invite and supports rotation / disabling", () => {
    vi.stubEnv("REGISTRATION_INVITE_CODE", "2077");
    expect(() => checkRegistrationInvite("2077")).not.toThrow();
    expect(() => checkRegistrationInvite("wrong")).toThrow();
    vi.stubEnv("REGISTRATION_INVITE_CODE", "rotated");
    expect(() => checkRegistrationInvite("2077")).toThrow();
    vi.stubEnv("REGISTRATION_INVITE_CODE", "");
    expect(() => checkRegistrationInvite("2077")).toThrow();
  });
  it("retires the email OTP endpoint", async () => {
    expect((await oldVerify()).status).toBe(410);
  });
});

const run = randomUUID().slice(0, 8);
const password = "a long QA-only passphrase";
const request = (path: string, data: unknown) =>
  new Request(`http://localhost:3100${path}`, {
    method: "POST",
    headers: {
      Origin: "http://localhost:3100",
      "Content-Type": "application/json",
      "x-vercel-forwarded-for": `2001:db8:${run.slice(0, 4)}:${run.slice(4)}::1`,
    },
    body: JSON.stringify(data),
  });

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "password account integration",
  () => {
    beforeAll(() => {
      vi.stubEnv("APP_URL", "http://localhost:3100");
      vi.stubEnv("REGISTRATION_INVITE_CODE", "2077");
      // Keep repeat runs independent without resetting the preserved test DB.
      vi.stubEnv("VERCEL", "1");
    });
    afterAll(async () => {
      vi.unstubAllEnvs();
      await prisma.$disconnect();
    });
    it("reuses the common invite for distinct accounts and stores no fake verified email", async () => {
      const users = await Promise.all(
        ["a", "b"].map((name) =>
          registerMember(
            `pw-${run}-${name}`,
            password,
            "2077",
            newSessionToken(),
          ),
        ),
      );
      expect(users[0].id).not.toBe(users[1].id);
      const stored = await prisma.user.findUniqueOrThrow({
        where: { id: users[0].id },
      });
      expect(stored.emailVerifiedAt).toBeNull();
      expect(stored.email).toBeNull();
      expect(stored.joinedAt).toBeInstanceOf(Date);
      expect(stored.passwordHash).not.toBe(password);
      expect(users[0]).not.toHaveProperty("passwordHash");
    });
    it("rejects invalid invites without creating an account or session", async () => {
      const username = `pw-${run}-invalid`;
      await expect(
        registerMember(username, password, "bad", newSessionToken()),
      ).rejects.toMatchObject({ status: 403 });
      expect(await prisma.user.findUnique({ where: { username } })).toBeNull();
    });
    it("atomically rejects duplicate username races", async () => {
      const results = await Promise.allSettled(
        [1, 2].map(() =>
          registerMember(`pw-${run}-race`, password, "2077", newSessionToken()),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.filter((r) => r.status === "rejected")[0]).toMatchObject({
        reason: { status: 409 },
      });
    });
    it("registers and logs in through the routes, rotating sessions and hiding password hashes", async () => {
      jar.clear();
      const username = `pw-${run}-route`;
      const response = await register(
        request("/api/auth/register", {
          username: username.toUpperCase(),
          password,
          inviteCode: "2077",
        }),
      );
      expect(response.status).toBe(201);
      const payload = await response.json();
      expect(payload.user.username).toBe(username);
      expect(JSON.stringify(payload)).not.toMatch(/password|scrypt/);
      const firstToken = jar.get(sessionCookie())!;
      expect((await getSession())?.username).toBe(username);
      expect(
        (
          await login(
            request("/api/auth/login", { username, password: "wrong" }),
          )
        ).status,
      ).toBe(401);
      expect(
        (await login(request("/api/auth/login", { username, password })))
          .status,
      ).toBe(200);
      expect(jar.get(sessionCookie())).not.toBe(firstToken);
      const currentToken = jar.get(sessionCookie())!;
      jar.set(sessionCookie(), firstToken);
      expect(await getSession()).toBeNull();
      jar.set(sessionCookie(), currentToken);
      const profileResponse = await profile(
        request("/api/profiles", {
          ...initialProfileData,
          name: "新的昵称",
          title: "建设者",
          lookingFor: "一起做产品",
          published: true,
        }),
      );
      expect(profileResponse.status).toBe(200);
      expect((await getSession())?.username).toBe(username);
    });
    it("allows invited password members to receive messages without claiming email verification", async () => {
      const target = await prisma.user.findUniqueOrThrow({
        where: { username: `pw-${run}-route` },
      });
      const token = newSessionToken();
      await registerMember(`pw-${run}-sender`, password, "2077", token);
      jar.set(sessionCookie(), token);
      const response = await message(
        request("/api/inbox", {
          targetType: "user",
          targetId: target.id,
          content: "本地邀请账号消息验收",
          requestId: randomUUID(),
        }),
      );
      expect(response.status).toBe(201);
    });
  },
);
