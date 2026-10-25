"use client";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, Video } from "lucide-react";
import { formatSlot, meetingLink } from "@/lib/schedule-time";
import type { ScheduleBooking } from "@/types/schedule";
import type { BookingAction } from "./BookingDialog";
export function BookingCard({
  booking,
  userId,
  onAction,
  showConversation = false,
}: {
  booking: ScheduleBooking;
  userId: string;
  onAction: (action: BookingAction, booking: ScheduleBooking) => void;
  showConversation?: boolean;
}) {
  const mine = booking.requesterId === userId;
  const person = mine ? booking.host : booking.requester;
  const ended = new Date(booking.endsAt) <= new Date();
  const inactive =
    booking.status === "cancelled" ||
    (ended && booking.status !== "change_requested");
  const label =
    booking.status === "change_requested"
      ? "原时间失效 · 待改期"
      : booking.status === "cancelled"
        ? "已取消"
        : ended
          ? "已结束"
          : "已确认";
  const href = meetingLink(booking.meetingUrl);
  return (
    <article
      className="rounded-2xl border border-border bg-white p-5"
      aria-label={`预约：${booking.title}`}
    >
      <div className="flex flex-wrap justify-between gap-2 mb-3">
        <span className="text-[11px] text-ink-light">
          {mine ? "我发起的预约" : "对方预约了我"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] ${booking.status === "change_requested" ? "bg-amber-50 text-amber-800" : inactive ? "bg-paper text-ink-light" : "bg-blue-50 text-accent-blue"}`}
        >
          {label}
        </span>
      </div>
      <h3 className="font-semibold break-words">{booking.title}</h3>
      <p className="mt-2 text-sm">
        与{" "}
        {person.profile?.published ? (
          <Link
            className="text-accent-blue underline underline-offset-4"
            href={`/?view=profile_detail&id=${person.id}`}
          >
            {person.name || "社区成员"}
          </Link>
        ) : (
          person.name || "社区成员"
        )}
      </p>
      <p
        className={`flex items-start gap-2 mt-3 text-sm ${booking.status === "change_requested" ? "text-ink-light line-through" : "text-ink"}`}
      >
        <CalendarClock size={16} className="mt-0.5 shrink-0" />
        {formatSlot(booking.startsAt, booking.endsAt)}
      </p>
      {booking.status === "change_requested" && (
        <div className="rounded-xl bg-amber-50 p-3 mt-4 text-sm leading-7">
          <p>{booking.changeReason}</p>
          <p className="mt-2 font-medium">
            {mine ? "请重新选择可用时间。" : "等待发起人确认新的时间。"}
          </p>
          {booking.proposedStartsAt && booking.proposedEndsAt && (
            <p>
              建议：
              {formatSlot(booking.proposedStartsAt, booking.proposedEndsAt)}
              <span className="block text-[11px] text-ink-light">
                确认时会再次检查双方是否空闲。
              </span>
            </p>
          )}
        </div>
      )}
      {booking.status === "cancelled" && booking.changeReason && (
        <p className="text-sm text-ink-light mt-3">
          取消说明：{booking.changeReason}
        </p>
      )}
      {booking.note && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-ink-light">交流说明</summary>
          <p className="whitespace-pre-wrap break-words leading-7 mt-2">
            {booking.note}
          </p>
        </details>
      )}
      <div className="flex flex-wrap gap-2 mt-4">
        {!inactive && booking.status === "confirmed" && href && (
          <a
            className="btn-primary !text-xs !px-3 !py-2"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Video size={14} />
            进入线上会议
            <ArrowUpRight size={13} />
          </a>
        )}
        {!inactive && (
          <>
            {mine ? (
              <>
                <button
                  className="btn-secondary !text-xs !px-3 !py-2"
                  onClick={() => onAction("reschedule", booking)}
                >
                  {booking.status === "change_requested"
                    ? "选择新时间"
                    : "改期"}
                </button>
                <button
                  className="btn-secondary !text-xs !px-3 !py-2"
                  onClick={() => onAction("cancel", booking)}
                >
                  取消预约
                </button>
              </>
            ) : (
              <button
                className="btn-secondary !text-xs !px-3 !py-2"
                onClick={() => onAction("request_change", booking)}
              >
                无法赴约 / 建议改期
              </button>
            )}
            <button
              className="btn-secondary !text-xs !px-3 !py-2"
              onClick={() => onAction("update_link", booking)}
            >
              {href ? "修改会议链接" : "补充会议链接"}
            </button>
          </>
        )}
        {showConversation && (
          <Link
            className="btn-secondary !text-xs !px-3 !py-2"
            href={`/?view=inbox&conversation=${booking.conversationId}`}
          >
            回到对话
          </Link>
        )}
      </div>
    </article>
  );
}
