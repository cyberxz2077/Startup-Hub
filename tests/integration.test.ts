import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key: string, value: string) => jar.set(key, value),
  }),
}));
import { prisma } from "../src/lib/db";
import { admitMember } from "../src/lib/email-auth";
import {
  getSession,
  logout,
  newSessionToken,
  sessionCookie,
} from "../src/lib/auth";
import { hashToken, rateLimit } from "../src/lib/rate-limit";
import {
  GET as projectsGet,
  POST as projectsPost,
} from "../src/app/api/projects/route";
import { GET as servicesGet } from "../src/app/api/services/route";
import { GET as inboxGet, POST as inboxPost } from "../src/app/api/inbox/route";
import { POST as matchPost } from "../src/app/api/match/route";
import { initialProjectData } from "../src/types";

const run = randomUUID();
const request = (path: string, body?: unknown) =>
  new Request(
    `http://localhost:3100${path}`,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: {
            Origin: "http://localhost:3100",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        },
  );
async function invitation(code: string, email?: string, expired = false) {
  return prisma.invitation.create({
    data: {
      codeHash: hashToken(code),
      email,
      expiresAt: new Date(Date.now() + (expired ? -1000 : 86400000)),
    },
  });
}
async function member(label: string) {
  const email = `${run}-${label}@example.test`;
  const code = randomUUID();
  const token = newSessionToken();
  await invitation(code, email);
  const user = await admitMember(
    { email, authUserId: randomUUID() },
    code,
    token,
  );
  return { user, token };
}

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "isolated PostgreSQL integration",
  () => {
    let alice: Awaited<ReturnType<typeof member>>;
    let bob: Awaited<ReturnType<typeof member>>;
    let charlie: Awaited<ReturnType<typeof member>>;
    beforeAll(async () => {
      vi.stubEnv("APP_URL", "http://localhost:3100");
      alice = await member("alice");
      bob = await member("bob");
      charlie = await member("charlie");
    }, 20000);
    afterAll(async () => {
      vi.unstubAllEnvs();
      await prisma.$disconnect();
    });
    it("rejects reused, expired and email-mismatched invitations", async () => {
      const code = randomUUID();
      await invitation(code);
      await admitMember(
        { email: `${run}-used@example.test`, authUserId: randomUUID() },
        code,
        newSessionToken(),
      );
      await expect(
        admitMember(
          { email: `${run}-reuse@example.test`, authUserId: randomUUID() },
          code,
          newSessionToken(),
        ),
      ).rejects.toMatchObject({ status: 403 });
      const expired = randomUUID();
      await invitation(expired, undefined, true);
      await expect(
        admitMember(
          { email: `${run}-expired@example.test`, authUserId: randomUUID() },
          expired,
          newSessionToken(),
        ),
      ).rejects.toMatchObject({ status: 403 });
      const bound = randomUUID();
      await invitation(bound, "someone-else@example.test");
      await expect(
        admitMember(
          { email: `${run}-wrong@example.test`, authUserId: randomUUID() },
          bound,
          newSessionToken(),
        ),
      ).rejects.toMatchObject({ status: 403 });
    });
    it("atomically admits only one member when an invite is raced", async () => {
      const code = randomUUID();
      await invitation(code);
      const results = await Promise.allSettled(
        ["a", "b"].map((label) =>
          admitMember(
            {
              email: `${run}-race-${label}@example.test`,
              authUserId: randomUUID(),
            },
            code,
            newSessionToken(),
          ),
        ),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const invite = await prisma.invitation.findUniqueOrThrow({
        where: { codeHash: hashToken(code) },
      });
      expect(invite.usedAt).not.toBeNull();
      expect(invite.usedBy).not.toBeNull();
    });
    it("ignores the old unsigned user_id cookie and respects session revocation", async () => {
      jar.clear();
      jar.set("user_id", alice.user.id);
      expect(await getSession()).toBeNull();
      jar.set(sessionCookie(), alice.token);
      expect((await getSession())?.id).toBe(alice.user.id);
      const temp = await member("logout");
      jar.set(sessionCookie(), temp.token);
      await logout();
      jar.set(sessionCookie(), temp.token);
      expect(await getSession()).toBeNull();
    });
    it("never creates fake data on GET", async () => {
      jar.set(sessionCookie(), alice.token);
      const before = [
        await prisma.project.count(),
        await prisma.serviceProvider.count(),
        await prisma.conversation.count(),
      ];
      await projectsGet(request("/api/projects"));
      await servicesGet();
      await inboxGet(request("/api/inbox"));
      expect([
        await prisma.project.count(),
        await prisma.serviceProvider.count(),
        await prisma.conversation.count(),
      ]).toEqual(before);
    });
    it("checks project ownership for edits and matching, and hides drafts", async () => {
      jar.set(sessionCookie(), alice.token);
      const created = await projectsPost(
        request("/api/projects", {
          ...initialProjectData,
          name: `private-${run}`,
          published: false,
        }),
      );
      expect(created.status).toBe(201);
      const { projectId } = await created.json();
      const publicRows = await (
        await projectsGet(request("/api/projects"))
      ).json();
      expect(publicRows.some((p: { id: string }) => p.id === projectId)).toBe(
        false,
      );
      jar.set(sessionCookie(), bob.token);
      expect(
        (
          await projectsPost(
            request("/api/projects", {
              ...initialProjectData,
              id: projectId,
              name: "takeover",
              published: false,
            }),
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await matchPost(
            request("/api/match", { type: "project", id: projectId }),
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await matchPost(
            request("/api/match", { type: "profile", id: alice.user.id }),
          )
        ).status,
      ).toBe(403);
      const mine = await (
        await projectsGet(request("/api/projects?mine=true"))
      ).json();
      expect(
        mine.every((p: { ownerId: string }) => p.ownerId === bob.user.id),
      ).toBe(true);
    });
    it("delivers both ways, rejects outsiders, and makes repeated sends idempotent", async () => {
      await prisma.profile.create({
        data: { userId: bob.user.id, published: true, title: "Builder" },
      });
      jar.set(sessionCookie(), alice.token);
      const body = {
        targetType: "user",
        targetId: bob.user.id,
        content: "你好，一起做点什么？",
        requestId: randomUUID(),
      };
      const sent = await inboxPost(request("/api/inbox", body));
      expect(sent.status).toBe(201);
      const { conversationId } = await sent.json();
      expect((await inboxPost(request("/api/inbox", body))).status).toBe(200);
      expect(
        await prisma.directMessage.count({ where: { conversationId } }),
      ).toBe(1);
      jar.set(sessionCookie(), bob.token);
      const inbox = await (await inboxGet(request("/api/inbox"))).json();
      expect(inbox.some((c: { id: string }) => c.id === conversationId)).toBe(
        true,
      );
      expect(
        (
          await inboxPost(
            request("/api/inbox", {
              conversationId,
              content: "可以，聊聊具体想法。",
              requestId: randomUUID(),
            }),
          )
        ).status,
      ).toBe(201);
      jar.set(sessionCookie(), alice.token);
      const details = await (
        await inboxGet(request(`/api/inbox?conversation=${conversationId}`))
      ).json();
      expect(
        details.messages.map((m: { senderId: string }) => m.senderId),
      ).toEqual([alice.user.id, bob.user.id]);
      jar.set(sessionCookie(), charlie.token);
      expect(
        (await inboxGet(request(`/api/inbox?conversation=${conversationId}`)))
          .status,
      ).toBe(404);
      expect(
        (
          await inboxPost(
            request("/api/inbox", {
              conversationId,
              content: "intruder",
              requestId: randomUUID(),
            }),
          )
        ).status,
      ).toBe(404);
    });
    it("shares atomic rate limits across concurrent requests", async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 5 }, () => rateLimit(`test:${run}`, 2, 60)),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(3);
    });
    it("revokes Data API grants even if an old permissive RLS policy exists", async () => {
      await prisma.$executeRawUnsafe(
        "DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF; END $$;",
      );
      await prisma.$executeRawUnsafe("GRANT USAGE ON SCHEMA public TO anon");
      await prisma.$executeRawUnsafe("GRANT SELECT ON public.users TO anon");
      const policyName = `qa_policy_${run.replaceAll("-", "")}`;
      await prisma.$executeRawUnsafe(
        `CREATE POLICY "${policyName}" ON public.users FOR SELECT TO anon USING (true)`,
      );
      await prisma.$executeRawUnsafe(
        readFileSync(
          new URL(
            "../prisma/migrations/20261023020000_data_api_boundary/migration.sql",
            import.meta.url,
          ),
          "utf8",
        ),
      );
      const result = await prisma.$queryRaw<
        { allowed: boolean }[]
      >`SELECT has_table_privilege('anon', 'public.users', 'SELECT') AS allowed`;
      expect(result[0].allowed).toBe(false);
    });
    it("rejects anonymous AI/matching and mutations", async () => {
      jar.clear();
      expect(
        (
          await matchPost(
            request("/api/match", { type: "profile", id: "current" }),
          )
        ).status,
      ).toBe(401);
      expect(
        (
          await projectsPost(
            request("/api/projects", {
              ...initialProjectData,
              name: "anonymous",
            }),
          )
        ).status,
      ).toBe(401);
    });
  },
);
