import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key: string, value: string) => jar.set(key, value),
  }),
}));
import { prisma } from "../src/lib/db";
import { hashToken } from "../src/lib/rate-limit";
import { newSessionToken, sessionCookie } from "../src/lib/auth";
import { GET as peopleGet } from "../src/app/api/people/route";
import { GET as personGet } from "../src/app/api/people/[id]/route";
import { GET as projectGet } from "../src/app/api/projects/[id]/route";
import {
  GET as profileGet,
  POST as profilePost,
} from "../src/app/api/profiles/route";
import {
  initialProfileData,
  initialProjectData,
  type PublicProfile,
} from "../src/types";

const run = randomUUID();
const request = (body?: unknown) =>
  new Request(
    "http://localhost:3100/api/profiles",
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
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const personal = {
  ...initialProfileData,
  name: "测试设计师",
  title: "产品设计师",
  bio: "用户研究与界面设计",
  skills: ["用户研究", "界面设计"],
  lookingFor: "和早期团队按项目合作",
  experienceHighlights: "本地验证资料",
};

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "public people and project discovery",
  () => {
    let alice: { id: string };
    let bob: { id: string };
    let legacy: { id: string };
    let token: string;
    let publicProject: { id: string };
    let privateProject: { id: string };
    let bobProject: { id: string };
    beforeAll(async () => {
      vi.stubEnv("APP_URL", "http://localhost:3100");
      alice = await prisma.user.create({
        data: {
          name: personal.name,
          bio: personal.bio,
          email: `${run}-private-email@example.test`,
          username: `qa-${run}`,
          passwordHash: "private-password-sentinel",
          accessToken: "private-oauth-sentinel",
          joinedAt: new Date(),
          profile: {
            create: {
              title: personal.title,
              skills: personal.skills,
              lookingFor: personal.lookingFor,
              published: true,
            },
          },
        },
      });
      bob = await prisma.user.create({
        data: {
          name: "私密档案用户",
          joinedAt: new Date(),
          profile: {
            create: { published: false, title: "private-profile-sentinel" },
          },
        },
      });
      legacy = await prisma.user.create({
        data: {
          name: "历史未入会账户",
          profile: { create: { published: true } },
        },
      });
      publicProject = await prisma.project.create({
        data: {
          ...initialProjectData,
          ownerId: alice.id,
          name: "公开设计项目",
          oneLiner: "一起改善产品体验",
          vision: "让产品更好用",
          published: true,
        },
      });
      privateProject = await prisma.project.create({
        data: {
          ...initialProjectData,
          ownerId: alice.id,
          name: "private-project-sentinel",
          published: false,
        },
      });
      bobProject = await prisma.project.create({
        data: {
          ...initialProjectData,
          ownerId: bob.id,
          name: "先建立的公开项目",
          published: true,
        },
      });
      token = newSessionToken();
      await prisma.authSession.create({
        data: {
          tokenHash: hashToken(token),
          userId: alice.id,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
    });
    afterAll(async () => {
      vi.unstubAllEnvs();
      await prisma.$disconnect();
    });

    it("lets guests discover published members without changing any records", async () => {
      jar.clear();
      const before = [
        await prisma.profile.count(),
        await prisma.project.count(),
      ];
      const response = await peopleGet();
      expect(response.status).toBe(200);
      const rows: PublicProfile[] = await response.json();
      expect(rows.some((row) => row.userId === alice.id)).toBe(true);
      expect(rows.some((row) => [bob.id, legacy.id].includes(row.userId))).toBe(
        false,
      );
      expect([
        await prisma.profile.count(),
        await prisma.project.count(),
      ]).toEqual(before);
      expect((await profileGet()).status).toBe(401);
    });

    it("exposes only an allowlisted public profile and its published projects", async () => {
      const response = await personGet(request(), params(alice.id));
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      const data: PublicProfile = await response.json();
      expect(data).toMatchObject({
        userId: alice.id,
        name: personal.name,
        skills: personal.skills,
        projectCount: 1,
      });
      expect(data.projects.map((project) => project.id)).toEqual([
        publicProject.id,
      ]);
      const raw = JSON.stringify(data);
      for (const hidden of [
        "private-email",
        "private-password-sentinel",
        "private-oauth-sentinel",
        "private-project-sentinel",
        privateProject.id,
        "passwordHash",
        "authUserId",
        "username",
        "tokenHash",
      ])
        expect(raw).not.toContain(hidden);
      expect(data).not.toHaveProperty("user");
    });

    it("links a published project to its published owner profile", async () => {
      const response = await projectGet(request(), params(publicProject.id));
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toMatchObject({
        ownerId: alice.id,
        owner: { name: personal.name, profilePublished: true },
      });
      expect(Object.keys(data.owner).sort()).toEqual([
        "avatar",
        "name",
        "profilePublished",
      ]);
      expect((await personGet(request(), params(data.ownerId))).status).toBe(
        200,
      );
    });

    it("does not reveal private profiles or projects through direct links", async () => {
      for (const id of [bob.id, legacy.id, "not-a-member"])
        expect((await personGet(request(), params(id))).status).toBe(404);
      expect(
        (await projectGet(request(), params(privateProject.id))).status,
      ).toBe(404);
      jar.set(sessionCookie(), token);
      expect(
        (await projectGet(request(), params(privateProject.id))).status,
      ).toBe(404);
      const owner = await (
        await projectGet(request(), params(bobProject.id))
      ).json();
      expect(owner.owner.profilePublished).toBe(false);
    });

    it("withdraws the profile from both the directory and project link without hiding its public project", async () => {
      jar.set(sessionCookie(), token);
      expect(
        (await profilePost(request({ ...personal, published: false }))).status,
      ).toBe(200);
      expect((await personGet(request(), params(alice.id))).status).toBe(404);
      const rows: PublicProfile[] = await (await peopleGet()).json();
      expect(rows.some((row) => row.userId === alice.id)).toBe(false);
      const project = await (
        await projectGet(request(), params(publicProject.id))
      ).json();
      expect(project.owner.profilePublished).toBe(false);
      expect(project.id).toBe(publicProject.id);
      expect(
        (await profilePost(request({ ...personal, published: true }))).status,
      ).toBe(200);
      expect((await personGet(request(), params(alice.id))).status).toBe(200);
    });

    it("connects an existing project when its owner later publishes a personal profile", async () => {
      const secondToken = newSessionToken();
      await prisma.authSession.create({
        data: {
          tokenHash: hashToken(secondToken),
          userId: bob.id,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      jar.set(sessionCookie(), secondToken);
      expect(
        (
          await profilePost(
            request({ ...personal, name: "先项目后档案", published: true }),
          )
        ).status,
      ).toBe(200);
      const profile: PublicProfile = await (
        await personGet(request(), params(bob.id))
      ).json();
      expect(profile.projects.map((project) => project.id)).toEqual([
        bobProject.id,
      ]);
      expect(profile.projectCount).toBe(1);
      const project = await (
        await projectGet(request(), params(bobProject.id))
      ).json();
      expect(project.owner).toMatchObject({
        name: "先项目后档案",
        profilePublished: true,
      });
      expect(project.ownerId).toBe(profile.userId);
    });
  },
);
