import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession, memberWhere } from "@/lib/auth";
import { apiError, json, readJson, sameOrigin, HttpError } from "@/lib/http";
import { hashToken, rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const params = new URL(request.url).searchParams;
    const id = params.get("conversation");
    const memberWhere = {
      OR: [{ starterId: user.id }, { recipientId: user.id }],
    };
    if (id) {
      const conversation = await prisma.conversation.findFirst({
        where: { id, ...memberWhere },
      });
      if (!conversation) throw new HttpError(404, "会话不存在。");
      const before = params.get("before");
      if (
        before &&
        !(await prisma.directMessage.findFirst({
          where: { id: before, conversationId: id },
        }))
      )
        throw new HttpError(400, "分页位置无效。");
      const messages = await prisma.directMessage.findMany({
        where: { conversationId: id },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 51,
        ...(before ? { cursor: { id: before }, skip: 1 } : {}),
      });
      return json({
        messages: messages.slice(0, 50).reverse(),
        nextCursor: messages.length > 50 ? messages[49].id : null,
      });
    }
    const conversations = await prisma.conversation.findMany({
      where: memberWhere,
      take: 100,
      orderBy: { updatedAt: "desc" },
      include: {
        starter: { select: { id: true, name: true } },
        recipient: { select: { id: true, name: true } },
        messages: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
    return json(
      conversations.map((c) => ({
        id: c.id,
        person: c.starterId === user.id ? c.recipient : c.starter,
        lastMessage: c.messages[0]?.content || "",
        updatedAt: c.updatedAt,
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
    const data = await readJson(
      request,
      z
        .object({
          conversationId: z.string().cuid().optional(),
          targetId: z.string().cuid().optional(),
          targetType: z.enum(["user", "project"]).optional(),
          content: z.string().trim().min(1).max(4000),
          requestId: z.string().uuid(),
        })
        .strict(),
    );
    await rateLimit(`message:${user.id}`, 30, 600);
    let conversationId = data.conversationId;
    if (conversationId) {
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [{ starterId: user.id }, { recipientId: user.id }],
        },
      });
      if (!conversation) throw new HttpError(404, "会话不存在。");
    } else {
      if (!data.targetId || !data.targetType)
        throw new HttpError(400, "请选择联系对象。");
      const project =
        data.targetType === "project"
          ? await prisma.project.findFirst({
              where: { id: data.targetId, published: true },
              select: { ownerId: true, id: true },
            })
          : null;
      const target =
        data.targetType === "project"
          ? project &&
            (await prisma.user.findFirst({
              where: { id: project.ownerId, ...memberWhere },
              select: { id: true },
            }))
          : await prisma.user.findFirst({
              where: {
                id: data.targetId,
                ...memberWhere,
                profile: { published: true },
              },
              select: { id: true },
            });
      if (!target || target.id === user.id)
        throw new HttpError(400, "该对象暂时无法联系。");
      const threadKey = hashToken(
        [...[user.id, target.id].sort(), project?.id || "direct"].join(":"),
      );
      const conversation = await prisma.conversation.upsert({
        where: { threadKey },
        create: {
          threadKey,
          starterId: user.id,
          recipientId: target.id,
          projectId: project?.id,
        },
        update: {},
      });
      conversationId = conversation.id;
    }
    const existing = await prisma.directMessage.findUnique({
      where: {
        senderId_requestId: { senderId: user.id, requestId: data.requestId },
      },
    });
    if (existing) {
      if (
        existing.conversationId !== conversationId ||
        existing.content !== data.content
      )
        throw new HttpError(409, "请求标识已使用。");
      return json({ message: existing, conversationId });
    }
    const message = await prisma.$transaction(async (tx) => {
      const message = await tx.directMessage.create({
        data: {
          conversationId: conversationId!,
          senderId: user.id,
          content: data.content,
          requestId: data.requestId,
        },
      });
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
      return message;
    });
    return json({ message, conversationId }, 201);
  } catch (error) {
    return apiError(error);
  }
}
