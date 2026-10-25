import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
const jar = vi.hoisted(() => new Map<string, string>());
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (key: string) => (jar.has(key) ? { value: jar.get(key) } : undefined),
  }),
}));
import { prisma } from "../src/lib/db";
import { newSessionToken, sessionCookie } from "../src/lib/auth";
import { hashToken } from "../src/lib/rate-limit";
import {
  addDays,
  meetingLink,
  scheduleDate,
  slotIso,
} from "../src/lib/schedule-time";
import {
  availableTo,
  changeBooking,
  createBooking,
  ownSchedule,
  savePreferences,
  validateSlot,
} from "../src/lib/scheduling";
import {
  GET as scheduleGet,
  POST as schedulePost,
} from "../src/app/api/schedule/route";
import {
  GET as bookingsGet,
  POST as bookingsPost,
} from "../src/app/api/bookings/route";
import { POST as bookingPost } from "../src/app/api/bookings/[id]/route";
import { GET as bookingAvailability } from "../src/app/api/bookings/[id]/availability/route";
import { GET as inboxGet, POST as inboxPost } from "../src/app/api/inbox/route";
const origin = "http://localhost:3100";
const req = (path: string, body?: unknown, source = origin) =>
  new Request(
    origin + path,
    body === undefined
      ? undefined
      : {
          method: "POST",
          headers: { Origin: source, "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const interval = (days: number, start = "14:00", end = "14:30") => ({
  startsAt: slotIso(addDays(scheduleDate(), days), start),
  endsAt: slotIso(addDays(scheduleDate(), days), end),
});

describe("schedule clock and safe meeting links", () => {
  it("uses the Beijing calendar across UTC day and month boundaries", () => {
    expect(scheduleDate("2026-10-31T17:00:00Z")).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(slotIso("2026-10-26", "14:00")).toBe("2026-10-26T06:00:00.000Z");
  });
  it("accepts full-day windows and rejects past, cross-day, malformed-grid and beyond-month slots", () => {
    const now = new Date("2026-10-25T04:00:00Z");
    for (const [start, end] of [
      ["2026-10-25T03:00:00Z", "2026-10-25T03:30:00Z"],
      ["2026-11-25T06:00:00Z", "2026-11-25T06:30:00Z"],
      ["2026-10-26T15:30:00Z", "2026-10-26T16:30:00Z"],
      ["2026-10-26T06:05:00Z", "2026-10-26T06:35:00Z"],
    ])
      expect(() => validateSlot(new Date(start), new Date(end), now)).toThrow();
    expect(() =>
      validateSlot(
        new Date("2026-11-24T06:00:00Z"),
        new Date("2026-11-24T06:30:00Z"),
        now,
      ),
    ).not.toThrow();
    expect(() =>
      validateSlot(
        new Date(slotIso("2026-10-26", "00:00")),
        new Date(slotIso("2026-10-26", "24:00")),
        now,
      ),
    ).not.toThrow();
    expect(() =>
      validateSlot(
        new Date(slotIso("2026-11-24", "23:45")),
        new Date(slotIso("2026-11-24", "24:00")),
        now,
      ),
    ).not.toThrow();
    expect(() =>
      validateSlot(
        new Date(slotIso("2026-10-26", "08:00")),
        new Date(slotIso("2026-10-26", "20:30")),
        now,
      ),
    ).not.toThrow();
  });
  it("accepts HTTPS meeting links and excludes executable or credentialed URLs", () => {
    expect(meetingLink("https://meeting.tencent.com/")).toBe(
      "https://meeting.tencent.com/",
    );
    expect(meetingLink("https://example.zoom.us/j/123")).toContain("zoom.us");
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,x",
      "http://zoom.us",
      "https://user:pass@zoom.us",
      "https://localhost/",
      "https://127.0.0.1/",
    ])
      expect(meetingLink(url)).toBeNull();
    expect(meetingLink("")).toBe("");
  });
});

async function fixture() {
  const users = await Promise.all(
    ["A", "B", "C", "D"].map((label) =>
      prisma.user.create({
        data: {
          name: `Schedule QA ${label}`,
          joinedAt: new Date(),
          passwordHash: "schedule-private-sentinel",
          profile: { create: { title: `测试角色 ${label}`, published: true } },
        },
      }),
    ),
  );
  const [a, b, c, d] = users;
  const connect = (left: string, right: string) =>
    prisma.conversation.create({
      data: { starterId: left, recipientId: right, threadKey: randomUUID() },
    });
  const [ab, ac, cb, ad] = await Promise.all([
    connect(a.id, b.id),
    connect(a.id, c.id),
    connect(c.id, b.id),
    connect(a.id, d.id),
  ]);
  for (const user of users)
    await savePreferences(user.id, {
      enabled: true,
      note: "合成可用时间",
      meetingUrl: "https://meeting.tencent.com/",
      version: 0,
      slots: [
        interval(1),
        interval(1, "15:00", "15:30"),
        interval(2),
        interval(3),
        interval(7),
      ],
    });
  const slots = await Promise.all(
    users.map((user) =>
      prisma.availabilitySlot.findMany({
        where: { userId: user.id },
        orderBy: { startsAt: "asc" },
      }),
    ),
  );
  const login = async (userId: string) => {
    const token = newSessionToken();
    await prisma.authSession.create({
      data: {
        tokenHash: hashToken(token),
        userId,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    jar.clear();
    jar.set(sessionCookie(), token);
  };
  return { a, b, c, d, ab, ac, cb, ad, slots, login };
}
function draft(conversationId: string, slotId: string) {
  return {
    conversationId,
    slotId,
    title: "合作方向讨论",
    note: "合成预约测试",
    requestId: randomUUID(),
  };
}

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "isolated scheduling and long letters",
  () => {
    beforeAll(() => {
      vi.stubEnv("APP_URL", origin);
    });
    afterAll(async () => {
      vi.unstubAllEnvs();
      jar.clear();
      await prisma.$disconnect();
    });

    it("defaults to messages only and validates the three-day horizon and non-overlap", async () => {
      const user = await prisma.user.create({ data: { joinedAt: new Date() } });
      expect((await ownSchedule(user.id)).settings.enabled).toBe(false);
      const settings = { enabled: true, note: "", meetingUrl: "", version: 0 };
      await expect(
        savePreferences(user.id, { ...settings, slots: [interval(7)] }),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        savePreferences(user.id, {
          ...settings,
          slots: [interval(1, "14:00", "15:00"), interval(1, "14:30", "15:30")],
        }),
      ).rejects.toMatchObject({ status: 400 });
      await savePreferences(user.id, {
        ...settings,
        enabled: false,
        slots: [],
      });
      await savePreferences(user.id, {
        ...settings,
        version: 1,
        slots: [interval(3), interval(30)],
      });
      expect((await ownSchedule(user.id)).slots).toHaveLength(2);
      await expect(
        savePreferences(user.id, { ...settings, slots: [interval(1)] }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("adds an appointment to both calendars and creates a private conversation event, idempotently", async () => {
      const f = await fixture();
      const input = draft(f.ab.id, f.slots[1][0].id);
      const [one, retry] = await Promise.all([
        createBooking(f.a.id, input),
        createBooking(f.a.id, input),
      ]);
      expect(one.id).toBe(retry.id);
      expect((await ownSchedule(f.a.id)).bookings.map((b) => b.id)).toContain(
        one.id,
      );
      expect((await ownSchedule(f.b.id)).bookings.map((b) => b.id)).toContain(
        one.id,
      );
      expect((await ownSchedule(f.a.id)).slots[0]).toMatchObject({
        booked: false,
        available: false,
      });
      expect((await ownSchedule(f.b.id)).slots[0]).toMatchObject({
        booked: true,
        available: false,
      });
      const events = await prisma.directMessage.findMany({
        where: { bookingId: one.id },
      });
      expect(events).toHaveLength(1);
      expect(events[0].kind).toBe("booking");
      expect(one.meetingUrl).toBe("https://meeting.tencent.com/");
      expect(JSON.stringify(one)).not.toContain("schedule-private-sentinel");
      const visible = await availableTo(f.a.id, f.b.id);
      expect(visible.slots.some((s) => s.id === input.slotId)).toBe(false);
      expect(visible).not.toHaveProperty("meetingUrl");
    });

    it("serializes two people competing for the same host time", async () => {
      const f = await fixture();
      const results = await Promise.allSettled([
        createBooking(f.a.id, draft(f.ab.id, f.slots[1][0].id)),
        createBooking(f.c.id, draft(f.cb.id, f.slots[1][0].id)),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.find((r) => r.status === "rejected")).toMatchObject({
        reason: { status: 409 },
      });
      expect(
        await prisma.booking.count({
          where: { hostId: f.b.id, status: "confirmed" },
        }),
      ).toBe(1);
    });

    it("prevents the requester from booking different people at overlapping times", async () => {
      const f = await fixture();
      const results = await Promise.allSettled([
        createBooking(f.a.id, draft(f.ab.id, f.slots[1][0].id)),
        createBooking(f.a.id, draft(f.ac.id, f.slots[2][0].id)),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.find((r) => r.status === "rejected")).toMatchObject({
        reason: { status: 409 },
      });
    });

    it("lets one person schedule multiple people when the times do not conflict", async () => {
      const f = await fixture();
      await createBooking(f.a.id, draft(f.ab.id, f.slots[1][0].id));
      await createBooking(f.a.id, draft(f.ac.id, f.slots[2][1].id));
      await createBooking(f.a.id, draft(f.ad.id, f.slots[3][2].id));
      expect((await ownSchedule(f.a.id)).bookings).toHaveLength(3);
    });

    it("protects booked slots and keeps existing meetings when new booking is closed", async () => {
      const f = await fixture();
      const booking = await createBooking(
        f.a.id,
        draft(f.ab.id, f.slots[1][0].id),
      );
      const current = await ownSchedule(f.b.id);
      const settings = {
        ...current.settings,
        slots: current.slots.map((s) => ({
          id: s.id,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
        })),
      };
      await expect(
        savePreferences(f.b.id, {
          ...settings,
          slots: settings.slots.slice(1),
        }),
      ).rejects.toMatchObject({ status: 409 });
      await savePreferences(f.b.id, { ...settings, enabled: false });
      expect((await ownSchedule(f.b.id)).bookings[0]).toMatchObject({
        id: booking.id,
        status: "confirmed",
      });
      expect((await availableTo(f.c.id, f.b.id)).slots).toHaveLength(0);
      await expect(
        createBooking(f.c.id, draft(f.cb.id, f.slots[1][1].id)),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("requires the host to request a change and the requester to confirm the replacement", async () => {
      const f = await fixture();
      const original = await createBooking(
        f.a.id,
        draft(f.ab.id, f.slots[1][0].id),
      );
      await expect(
        changeBooking(f.b.id, original.id, {
          action: "reschedule",
          version: original.version,
          slotId: f.slots[1][1].id,
          reason: "",
        }),
      ).rejects.toMatchObject({ status: 403 });
      const pending = await changeBooking(f.b.id, original.id, {
        action: "request_change",
        version: original.version,
        reason: "临时有其他安排",
        proposedSlotId: f.slots[1][1].id,
      });
      expect(pending.status).toBe("change_requested");
      expect(pending.startsAt).toEqual(original.startsAt);
      expect(
        (
          await prisma.availabilitySlot.findUniqueOrThrow({
            where: { id: original.slotId },
          })
        ).active,
      ).toBe(false);
      expect((await ownSchedule(f.a.id)).bookings[0].proposedSlotId).toBe(
        f.slots[1][1].id,
      );
      const accepted = await changeBooking(f.a.id, original.id, {
        action: "reschedule",
        version: pending.version,
        slotId: f.slots[1][1].id,
        reason: "这个时间可以",
      });
      expect(accepted.status).toBe("confirmed");
      expect(accepted.startsAt).toEqual(f.slots[1][1].startsAt);
      expect(accepted.proposedSlotId).toBeNull();
      expect(
        await prisma.directMessage.count({ where: { bookingId: original.id } }),
      ).toBe(3);
      await expect(
        changeBooking(f.a.id, original.id, {
          action: "cancel",
          version: original.version,
          reason: "",
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it("rechecks a suggested time when it is booked by someone else before confirmation", async () => {
      const f = await fixture();
      const original = await createBooking(
        f.a.id,
        draft(f.ab.id, f.slots[1][0].id),
      );
      const pending = await changeBooking(f.b.id, original.id, {
        action: "request_change",
        version: 1,
        reason: "需要改期",
        proposedSlotId: f.slots[1][1].id,
      });
      await createBooking(f.c.id, draft(f.cb.id, f.slots[1][1].id));
      await expect(
        changeBooking(f.a.id, original.id, {
          action: "reschedule",
          version: pending.version,
          slotId: f.slots[1][1].id,
          reason: "",
        }),
      ).rejects.toMatchObject({ status: 409 });
      const alternative = await changeBooking(f.a.id, original.id, {
        action: "reschedule",
        version: pending.version,
        slotId: f.slots[1][2].id,
        reason: "选择另一个双方可用的时间",
      });
      expect(alternative.slotId).toBe(f.slots[1][2].id);
    });

    it("records cancellations without deletion and releases the original slot", async () => {
      const f = await fixture();
      const original = await createBooking(
        f.a.id,
        draft(f.ab.id, f.slots[1][0].id),
      );
      await expect(
        changeBooking(f.b.id, original.id, {
          action: "cancel",
          version: 1,
          reason: "",
        }),
      ).rejects.toMatchObject({ status: 403 });
      await changeBooking(f.a.id, original.id, {
        action: "cancel",
        version: 1,
        reason: "本次先通过留言讨论",
      });
      expect(
        (await prisma.booking.findUniqueOrThrow({ where: { id: original.id } }))
          .status,
      ).toBe("cancelled");
      expect(
        await prisma.directMessage.count({ where: { bookingId: original.id } }),
      ).toBe(2);
      expect(
        (await createBooking(f.c.id, draft(f.cb.id, original.slotId))).status,
      ).toBe("confirmed");
    });

    it("lets either participant update a meeting link and excludes outsiders", async () => {
      const f = await fixture();
      const original = await createBooking(
        f.a.id,
        draft(f.ab.id, f.slots[1][0].id),
      );
      await expect(
        changeBooking(f.c.id, original.id, {
          action: "update_link",
          version: 1,
          meetingUrl: "https://zoom.us/",
        }),
      ).rejects.toMatchObject({ status: 404 });
      const changed = await changeBooking(f.b.id, original.id, {
        action: "update_link",
        version: 1,
        meetingUrl: "https://zoom.us/",
      });
      expect(changed.meetingUrl).toBe("https://zoom.us/");
      await f.login(f.c.id);
      expect(
        (await bookingAvailability(req("/"), ctx(original.id))).status,
      ).toBe(404);
      expect(
        (await bookingsGet(req(`/api/bookings?conversation=${f.ab.id}`)))
          .status,
      ).toBe(404);
      expect(
        (
          await bookingPost(
            req("/", { action: "cancel", version: 2 }),
            ctx(original.id),
          )
        ).status,
      ).toBe(404);
      await f.login(f.b.id);
      expect(
        (await bookingAvailability(req("/"), ctx(original.id))).status,
      ).toBe(200);
    });

    it("requires login, a legitimate conversation, same-origin writes and a matching slot owner", async () => {
      const f = await fixture();
      jar.clear();
      expect((await scheduleGet()).status).toBe(401);
      expect((await bookingsGet(req("/api/bookings"))).status).toBe(401);
      await f.login(f.a.id);
      expect(
        (
          await schedulePost(
            req("/api/schedule", {}, "https://attacker.example"),
          )
        ).status,
      ).toBe(403);
      expect(
        (
          await bookingsPost(
            req("/api/bookings", draft(f.cb.id, f.slots[1][0].id)),
          )
        ).status,
      ).toBe(404);
      expect(
        (
          await bookingsPost(
            req("/api/bookings", draft(f.ab.id, f.slots[2][0].id)),
          )
        ).status,
      ).toBe(409);
      await expect(availableTo(f.d.id, f.b.id)).rejects.toMatchObject({
        status: 404,
      });
    });

    it("supports a long letter with subject and manual email notice, preserving idempotency and visibility", async () => {
      const f = await fixture();
      await f.login(f.a.id);
      const letter = {
        conversationId: f.ab.id,
        requestId: randomUUID(),
        subject: "关于产品共建的一封长信",
        emailSent: true,
        content: "这是一段用于验证长信留存与换行的合成内容。\n"
          .repeat(500)
          .trim(),
      };
      expect(letter.content.length).toBeGreaterThan(4000);
      const sent = await inboxPost(req("/api/inbox", letter));
      expect(sent.status).toBe(201);
      const record = await sent.json();
      expect(record.message).toMatchObject({
        subject: letter.subject,
        content: letter.content,
        emailSent: true,
        kind: "text",
      });
      expect((await inboxPost(req("/api/inbox", letter))).status).toBe(200);
      expect(
        (await inboxPost(req("/api/inbox", { ...letter, subject: "不同主题" })))
          .status,
      ).toBe(409);
      expect(
        (
          await inboxPost(
            req("/api/inbox", {
              ...letter,
              requestId: randomUUID(),
              content: "长".repeat(20001),
            }),
          )
        ).status,
      ).toBe(400);
      expect(
        (await inboxPost(req("/api/inbox", { ...letter, kind: "booking" })))
          .status,
      ).toBe(400);
      await f.login(f.b.id);
      expect(
        (
          await (
            await inboxGet(req(`/api/inbox?conversation=${f.ab.id}`))
          ).json()
        ).messages[0].content,
      ).toBe(letter.content);
      await f.login(f.c.id);
      expect(
        (await inboxGet(req(`/api/inbox?conversation=${f.ab.id}`))).status,
      ).toBe(404);
    });

    it("enables RLS on new schedule tables without granting direct Data API access", async () => {
      const tables = await prisma.$queryRaw<
        { relname: string; relrowsecurity: boolean }[]
      >`SELECT relname, relrowsecurity FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relname IN ('schedule_preferences','availability_slots','bookings')`;
      expect(tables).toHaveLength(3);
      expect(tables.every((t) => t.relrowsecurity)).toBe(true);
      const grants = await prisma.$queryRaw<
        { grantee: string }[]
      >`SELECT grantee FROM information_schema.role_table_grants WHERE table_schema='public' AND table_name IN ('schedule_preferences','availability_slots','bookings') AND grantee IN ('anon','authenticated')`;
      expect(grants).toHaveLength(0);
    });
  },
);
