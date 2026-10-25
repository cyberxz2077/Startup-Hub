"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Settings2,
} from "lucide-react";
import { api, errorText } from "@/lib/client";
import { addDays, scheduleDate } from "@/lib/schedule-time";
import type { OwnSchedule, ScheduleBooking } from "@/types/schedule";
import { AvailabilityEditor } from "./AvailabilityEditor";
import { BookingCard } from "./BookingCard";
import { BookingDialog, type BookingAction } from "./BookingDialog";

export function Schedule({
  userId,
  initialTab,
}: {
  userId: string;
  initialTab?: string;
}) {
  const [data, setData] = useState<OwnSchedule | null>(null);
  const [tab, setTab] = useState(
    initialTab === "availability" ? "availability" : "agenda",
  );
  const [filter, setFilter] = useState("upcoming");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{
    action: BookingAction;
    booking: ScheduleBooking;
  } | null>(null);
  const load = useCallback(async () => {
    try {
      setData(await api<OwnSchedule>("/api/schedule"));
      setError("");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (tab !== "agenda" || dialog) return;
    const refresh = () => {
      if (!document.hidden) void load();
    };
    const timer = setInterval(refresh, 20000);
    window.addEventListener("focus", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [load, tab, dialog]);
  const today = scheduleDate();
  const monthDate = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  monthDate.setUTCMonth(monthDate.getUTCMonth() + monthOffset);
  const monthStart = monthDate.toISOString().slice(0, 10);
  const first = addDays(monthStart, -((monthDate.getUTCDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => addDays(first, index));
  const bookings = data?.bookings || [];
  const pending = bookings.filter((b) => b.status === "change_requested");
  const upcoming = bookings.filter(
    (b) =>
      b.status === "change_requested" ||
      (b.status === "confirmed" && new Date(b.endsAt) > new Date()),
  );
  const shown = bookings
    .filter((b) => {
      if (selectedDate && scheduleDate(b.startsAt) !== selectedDate)
        return false;
      if (filter === "history")
        return (
          b.status === "cancelled" ||
          (b.status === "confirmed" && new Date(b.endsAt) <= new Date())
        );
      if (filter === "changes") return b.status === "change_requested";
      if (!(
        b.status === "change_requested" ||
        (b.status === "confirmed" && new Date(b.endsAt) > new Date())
      ))
        return false;
      return filter === "mine"
        ? b.requesterId === userId
        : filter === "received"
          ? b.hostId === userId
          : true;
    })
    .sort((a, b) =>
      filter === "history"
        ? b.startsAt.localeCompare(a.startsAt)
        : a.startsAt.localeCompare(b.startsAt),
    );
  return (
    <section className="page-container py-8 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <p className="eyebrow mb-3">TIME FOR REAL CONVERSATIONS</p>
          <h1 className="text-3xl md:text-4xl font-semibold">我的时间表</h1>
          <p className="text-sm text-ink-light mt-4">
            管理与伙伴的会议，以及你愿意留给交流的时间。北京时间（UTC+8）。
          </p>
        </div>
        <button
          onClick={() => void load()}
          className="icon-btn"
          aria-label="刷新时间表"
        >
          <RefreshCw size={18} />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: "接下来的安排", count: upcoming.length },
          { label: "等待改期", count: pending.length },
          {
            label: "预约状态",
            count: data?.settings.enabled ? "已开放" : "仅留言",
          },
        ].map((item) => (
          <div key={item.label} className="surface p-4 md:p-5">
            <p className="text-[11px] text-ink-light">{item.label}</p>
            <p className="text-xl md:text-2xl font-semibold mt-2">
              {item.count}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className={tab === "agenda" ? "btn-primary" : "btn-secondary"}
          onClick={() => {
            setTab("agenda");
            setNotice("");
          }}
        >
          <CalendarClock size={16} />
          我的安排
        </button>
        <button
          className={tab === "availability" ? "btn-primary" : "btn-secondary"}
          onClick={() => {
            setTab("availability");
            setNotice("");
          }}
        >
          <Settings2 size={16} />
          开放时间设置
        </button>
        <Link className="btn-secondary" href="/?view=inbox">
          去消息里约时间
        </Link>
      </div>
      {error && (
        <p role="alert" className="error-notice mb-5">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice mb-5">
          {notice}
        </p>
      )}
      {loading && (
        <div className="py-16 flex justify-center">
          <Loader2 className="animate-spin" aria-label="加载时间表" />
        </div>
      )}
      {data && tab === "availability" && (
        <AvailabilityEditor
          key={data.settings.version}
          data={data}
          onSaved={(next) => {
            setData(next);
            setNotice("预约设置已保存。关闭开放状态不会取消已有安排。");
          }}
        />
      )}
      {data && tab === "agenda" && (
        <div className="grid lg:grid-cols-[minmax(0,390px)_1fr] gap-6 items-start">
          <section
            className="surface p-4 md:p-6 lg:sticky lg:top-24"
            aria-label="预约日历"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">
                {monthDate.getUTCFullYear()}年{monthDate.getUTCMonth() + 1}月
              </h2>
              <div className="flex">
                <button
                  className="icon-btn"
                  aria-label="上个月"
                  disabled={monthOffset <= -3}
                  onClick={() => setMonthOffset((v) => v - 1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  className="icon-btn"
                  aria-label="下个月"
                  disabled={monthOffset >= 2}
                  onClick={() => setMonthOffset((v) => v + 1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-ink-light mb-2">
              {["一", "二", "三", "四", "五", "六", "日"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const plans = bookings.filter(
                  (b) =>
                    b.status !== "cancelled" &&
                    scheduleDate(b.startsAt) === day,
                );
                const available =
                  data.settings.enabled &&
                  data.slots.some(
                    (s) => s.available && scheduleDate(s.startsAt) === day,
                  );
                return (
                  <button
                    key={day}
                    className={`rounded-xl min-h-[52px] py-2 text-sm border ${selectedDate === day ? "border-accent-blue bg-blue-50 text-accent-blue" : day === today ? "border-blue-100 text-accent-blue" : "border-transparent hover:bg-paper"} ${day.slice(0, 7) !== monthStart.slice(0, 7) ? "opacity-40" : ""}`}
                    aria-label={`${day}，${plans.length}个安排${available ? "，有开放时段" : ""}`}
                    aria-pressed={selectedDate === day}
                    onClick={() => setSelectedDate(day)}
                  >
                    <span>{Number(day.slice(8))}</span>
                    <span className="flex justify-center gap-1 h-2 mt-1">
                      {plans.length > 0 && (
                        <i
                          className={`h-1.5 w-1.5 rounded-full ${plans.some((b) => b.status === "change_requested") ? "bg-amber-500" : "bg-accent-blue"}`}
                        />
                      )}
                      {available && (
                        <i className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-ink-light mt-4 leading-6">
              蓝色：会议安排 · 橙色：待改期 · 绿色：开放时段
            </p>
            {selectedDate && (
              <button
                className="text-xs text-accent-blue mt-3"
                onClick={() => setSelectedDate(null)}
              >
                显示所有日期
              </button>
            )}
          </section>
          <section aria-label="预约计划">
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: "upcoming", label: "全部计划" },
                { id: "mine", label: "我发起的" },
                { id: "received", label: "别人约我" },
                { id: "changes", label: "待改期" },
                { id: "history", label: "历史记录" },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`rounded-full px-3 py-2 text-xs ${filter === f.id ? "bg-ink text-white" : "bg-white border border-border"}`}
                  onClick={() => setFilter(f.id)}
                  aria-pressed={filter === f.id}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <h2 className="font-semibold mb-4">
              {selectedDate || "全部日期"}{" "}
              <span className="font-normal text-xs text-ink-light">
                · {shown.length}个安排
              </span>
            </h2>
            <div className="space-y-4">
              {shown.map((b) => (
                <BookingCard
                  key={b.id}
                  booking={b}
                  userId={userId}
                  showConversation
                  onAction={(action, booking) => setDialog({ action, booking })}
                />
              ))}
            </div>
            {shown.length === 0 && (
              <div className="surface p-9 text-center">
                <CalendarClock
                  className="mx-auto text-accent-blue mb-4"
                  size={30}
                />
                <h3 className="font-semibold">这里暂时没有安排</h3>
                <p className="text-sm text-ink-light leading-7 mt-3">
                  从与伙伴的聊天中选择“预约时间”，或先开放自己的可用时间。
                </p>
              </div>
            )}
          </section>
        </div>
      )}
      {dialog && (
        <BookingDialog
          {...dialog}
          conversationId={dialog.booking.conversationId}
          person={
            dialog.booking.requesterId === userId
              ? dialog.booking.host
              : dialog.booking.requester
          }
          onClose={() => setDialog(null)}
          onSaved={load}
        />
      )}
    </section>
  );
}
