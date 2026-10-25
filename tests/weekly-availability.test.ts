import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/lib/db";
import {
  addDays,
  formatSlot,
  scheduleDate,
  slotIso,
} from "../src/lib/schedule-time";
import {
  cellsToIntervals,
  freeIntervals,
  intervalCells,
  paintCells,
  weekStart,
} from "../src/lib/schedule-intervals";
import {
  availableTo,
  changeBooking,
  createBooking,
  ownSchedule,
  savePreferences,
} from "../src/lib/scheduling";

const windowAt = (days: number, start = "00:00", end = "24:00") => ({
  startsAt: slotIso(addDays(scheduleDate(), days), start),
  endsAt: slotIso(addDays(scheduleDate(), days), end),
});
const dates = ["2026-10-26", "2026-10-27", "2026-10-28"];
describe("weekly time selection", () => {
  it("groups adjacent quarters, keeps midnight on its original day and preserves other weeks", () => {
    const ranges = [
      {
        startsAt: slotIso(dates[0], "00:00"),
        endsAt: slotIso(dates[0], "24:00"),
      },
      {
        startsAt: slotIso(dates[1], "00:00"),
        endsAt: slotIso(dates[1], "24:00"),
      },
      {
        startsAt: slotIso("2026-11-03", "08:00"),
        endsAt: slotIso("2026-11-03", "20:30"),
      },
    ];
    expect(cellsToIntervals(intervalCells(ranges))).toEqual(ranges);
    expect(formatSlot(ranges[0].startsAt, ranges[0].endsAt)).toContain(
      "00:00–24:00",
    );
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });
  it("paints in both directions across days and preserves locked meeting quarters", () => {
    const lock = +new Date(slotIso(dates[1], "10:00"));
    const editable = (t: number) => t !== lock;
    const cells = paintCells(
      new Set([lock]),
      dates,
      { day: 2, row: 43 },
      { day: 0, row: 40 },
      true,
      editable,
    );
    expect(cells.size).toBe(12);
    const cleared = paintCells(
      cells,
      dates,
      { day: 0, row: 40 },
      { day: 2, row: 43 },
      false,
      editable,
    );
    expect([...cleared]).toEqual([lock]);
  });
  it("subtracts only busy portions, including overlapping meetings and elapsed time", () => {
    const interval = {
      startsAt: new Date(slotIso(dates[0], "00:00")),
      endsAt: new Date(slotIso(dates[0], "24:00")),
    };
    const busy = [
      {
        startsAt: new Date(slotIso(dates[0], "10:00")),
        endsAt: new Date(slotIso(dates[0], "10:30")),
      },
      {
        startsAt: new Date(slotIso(dates[0], "10:15")),
        endsAt: new Date(slotIso(dates[0], "11:00")),
      },
    ];
    const parts = freeIntervals(
      interval,
      busy,
      new Date(slotIso(dates[0], "09:05")),
    );
    expect(
      parts.map((p) => [p.startsAt.toISOString(), p.endsAt.toISOString()]),
    ).toEqual([
      [slotIso(dates[0], "09:15"), slotIso(dates[0], "10:00")],
      [slotIso(dates[0], "11:00"), slotIso(dates[0], "24:00")],
    ]);
  });
});

async function fixture() {
  const [a, b, c] = await Promise.all(
    ["A", "B", "C"].map((name) =>
      prisma.user.create({
        data: { name: `Weekly QA ${name}`, joinedAt: new Date() },
      }),
    ),
  );
  const [ab, cb] = await Promise.all(
    [a, c].map((user) =>
      prisma.conversation.create({
        data: {
          starterId: user.id,
          recipientId: b.id,
          threadKey: randomUUID(),
        },
      }),
    ),
  );
  await savePreferences(b.id, {
    enabled: true,
    version: 0,
    note: "",
    meetingUrl: "",
    slots: [windowAt(1), windowAt(2)],
  });
  const schedule = await ownSchedule(b.id);
  const draft = (conversationId = ab.id, start = "10:00", end = "10:30") => ({
    conversationId,
    slotId: schedule.slots[0].id,
    requestId: randomUUID(),
    title: "部分时间预约",
    note: "",
    ...windowAt(1, start, end),
  });
  return { a, b, c, ab, cb, schedule, draft };
}

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "bookings inside availability windows",
  () => {
    afterAll(async () => {
      vi.useRealTimers();
      await prisma.$disconnect();
    });
    it("books separate meetings in one all-day window without consuming the rest", async () => {
      const f = await fixture();
      const first = await createBooking(f.a.id, f.draft());
      const second = await createBooking(
        f.c.id,
        f.draft(f.cb.id, "11:00", "12:00"),
      );
      expect(first.slotId).toBe(second.slotId);
      const free = await availableTo(f.a.id, f.b.id);
      expect(
        free.slots
          .filter((s) => s.id === first.slotId)
          .map((s) => [s.startsAt.toISOString(), s.endsAt.toISOString()]),
      ).toEqual([
        [windowAt(1).startsAt, windowAt(1, "10:00").startsAt],
        [windowAt(1, "10:30").startsAt, windowAt(1, "11:00").startsAt],
        [windowAt(1, "12:00").startsAt, windowAt(1).endsAt],
      ]);
      expect((await ownSchedule(f.b.id)).slots[0]).toMatchObject({
        booked: true,
        available: true,
      });
      await expect(
        createBooking(f.c.id, f.draft(f.cb.id, "10:15", "11:15")),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        createBooking(f.c.id, {
          ...f.draft(f.cb.id),
          startsAt: undefined,
          endsAt: undefined,
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
    it("allows same-window rescheduling and rejects interval tampering and reused request IDs", async () => {
      const f = await fixture();
      const input = f.draft();
      const first = await createBooking(f.a.id, input);
      await expect(
        createBooking(f.a.id, { ...input, ...windowAt(1, "11:00", "11:30") }),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        createBooking(f.c.id, {
          ...f.draft(f.cb.id),
          ...windowAt(2, "11:00", "11:30"),
        }),
      ).rejects.toMatchObject({ status: 409 });
      const moved = await changeBooking(f.a.id, first.id, {
        action: "reschedule",
        version: 1,
        slotId: first.slotId,
        reason: "",
        ...windowAt(1, "13:00", "16:30"),
      });
      expect(moved.slotId).toBe(first.slotId);
      expect(moved.endsAt.toISOString()).toBe(
        windowAt(1, "13:00", "16:30").endsAt,
      );
    });
    it("protects actual booked intervals while allowing window resizing and merging", async () => {
      const f = await fixture();
      const booking = await createBooking(f.a.id, f.draft());
      await savePreferences(f.b.id, {
        ...f.schedule.settings,
        slots: [
          windowAt(1, "09:00", "10:15"),
          windowAt(1, "10:15", "12:00"),
          windowAt(2),
        ],
      });
      const current = await ownSchedule(f.b.id);
      expect(current.slots).toHaveLength(2);
      expect(current.slots[0].startsAt.toISOString()).toBe(
        windowAt(1, "09:00").startsAt,
      );
      expect(current.bookings[0].slotId).toBe(booking.slotId);
      expect(
        (
          await prisma.availabilitySlot.findUniqueOrThrow({
            where: { id: booking.slotId },
          })
        ).active,
      ).toBe(false);
      await expect(
        savePreferences(f.b.id, {
          ...current.settings,
          slots: [windowAt(1, "10:15", "12:00"), windowAt(2)],
        }),
      ).rejects.toMatchObject({ status: 409 });
      await expect(
        createBooking(f.c.id, f.draft(f.cb.id, "14:00", "15:00")),
      ).rejects.toMatchObject({ status: 409 });
    });
    it("withdraws only the unavailable meeting and remaps a proposal in the same window", async () => {
      const f = await fixture();
      const first = await createBooking(f.a.id, f.draft());
      await createBooking(f.c.id, f.draft(f.cb.id, "16:00", "16:30"));
      const suggestion = windowAt(1, "14:00", "14:30");
      const pending = await changeBooking(f.b.id, first.id, {
        action: "request_change",
        version: 1,
        reason: "临时调整",
        proposedSlotId: first.slotId,
        proposedStartsAt: suggestion.startsAt,
        proposedEndsAt: suggestion.endsAt,
      });
      const current = await ownSchedule(f.b.id);
      expect(current.settings.version).toBe(f.schedule.settings.version + 1);
      expect(current.bookings.find((b) => b.id !== first.id)?.status).toBe(
        "confirmed",
      );
      expect(pending.proposedSlotId).not.toBe(first.slotId);
      expect(
        current.slots.filter(
          (s) => scheduleDate(s.startsAt) === scheduleDate(suggestion.startsAt),
        ),
      ).toHaveLength(2);
      await expect(
        savePreferences(f.b.id, {
          ...f.schedule.settings,
          slots: [windowAt(1), windowAt(2)],
        }),
      ).rejects.toMatchObject({ status: 409 });
      const accepted = await changeBooking(f.a.id, first.id, {
        action: "reschedule",
        version: pending.version,
        slotId: pending.proposedSlotId!,
        ...suggestion,
        reason: "可以",
      });
      expect(accepted.startsAt.toISOString()).toBe(suggestion.startsAt);
      const available = await availableTo(f.a.id, f.b.id);
      expect(
        available.slots.some(
          (s) => s.startsAt <= first.startsAt && s.endsAt >= first.endsAt,
        ),
      ).toBe(false);
    });
    it("serializes overlapping subintervals in a shared wide window", async () => {
      const f = await fixture();
      const results = await Promise.allSettled([
        createBooking(f.a.id, f.draft()),
        createBooking(f.c.id, f.draft(f.cb.id, "10:15", "10:45")),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(results.find((r) => r.status === "rejected")).toMatchObject({
        reason: { status: 409 },
      });
    });
    it("keeps today's remaining availability after a full-day window has begun", async () => {
      const f = await fixture();
      const today = scheduleDate();
      const now = new Date(slotIso(today, "09:05"));
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(now);
      try {
        await savePreferences(f.b.id, {
          ...f.schedule.settings,
          slots: [windowAt(0)],
        });
        const current = await ownSchedule(f.b.id);
        expect(current.slots[0].startsAt.toISOString()).toBe(
          slotIso(today, "09:15"),
        );
        expect(current.slots[0].endsAt.toISOString()).toBe(
          slotIso(today, "24:00"),
        );
        expect((await availableTo(f.a.id, f.b.id)).slots).toHaveLength(1);
      } finally {
        vi.useRealTimers();
      }
    });
  },
);
