import "server-only";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "./db";
import { HttpError } from "./http";
import {
  formatSlot,
  meetingLink,
  MINUTE,
  overlaps,
  scheduleBounds,
  scheduleDate,
} from "./schedule-time";
import type { BookingEvent } from "@/types/schedule";

type Tx = Prisma.TransactionClient;
export const meetingUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => meetingLink(v) !== null, "请填写有效的 HTTPS 会议链接。");
export const slotSchema = z
  .object({
    id: z.string().cuid().optional(),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
  })
  .strict();
export const preferenceSchema = z
  .object({
    enabled: z.boolean(),
    note: z.string().trim().max(600),
    meetingUrl: meetingUrlSchema,
    version: z.number().int().min(0),
    slots: z.array(slotSchema).max(120),
  })
  .strict();

const personSelect = {
  id: true,
  name: true,
  profile: { select: { title: true, published: true } },
} as const;
export const bookingInclude = {
  requester: { select: personSelect },
  host: { select: personSelect },
} as const;

export function participantWhere(userId: string) {
  return { OR: [{ requesterId: userId }, { hostId: userId }] };
}

export async function lockSchedules(tx: Tx, ids: string[]) {
  // Lock both participants in a stable order. This covers host slots, the
  // requester's other meetings, and concurrent availability edits.
  for (const id of [...new Set(ids)].sort())
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`schedule:${id}`}, 0))`;
}

export function validateSlot(startsAt: Date, endsAt: Date, now = new Date()) {
  const { min, max } = scheduleBounds(now);
  const date = scheduleDate(startsAt);
  const duration = (endsAt.getTime() - startsAt.getTime()) / MINUTE;
  if (
    !Number.isFinite(duration) ||
    startsAt <= now ||
    date < min ||
    date > max ||
    scheduleDate(endsAt) !== date ||
    duration < 15 ||
    duration > 120 ||
    duration % 15 !== 0 ||
    startsAt.getTime() % (15 * MINUTE) !== 0
  )
    throw new HttpError(
      400,
      "请设置未来30天内、同一天的15–120分钟时段，并以15分钟为间隔。",
    );
}

export async function ownSchedule(userId: string) {
  const [preference, slots, bookings] = await Promise.all([
    prisma.schedulePreference.findUnique({ where: { userId } }),
    prisma.availabilitySlot.findMany({
      where: { userId, active: true, startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.booking.findMany({
      where: participantWhere(userId),
      include: bookingInclude,
      orderBy: { startsAt: "desc" },
      take: 500,
    }),
  ]);
  return {
    settings: preference
      ? {
          enabled: preference.enabled,
          note: preference.note,
          meetingUrl: preference.meetingUrl,
          version: preference.version,
        }
      : { enabled: false, note: "", meetingUrl: "", version: 0 },
    slots: slots.map((slot) => ({
      ...slot,
      booked: bookings.some(
        (b) => b.status === "confirmed" && b.slotId === slot.id,
      ),
      available: !bookings.some(
        (b) => b.status === "confirmed" && overlaps(slot, b),
      ),
    })),
    bookings,
  };
}

export async function savePreferences(
  userId: string,
  data: z.infer<typeof preferenceSchema>,
) {
  return prisma.$transaction(
    async (tx) => {
      await lockSchedules(tx, [userId]);
      const existing = await tx.schedulePreference.findUnique({
        where: { userId },
      });
      if ((existing?.version || 0) !== data.version)
        throw new HttpError(409, "预约设置已在其他页面更新，请刷新后再保存。");
      const [previous, bookings] = await Promise.all([
        tx.availabilitySlot.findMany({
          where: { userId, active: true, startsAt: { gt: new Date() } },
        }),
        tx.booking.findMany({
          where: {
            ...participantWhere(userId),
            status: "confirmed",
            endsAt: { gt: new Date() },
          },
        }),
      ]);
      const slots = data.slots
        .map((s) => ({
          ...s,
          startsAt: new Date(s.startsAt),
          endsAt: new Date(s.endsAt),
        }))
        .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      for (let i = 0; i < slots.length; i++) {
        validateSlot(slots[i].startsAt, slots[i].endsAt);
        if (i && overlaps(slots[i - 1], slots[i]))
          throw new HttpError(400, "可用时段不能相互重叠。");
        if (slots[i].id && !previous.some((s) => s.id === slots[i].id))
          throw new HttpError(409, "部分时段已变化，请刷新后重试。");
      }
      for (const old of previous) {
        if (
          bookings.some((b) => b.slotId === old.id) &&
          !slots.some(
            (s) =>
              s.id === old.id &&
              s.startsAt.getTime() === old.startsAt.getTime() &&
              s.endsAt.getTime() === old.endsAt.getTime(),
          )
        )
          throw new HttpError(
            409,
            "该时段已有预约。请先在预约记录中告知对方需要改期。",
          );
      }
      const bounds = scheduleBounds();
      if (
        data.enabled &&
        !slots.some(
          (s) =>
            scheduleDate(s.startsAt) <= bounds.early &&
            !bookings.some((b) => overlaps(s, b)),
        )
      )
        throw new HttpError(
          400,
          "开放预约时，请至少提供未来三天内一个未被占用的可用时段。",
        );
      const intervals = slots.map((slot) => ({
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
      }));
      if (slots.length) {
        await tx.availabilitySlot.createMany({
          data: intervals.map((slot) => ({ userId, ...slot })),
          skipDuplicates: true,
        });
        await tx.availabilitySlot.updateMany({
          where: { userId, OR: intervals },
          data: { active: true },
        });
      }
      const keep = slots.length
        ? (
            await tx.availabilitySlot.findMany({
              where: { userId, OR: intervals },
              select: { id: true },
            })
          ).map((slot) => slot.id)
        : [];
      // Withdraw slots without deleting the records used by booking history.
      await tx.availabilitySlot.updateMany({
        where: { userId, active: true, id: { notIn: keep } },
        data: { active: false },
      });
      await tx.schedulePreference.upsert({
        where: { userId },
        create: {
          userId,
          enabled: data.enabled,
          note: data.note,
          meetingUrl: meetingLink(data.meetingUrl)!,
          version: 1,
        },
        update: {
          enabled: data.enabled,
          note: data.note,
          meetingUrl: meetingLink(data.meetingUrl)!,
          version: { increment: 1 },
        },
      });
    },
    { maxWait: 10000, timeout: 20000 },
  );
}

export async function availableTo(
  requesterId: string,
  hostId: string,
  excludeBookingId?: string,
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      OR: [
        { starterId: requesterId, recipientId: hostId },
        { starterId: hostId, recipientId: requesterId },
      ],
    },
    select: { id: true },
  });
  if (!conversation || requesterId === hostId)
    throw new HttpError(404, "请先通过站内消息与对方建立联系。");
  if (
    excludeBookingId &&
    !(await prisma.booking.findFirst({
      where: { id: excludeBookingId, requesterId, hostId },
      select: { id: true },
    }))
  )
    throw new HttpError(404, "预约不存在。");
  const [preference, slots, busy] = await Promise.all([
    prisma.schedulePreference.findUnique({ where: { userId: hostId } }),
    prisma.availabilitySlot.findMany({
      where: { userId: hostId, active: true, startsAt: { gt: new Date() } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.booking.findMany({
      where: {
        status: "confirmed",
        id: { not: excludeBookingId },
        OR: [
          ...participantWhere(requesterId).OR,
          ...participantWhere(hostId).OR,
        ],
      },
      select: { startsAt: true, endsAt: true },
    }),
  ]);
  const bounds = scheduleBounds();
  return {
    enabled: preference?.enabled || false,
    note: preference?.note || "",
    slots: preference?.enabled
      ? slots
          .filter(
            (s) =>
              scheduleDate(s.startsAt) >= bounds.min &&
              scheduleDate(s.startsAt) <= bounds.max &&
              !busy.some((b) => overlaps(s, b)),
          )
          .map((s) => ({ id: s.id, startsAt: s.startsAt, endsAt: s.endsAt }))
      : [],
  };
}

async function usableSlot(
  tx: Tx,
  slotId: string,
  hostId: string,
  requesterId: string,
  excludeBookingId?: string,
) {
  const preference = await tx.schedulePreference.findUnique({
    where: { userId: hostId },
  });
  if (!preference?.enabled)
    throw new HttpError(409, "对方目前只接受留言，暂未开放新预约。");
  const slot = await tx.availabilitySlot.findFirst({
    where: { id: slotId, userId: hostId, active: true },
  });
  if (!slot) throw new HttpError(409, "这个时段已不可用，请重新选择。");
  validateSlot(slot.startsAt, slot.endsAt);
  const conflict = await tx.booking.findFirst({
    where: {
      status: "confirmed",
      id: { not: excludeBookingId },
      startsAt: { lt: slot.endsAt },
      endsAt: { gt: slot.startsAt },
      OR: [...participantWhere(requesterId).OR, ...participantWhere(hostId).OR],
    },
    select: { id: true },
  });
  if (conflict)
    throw new HttpError(409, "这个时段与你或对方的其他预约冲突，请重新选择。");
  return { slot, preference };
}

async function eventMessage(
  tx: Tx,
  booking: { id: string; conversationId: string },
  actorId: string,
  event: BookingEvent,
) {
  const labels = {
    created: "发起了预约",
    rescheduled: "确认了改期",
    change_requested: "原时段不可用，申请改期",
    cancelled: "取消了预约",
    link_updated: "更新了会议链接",
  };
  await tx.directMessage.create({
    data: {
      conversationId: booking.conversationId,
      senderId: actorId,
      requestId: crypto.randomUUID(),
      content: `${labels[event.action]}：${event.title} · ${formatSlot(event.startsAt, event.endsAt)}`,
      kind: "booking",
      bookingId: booking.id,
      bookingEvent: event as unknown as Prisma.InputJsonValue,
    },
  });
  await tx.conversation.update({
    where: { id: booking.conversationId },
    data: { updatedAt: new Date() },
  });
}

export const createBookingSchema = z
  .object({
    conversationId: z.string().cuid(),
    slotId: z.string().cuid(),
    requestId: z.string().uuid(),
    title: z.string().trim().min(1).max(120),
    note: z.string().trim().max(3000).default(""),
    meetingUrl: meetingUrlSchema.optional(),
  })
  .strict();

export async function createBooking(
  requesterId: string,
  data: z.infer<typeof createBookingSchema>,
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: data.conversationId,
      OR: [{ starterId: requesterId }, { recipientId: requesterId }],
    },
  });
  if (!conversation) throw new HttpError(404, "会话不存在。");
  const hostId =
    conversation.starterId === requesterId
      ? conversation.recipientId
      : conversation.starterId;
  return prisma.$transaction(
    async (tx) => {
      await lockSchedules(tx, [requesterId, hostId]);
      const existing = await tx.booking.findUnique({
        where: {
          requesterId_requestId: { requesterId, requestId: data.requestId },
        },
        include: bookingInclude,
      });
      if (existing) {
        if (
          existing.conversationId !== data.conversationId ||
          existing.slotId !== data.slotId ||
          existing.title !== data.title ||
          existing.note !== data.note ||
          (data.meetingUrl !== undefined &&
            existing.meetingUrl !== meetingLink(data.meetingUrl))
        )
          throw new HttpError(409, "请求标识已使用。");
        return existing;
      }
      const { slot, preference } = await usableSlot(
        tx,
        data.slotId,
        hostId,
        requesterId,
      );
      const booking = await tx.booking.create({
        data: {
          requesterId,
          hostId,
          conversationId: conversation.id,
          slotId: slot.id,
          requestId: data.requestId,
          title: data.title,
          note: data.note,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          meetingUrl: meetingLink(data.meetingUrl ?? preference.meetingUrl)!,
        },
        include: bookingInclude,
      });
      await eventMessage(tx, booking, requesterId, {
        action: "created",
        title: booking.title,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
      });
      return booking;
    },
    { maxWait: 10000, timeout: 15000 },
  );
}

export const changeBookingSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("reschedule"),
      version: z.number().int(),
      slotId: z.string().cuid(),
      reason: z.string().trim().max(2000).default(""),
    })
    .strict(),
  z
    .object({
      action: z.literal("request_change"),
      version: z.number().int(),
      reason: z.string().trim().min(1).max(2000),
      proposedSlotId: z.string().cuid().optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("cancel"),
      version: z.number().int(),
      reason: z.string().trim().max(2000).default(""),
    })
    .strict(),
  z
    .object({
      action: z.literal("update_link"),
      version: z.number().int(),
      meetingUrl: meetingUrlSchema,
    })
    .strict(),
]);

export async function changeBooking(
  userId: string,
  id: string,
  data: z.infer<typeof changeBookingSchema>,
) {
  const original = await prisma.booking.findFirst({
    where: { id, ...participantWhere(userId) },
  });
  if (!original) throw new HttpError(404, "预约不存在。");
  return prisma.$transaction(
    async (tx) => {
      await lockSchedules(tx, [original.requesterId, original.hostId]);
      const booking = await tx.booking.findUniqueOrThrow({ where: { id } });
      if (booking.version !== data.version)
        throw new HttpError(409, "这条预约已更新，请刷新后查看最新状态。");
      if (booking.status === "cancelled")
        throw new HttpError(409, "这条预约已取消。");
      if (booking.endsAt <= new Date() && booking.status !== "change_requested")
        throw new HttpError(409, "这场会议已结束，历史记录不能修改。");
      let update: Prisma.BookingUncheckedUpdateInput = {
        version: { increment: 1 },
      };
      const event: BookingEvent = {
        action: "link_updated",
        title: booking.title,
        startsAt: booking.startsAt.toISOString(),
        endsAt: booking.endsAt.toISOString(),
      };
      if (data.action === "reschedule") {
        if (userId !== booking.requesterId)
          throw new HttpError(
            403,
            "只有发起人可以确认新的预约时间；你可以向对方提出改期请求。",
          );
        const { slot } = await usableSlot(
          tx,
          data.slotId,
          booking.hostId,
          booking.requesterId,
          id,
        );
        if (slot.id === booking.slotId && booking.status === "confirmed")
          throw new HttpError(400, "请选择一个新的时段。");
        update = {
          ...update,
          slotId: slot.id,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          status: "confirmed",
          changeReason: "",
          proposedSlotId: null,
          proposedStartsAt: null,
          proposedEndsAt: null,
        };
        Object.assign(event, {
          action: "rescheduled",
          startsAt: slot.startsAt.toISOString(),
          endsAt: slot.endsAt.toISOString(),
          reason: data.reason,
        });
      } else if (data.action === "request_change") {
        if (userId !== booking.hostId)
          throw new HttpError(403, "发起人请直接选择新时段完成改期。");
        const proposed = data.proposedSlotId
          ? (
              await usableSlot(
                tx,
                data.proposedSlotId,
                booking.hostId,
                booking.requesterId,
                id,
              )
            ).slot
          : null;
        if (proposed?.id === booking.slotId)
          throw new HttpError(400, "建议时间应与原预约时间不同。");
        update = {
          ...update,
          status: "change_requested",
          changeReason: data.reason,
          proposedSlotId: proposed?.id || null,
          proposedStartsAt: proposed?.startsAt || null,
          proposedEndsAt: proposed?.endsAt || null,
        };
        await tx.availabilitySlot.update({
          where: { id: booking.slotId },
          data: { active: false },
        });
        Object.assign(event, {
          action: "change_requested",
          reason: data.reason,
          proposedStartsAt: proposed?.startsAt.toISOString() || null,
          proposedEndsAt: proposed?.endsAt.toISOString() || null,
        });
      } else if (data.action === "cancel") {
        if (userId !== booking.requesterId)
          throw new HttpError(
            403,
            "被预约方请用“无法赴约 / 建议改期”告知发起人。",
          );
        update = {
          ...update,
          status: "cancelled",
          changeReason: data.reason,
          proposedSlotId: null,
          proposedStartsAt: null,
          proposedEndsAt: null,
        };
        Object.assign(event, { action: "cancelled", reason: data.reason });
      } else {
        update.meetingUrl = meetingLink(data.meetingUrl)!;
      }
      const result = await tx.booking.update({
        where: { id },
        data: update,
        include: bookingInclude,
      });
      await eventMessage(tx, result, userId, event);
      return result;
    },
    { maxWait: 10000, timeout: 15000 },
  );
}
