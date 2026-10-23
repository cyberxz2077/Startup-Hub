import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, memberWhere } from "@/lib/auth";
import { apiError, json, readJson, sameOrigin, HttpError } from "@/lib/http";
import { rateLimit } from "@/lib/rate-limit";
import { generateMatchScore } from "@/lib/deepseek";

export const maxDuration = 60;
const projectFields = {
  name: true,
  oneLiner: true,
  sector: true,
  location: true,
  stage: true,
  vision: true,
  problem: true,
  solution: true,
  talentNeeds: true,
  productHighlights: true,
  teamMembers: true,
} as const;
const profileFields = {
  title: true,
  location: true,
  skills: true,
  experienceHighlights: true,
  education: true,
  lookingFor: true,
  superpower: true,
} as const;

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireSession();
    const { type, id } = await readJson(
      request,
      z
        .object({
          type: z.enum(["project", "profile"]),
          id: z.string().max(100),
        })
        .strict(),
    );
    if (type === "profile" && !["current", user.id].includes(id))
      throw new HttpError(403, "只能为自己的档案发起匹配。");
    const source =
      type === "project"
        ? await prisma.project.findFirst({
            where: { id, ownerId: user.id },
            select: projectFields,
          })
        : await prisma.profile.findUnique({
            where: { userId: user.id },
            select: profileFields,
          });
    if (!source) throw new HttpError(404, "请先保存自己的项目或个人档案。");
    await rateLimit(`match:${user.id}`, 5, 600);
    await rateLimit(`match:daily:${user.id}`, 20, 86400);
    await rateLimit("match:global", 300, 86400);
    const candidates =
      type === "project"
        ? (
            await prisma.profile.findMany({
              where: {
                published: true,
                userId: { not: user.id },
                user: memberWhere,
              },
              take: 3,
              orderBy: { updatedAt: "desc" },
              select: {
                ...profileFields,
                userId: true,
                user: { select: { name: true } },
              },
            })
          ).map((p) => ({
            targetId: p.userId,
            targetType: "user" as const,
            name: p.user.name || "社区成员",
            label: p.title || "",
            evidence: Object.fromEntries(
              Object.keys(profileFields).map((k) => [
                k,
                p[k as keyof typeof profileFields],
              ]),
            ),
          }))
        : (
            await prisma.project.findMany({
              where: {
                published: true,
                ownerId: { not: user.id },
                owner: memberWhere,
              },
              take: 3,
              orderBy: { updatedAt: "desc" },
              select: { ...projectFields, id: true },
            })
          ).map((p) => ({
            targetId: p.id,
            targetType: "project" as const,
            name: p.name,
            label: p.sector || "",
            evidence: Object.fromEntries(
              Object.keys(projectFields).map((k) => [
                k,
                p[k as keyof typeof projectFields],
              ]),
            ),
          }));
    const matches = await Promise.all(
      candidates.map(async (c) => {
        const score = await generateMatchScore(
          source,
          c.evidence,
          type === "project" ? "project_to_talent" : "talent_to_project",
          request.signal,
        );
        return {
          targetId: c.targetId,
          targetType: c.targetType,
          name: c.name,
          label: c.label,
          ...score,
        };
      }),
    );
    await prisma.$transaction(
      matches.map((m) =>
        prisma.matchingResult.upsert({
          where: {
            projectId_userId: {
              projectId: type === "project" ? id : m.targetId,
              userId: type === "project" ? m.targetId : user.id,
            },
          },
          create: {
            projectId: type === "project" ? id : m.targetId,
            userId: type === "project" ? m.targetId : user.id,
            score: m.score,
            reason: m.reason,
            status: "calculated",
          },
          update: { score: m.score, reason: m.reason },
        }),
      ),
    );
    return json({
      matches: matches.sort((a, b) => b.score - a.score),
      scope: "从最近更新的最多 3 份公开资料中比较；分数表示资料契合度。",
    });
  } catch (error) {
    return apiError(error);
  }
}
