import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, json, readJson, sameOrigin, HttpError } from "@/lib/http";
import { projectSchema, stringList, textValue } from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { publicProjectOwnerSelect } from "@/lib/public-profiles";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const mine = params.get("mine") === "true";
    const user = mine ? await requireSession() : null;
    const projects = await prisma.project.findMany({
      where: mine ? { ownerId: user!.id } : { published: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { owner: { select: publicProjectOwnerSelect } },
    });
    return json(
      projects.map((p) => ({
        ...p,
        owner: {
          name: p.owner.name,
          avatar: p.owner.avatar,
          profilePublished: !!p.owner.profile?.published,
        },
        talentNeeds: stringList(p.talentNeeds),
        others: textValue(p.others),
      })),
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireSession();
    const { id, published, ...data } = await readJson(
      request,
      projectSchema
        .extend({
          id: z.string().cuid().optional(),
          published: z.boolean().default(false),
        })
        .strict(),
      256000,
    );
    if (!data.name.trim()) throw new HttpError(400, "请先填写项目名称。");
    if (published && (!data.oneLiner.trim() || !data.vision.trim()))
      throw new HttpError(400, "发布前请填写一句话介绍和项目愿景。");
    await rateLimit(`save:${user.id}`, 60, 600);
    if (id) {
      const result = await prisma.project.updateMany({
        where: { id, ownerId: user.id },
        data: { ...data, published },
      });
      if (!result.count) throw new HttpError(404, "找不到可编辑的项目。");
      return json({ success: true, projectId: id });
    }
    const project = await prisma.project.create({
      data: { ...data, ownerId: user.id, published },
    });
    return json({ success: true, projectId: project.id }, 201);
  } catch (error) {
    return apiError(error);
  }
}
