"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, MousePointer2 } from "lucide-react";
import {
  addDays,
  scheduleBounds,
  scheduleDate,
  slotIso,
} from "@/lib/schedule-time";
import {
  cellTime,
  cellsToIntervals,
  intervalCells,
  paintCells,
  QUARTER,
  weekStart,
} from "@/lib/schedule-intervals";
import type { ScheduleBooking } from "@/types/schedule";

const CELL_HEIGHT = 18;
const GUTTER = 52;
const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
type Point = { day: number; row: number };
type Drag = {
  from: Point;
  to: Point;
  base: Set<number>;
  selected: boolean;
  pointerId: number;
  x: number;
  y: number;
  rendered?: string;
};

export function WeeklyAvailabilityGrid({
  cells,
  onChange,
  bookings,
  disabled,
}: {
  cells: Set<number>;
  onChange: (cells: Set<number>) => void;
  bookings: ScheduleBooking[];
  disabled: boolean;
}) {
  const [now, setNow] = useState(() => new Date());
  const [week, setWeek] = useState(() => weekStart(scheduleDate()));
  const [preview, setPreview] = useState<Set<number> | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [focus, setFocus] = useState<Point>({ day: 0, row: 32 });
  const viewport = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const frame = useRef(0);
  const bounds = scheduleBounds(now);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const busy = useMemo(
    () => intervalCells(bookings.filter((b) => b.status === "confirmed")),
    [bookings],
  );
  const shown = preview || cells;
  const ranges = useMemo(() => cellsToIntervals(shown), [shown]);
  const editable = (t: number) =>
    !disabled &&
    t > +now &&
    scheduleDate(new Date(t)) <= bounds.max &&
    !busy.has(t);
  const timeAt = (point: Point) =>
    +new Date(slotIso(dates[point.day], "00:00")) + point.row * QUARTER;

  useEffect(() => {
    if (viewport.current) viewport.current.scrollTop = 8 * 4 * CELL_HEIGHT;
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  const pointAt = (x: number, y: number): Point | null => {
    const rect = grid.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      day: Math.max(
        0,
        Math.min(
          6,
          Math.floor((x - rect.left - GUTTER) / ((rect.width - GUTTER) / 7)),
        ),
      ),
      row: Math.max(0, Math.min(95, Math.floor((y - rect.top) / CELL_HEIGHT))),
    };
  };
  const updateDrag = () => {
    const current = drag.current;
    if (!current) return;
    const to = pointAt(current.x, current.y);
    if (!to) return;
    const key = `${to.day}:${to.row}`;
    if (key === current.rendered) return;
    current.rendered = key;
    current.to = to;
    setPreview(
      paintCells(
        current.base,
        dates,
        current.from,
        to,
        current.selected,
        editable,
      ),
    );
    setAnnouncement(
      `${current.selected ? "开放" : "取消开放"} ${dates[Math.min(current.from.day, to.day)]}${current.from.day === to.day ? "" : ` 至 ${dates[Math.max(current.from.day, to.day)]}`} ${cellTime(Math.min(current.from.row, to.row))}–${cellTime(Math.max(current.from.row, to.row) + 1)}`,
    );
  };
  const autoScroll = () => {
    const current = drag.current;
    const el = viewport.current;
    if (!current || !el) return;
    const rect = el.getBoundingClientRect();
    const top = rect.top + 106; // Sticky day labels stay above the time grid.
    if (current.y > rect.bottom - 40) el.scrollTop += 14;
    else if (current.y < top + 28) el.scrollTop -= 14;
    if (current.x > rect.right - 24) el.scrollLeft += 10;
    else if (current.x < rect.left + 24) el.scrollLeft -= 10;
    updateDrag();
    frame.current = requestAnimationFrame(autoScroll);
  };
  const endDrag = (commit: boolean) => {
    const current = drag.current;
    if (!current) return;
    if (commit)
      onChange(
        paintCells(
          current.base,
          dates,
          current.from,
          current.to,
          current.selected,
          editable,
        ),
      );
    drag.current = null;
    cancelAnimationFrame(frame.current);
    setPreview(null);
    if (grid.current?.hasPointerCapture(current.pointerId))
      grid.current.releasePointerCapture(current.pointerId);
  };
  const selectDay = (day: number, selected: boolean) => {
    onChange(
      paintCells(
        cells,
        dates,
        { day, row: 0 },
        { day, row: 95 },
        selected,
        editable,
      ),
    );
    setAnnouncement(
      `${dates[day]} ${selected ? "已开放全部可用时间" : "已清空空闲时间，已有预约保留"}`,
    );
  };
  const toggle = (point: Point) => {
    const t = timeAt(point);
    if (!editable(t)) return;
    const next = new Set(cells);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    onChange(next);
    setAnnouncement(
      `${dates[point.day]} ${cellTime(point.row)}–${cellTime(point.row + 1)} ${next.has(t) ? "已开放" : "已取消开放"}`,
    );
  };
  const changeWeek = (next: string) => {
    endDrag(false);
    setWeek(next);
  };
  const selectedThisWeek = [...shown].filter(
    (t) =>
      scheduleDate(new Date(t)) >= week &&
      scheduleDate(new Date(t)) <= dates[6] &&
      t > +now &&
      !busy.has(t),
  ).length;

  return (
    <section aria-label="每周可用时间" className="mb-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div>
          <h3 className="font-semibold text-lg">每周可用时间</h3>
          <p className="text-xs text-ink-light mt-2">
            拖选开放，再次拖选取消 · 每格15分钟 · 北京时间
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="icon-btn"
            aria-label="上一周"
            disabled={disabled || week <= weekStart(bounds.min)}
            onClick={() => changeWeek(addDays(week, -7))}
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium tabular-nums" aria-live="polite">
            {week.slice(5).replace("-", "/")} —{" "}
            {dates[6].slice(5).replace("-", "/")}
          </span>
          <button
            type="button"
            className="icon-btn"
            aria-label="下一周"
            disabled={disabled || addDays(week, 7) > bounds.max}
            onClick={() => changeWeek(addDays(week, 7))}
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            className="btn-secondary !px-3 !py-2 !text-xs"
            disabled={disabled || week === weekStart(bounds.min)}
            onClick={() => changeWeek(weekStart(bounds.min))}
          >
            本周
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-border overflow-hidden bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3 bg-slate-50/70 text-xs">
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              可约
            </span>
            <span className="flex items-center gap-1.5">
              <i className="w-2.5 h-2.5 rounded-sm bg-slate-400" />
              已有会议
            </span>
          </div>
          <span className="text-ink-light">
            本周可约{" "}
            <strong className="font-semibold text-ink">
              {selectedThisWeek / 4}
            </strong>{" "}
            小时
          </span>
        </div>
        <div
          ref={viewport}
          data-testid="availability-scroll"
          className="overflow-auto overscroll-contain max-h-[620px]"
          style={{ scrollbarGutter: "stable" }}
        >
          <div className="min-w-[724px]">
            <div
              className="sticky top-0 z-20 grid bg-white/95 backdrop-blur-sm border-b border-border"
              style={{
                gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0, 1fr))`,
              }}
            >
              <div className="sticky left-0 bg-white z-10 flex items-center justify-center text-[10px] text-ink-light">
                24小时
              </div>
              {dates.map((date, day) => {
                const isValid = date >= bounds.min && date <= bounds.max;
                const dayStart = +new Date(slotIso(date, "00:00"));
                const eligible = Array.from(
                  { length: 96 },
                  (_, row) => dayStart + row * QUARTER,
                ).filter(editable);
                const allSelected =
                  eligible.length > 0 && eligible.every((t) => shown.has(t));
                return (
                  <div
                    key={date}
                    className={`text-center py-3 border-l border-border ${date === bounds.min ? "bg-blue-50/70" : ""} ${!isValid ? "opacity-40" : ""}`}
                  >
                    <p className="text-[11px] text-ink-light">
                      {weekdays[day]}
                      {date === bounds.min ? " · 今天" : ""}
                    </p>
                    <p className="text-lg font-semibold tabular-nums mt-0.5">
                      {date.slice(5).replace("-", "/")}
                    </p>
                    <button
                      type="button"
                      disabled={disabled || !isValid}
                      onClick={() => selectDay(day, !allSelected)}
                      aria-label={`${date} ${allSelected ? "清空当天" : "全天可约"}`}
                      className={`text-[11px] mt-1 rounded-md px-2 py-1 ${allSelected ? "text-ink-light bg-slate-100" : "text-accent-blue bg-blue-50 hover:bg-blue-100"}`}
                    >
                      {allSelected
                        ? "清空当天"
                        : date === bounds.min
                          ? "开放余下时间"
                          : "全天可约"}
                    </button>
                  </div>
                );
              })}
            </div>
            <div
              ref={grid}
              className="relative grid select-none"
              style={{
                gridTemplateColumns: `${GUTTER}px repeat(7, minmax(0, 1fr))`,
              }}
              onPointerMove={(e) => {
                if (drag.current) {
                  drag.current.x = e.clientX;
                  drag.current.y = e.clientY;
                  updateDrag();
                }
              }}
              onPointerUp={() => endDrag(true)}
              onPointerCancel={() => endDrag(false)}
              onLostPointerCapture={() => endDrag(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") endDrag(false);
              }}
            >
              <div
                className="sticky left-0 z-10 bg-white pointer-events-none"
                aria-hidden="true"
              >
                {Array.from({ length: 24 }, (_, hour) => (
                  <div
                    key={hour}
                    className="border-t border-slate-200 text-[10px] text-ink-light text-center pt-1 tabular-nums"
                    style={{ height: CELL_HEIGHT * 4 }}
                  >
                    {cellTime(hour * 4)}
                  </div>
                ))}
              </div>
              {dates.map((date, day) => {
                const midnight = +new Date(slotIso(date, "00:00"));
                const dayRanges = ranges.filter(
                  (range) => scheduleDate(range.startsAt) === date,
                );
                return (
                  <div key={date} className="relative border-l border-border">
                    {Array.from({ length: 96 }, (_, row) => {
                      const t = midnight + row * QUARTER;
                      const locked = busy.has(t);
                      const unavailable = !editable(t);
                      const selected = shown.has(t);
                      return (
                        <button
                          key={row}
                          type="button"
                          data-day={day}
                          data-row={row}
                          data-testid={`cell-${date}-${cellTime(row)}`}
                          tabIndex={
                            focus.day === day && focus.row === row ? 0 : -1
                          }
                          aria-label={`${date} ${cellTime(row)}–${cellTime(row + 1)}${locked ? " 已有会议" : unavailable ? " 不可选择" : ""}`}
                          aria-pressed={selected}
                          aria-disabled={unavailable}
                          className={`block w-full border-t focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue focus-visible:z-10 relative ${row % 4 === 0 ? "border-t-slate-300/70" : "border-t-slate-200/45"} ${locked ? "bg-slate-300/70 cursor-not-allowed" : unavailable ? "bg-slate-100/70 cursor-not-allowed" : selected ? "bg-blue-100 hover:bg-blue-200" : "bg-white hover:bg-blue-50"}`}
                          style={{ height: CELL_HEIGHT }}
                          onFocus={() => setFocus({ day, row })}
                          onPointerDown={(e) => {
                            if (
                              e.pointerType === "touch" ||
                              e.button !== 0 ||
                              unavailable
                            )
                              return;
                            e.preventDefault();
                        e.currentTarget.focus({ preventScroll: true });
                            const point = { day, row };
                            drag.current = {
                              from: point,
                              to: point,
                              base: cells,
                              selected: !selected,
                              pointerId: e.pointerId,
                              x: e.clientX,
                              y: e.clientY,
                            };
                            grid.current?.setPointerCapture(e.pointerId);
                            updateDrag();
                            frame.current = requestAnimationFrame(autoScroll);
                          }}
                          onClick={(e) => {
                            if (
                              e.detail === 0 ||
                              (e.nativeEvent as PointerEvent).pointerType ===
                                "touch"
                            )
                              toggle({ day, row });
                          }}
                          onKeyDown={(e) => {
                            const directions: Record<string, Point> = {
                              ArrowUp: { day, row: Math.max(0, row - 1) },
                              ArrowDown: { day, row: Math.min(95, row + 1) },
                              ArrowLeft: { day: Math.max(0, day - 1), row },
                              ArrowRight: { day: Math.min(6, day + 1), row },
                            };
                            const next = directions[e.key];
                            if (next) {
                              e.preventDefault();
                              setFocus(next);
                              grid.current
                                ?.querySelector<HTMLButtonElement>(
                                  `[data-day="${next.day}"][data-row="${next.row}"]`,
                                )
                                ?.focus();
                            }
                          }}
                        />
                      );
                    })}
                    {dayRanges.map((range) => {
                      const start =
                        (+new Date(range.startsAt) - midnight) / QUARTER;
                      const end =
                        (+new Date(range.endsAt) - midnight) / QUARTER;
                      return (
                        <div
                          key={range.startsAt}
                          className="absolute left-0 right-0 pointer-events-none border-l-[3px] border-blue-500"
                          style={{
                            top: start * CELL_HEIGHT,
                            height: (end - start) * CELL_HEIGHT,
                          }}
                        >
                          {end - start >= 2 && (
                            <span className="absolute top-1 left-1 text-[10px] leading-4 font-medium text-blue-800 bg-blue-100/90 rounded px-1 tabular-nums">
                              {start === 0 && end === 96
                                ? "全天可约"
                                : `${cellTime(start)}–${cellTime(end)}`}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              <div className="col-span-8 text-[10px] text-ink-light h-6 pl-2 border-t border-border">
                24:00
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-border px-4 py-3 text-xs leading-6 text-ink-light flex gap-2">
          <MousePointer2 size={14} className="mt-1 shrink-0" />
          <span>
            按住鼠标上下拖选，也可横跨多天；靠近边缘会自动滚动。手机可点选、左右滑动查看整周。键盘用方向键移动、空格选择。已有会议请在预约记录中改期。
          </span>
        </div>
      </div>
      <p
        role="status"
        aria-live="polite"
        className="text-xs text-accent-blue mt-3 min-h-5"
      >
        {announcement || "翻页保留已选时间，完成后点击「保存预约设置」。"}
      </p>
    </section>
  );
}
