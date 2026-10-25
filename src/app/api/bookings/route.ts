import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { apiError, json, readJson, sameOrigin, HttpError } from "@/lib/http";
import {
  bookingInclude,
  createBooking,
  createBookingSchema,
  participantWhere,
} from "@/lib/scheduling";
import { rateLimit } from "@/lib/rate-limit";
export async function GET(request: Request) {
  try {
    const user = await requireSession();
    const raw = new URL(request.url).searchParams.get("conversation");
    const conversationId = z
      .string()
      .cuid()
      .optional()
      .parse(raw || undefined);
    if (
      conversationId &&
      !(await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [{ starterId: user.id }, { recipientId: user.id }],
        },
        select: { id: true },
      }))
    )
      throw new HttpError(404, "会话不存在。");
    return json(
      await prisma.booking.findMany({
        where: { ...participantWhere(user.id), conversationId },
        include: bookingInclude,
        orderBy: { startsAt: "desc" },
        take: 500,
      }),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await requireSession();
    const data = await readJson(request, createBookingSchema);
    await rateLimit(`booking:${user.id}`, 30, 600);
    return json(await createBooking(user.id, data), 201);
  } catch (error) {
    return apiError(error);
  }
}
