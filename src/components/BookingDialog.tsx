"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, Loader2, X } from "lucide-react";
import { api, errorText } from "@/lib/client";
import { formatSlot, scheduleDate, scheduleTime } from "@/lib/schedule-time";
import type { PersonAvailability, ScheduleBooking } from "@/types/schedule";
import { QUARTER } from "@/lib/schedule-intervals";
import { Modal } from "./ui/Modal";

export type BookingAction =
  "create" | "reschedule" | "request_change" | "cancel" | "update_link";
const titles: Record<BookingAction, string> = {
  create: "约一场深入交流",
  reschedule: "选择新的会议时间",
  request_change: "告知对方需要改期",
  cancel: "取消这次预约",
  update_link: "设置会议链接",
};
export function BookingDialog({
  action,
  booking,
  person,
  conversationId,
  onClose,
  onSaved,
}: {
  action: BookingAction;
  booking?: ScheduleBooking;
  person: { id: string; name: string | null };
  conversationId: string;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [availability, setAvailability] = useState<PersonAvailability | null>(
    null,
  );
  const [loading, setLoading] = useState(
    ["create", "reschedule", "request_change"].includes(action),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [date, setDate] = useState("");
  const [choice, setChoice] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [title, setTitle] = useState(booking?.title || "");
  const [note, setNote] = useState("");
  const [meetingUrl, setMeetingUrl] = useState(booking?.meetingUrl || "");
  const requestId = useRef(crypto.randomUUID());
  const lock = useRef(false);
  useEffect(() => {
    if (!["create", "reschedule", "request_change"].includes(action)) return;
    const abort = new AbortController();
    api<PersonAvailability>(
      booking
        ? `/api/bookings/${booking.id}/availability`
        : `/api/schedule/availability?userId=${person.id}`,
      undefined,
      abort.signal,
    )
      .then((result) => {
        const slots = result.slots;
        setAvailability(result);
        const preferred =
          action === "reschedule" &&
          booking?.proposedStartsAt &&
          booking.proposedEndsAt
            ? slots.find(
                (s) =>
                  s.startsAt <= booking.proposedStartsAt! &&
                  s.endsAt >= booking.proposedEndsAt!,
              )
            : undefined;
        setDate(
          preferred
            ? scheduleDate(booking!.proposedStartsAt!)
            : slots[0]
              ? scheduleDate(slots[0].startsAt)
              : "",
        );
        if (preferred) {
          setChoice(`${preferred.id}:${booking!.proposedStartsAt}`);
          setEndsAt(booking!.proposedEndsAt!);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [action, booking, person.id]);
  const choices = (availability?.slots || [])
    .filter((s) => scheduleDate(s.startsAt) === date)
    .flatMap((s) => {
      const result = [];
      for (
        let t = +new Date(s.startsAt);
        t + QUARTER <= +new Date(s.endsAt);
        t += QUARTER
      ) {
        const startsAt = new Date(t).toISOString();
        result.push({
          key: `${s.id}:${startsAt}`,
          slotId: s.id,
          startsAt,
          limit: s.endsAt,
        });
      }
      return result;
    });
  const selected = choices.find((c) => c.key === choice);
  const endOptions: string[] = [];
  if (selected)
    for (
      let t = +new Date(selected.startsAt) + QUARTER;
      t <= +new Date(selected.limit);
      t += QUARTER
    )
      endOptions.push(new Date(t).toISOString());
  const validSelection = !!selected && endOptions.includes(endsAt);
  const interval = validSelection
    ? { slotId: selected!.slotId, startsAt: selected!.startsAt, endsAt }
    : null;
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (action === "create") {
        await api("/api/bookings", {
          conversationId,
          ...interval,
          title,
          note,
          requestId: requestId.current,
          ...(meetingUrl.trim() ? { meetingUrl } : {}),
        });
      } else {
        if (!booking) return;
        await api(`/api/bookings/${booking.id}`, {
          action,
          version: booking.version,
          ...(action === "reschedule" ? { ...interval, reason: note } : {}),
          ...(action === "request_change"
            ? {
                reason: note,
                ...(interval
                  ? {
                      proposedSlotId: interval.slotId,
                      proposedStartsAt: interval.startsAt,
                      proposedEndsAt: interval.endsAt,
                    }
                  : {}),
              }
            : {}),
          ...(action === "cancel" ? { reason: note } : {}),
          ...(action === "update_link" ? { meetingUrl } : {}),
        });
      }
      await onSaved();
      onClose();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  const dates = [
    ...new Set(availability?.slots.map((s) => scheduleDate(s.startsAt)) || []),
  ];
  const needsSlot = action === "create" || action === "reschedule";
  return (
    <Modal title={titles[action]} onClose={busy ? undefined : onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="eyebrow mb-3">MAKE TIME TO CONNECT</p>
            <h2 className="text-2xl font-semibold">{titles[action]}</h2>
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="关闭预约窗口"
            disabled={busy}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-ink-light leading-7 mb-5">
          与 {person.name || "这位伙伴"} · 北京时间（UTC+8）
        </p>
        {booking && (
          <p className="rounded-xl bg-paper p-3 text-xs leading-6 mb-5">
            原安排：{booking.title}
            <br />
            {formatSlot(booking.startsAt, booking.endsAt)}
          </p>
        )}
        {action === "request_change" && (
          <p className="notice mb-5 text-sm leading-7">
            原时段会标记为不可用。你可以建议新时间，由发起人确认；建议时段在确认前不会被占用。
          </p>
        )}
        {action === "cancel" && (
          <p className="text-sm leading-7 mb-5">
            取消后，双方都会在聊天和时间表中看到更新。历史记录会保留。
          </p>
        )}
        {action === "create" && (
          <label className="block text-sm mb-4">
            交流主题
            <input
              autoFocus
              disabled={busy}
              required
              maxLength={120}
              className="field mt-2"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                requestId.current = crypto.randomUUID();
              }}
              placeholder="例如：产品共建与合作方式"
            />
          </label>
        )}
        {loading ? (
          <p className="flex gap-2 text-sm mb-4">
            <Loader2 size={16} className="animate-spin" />
            正在读取双方可用时间…
          </p>
        ) : (
          availability && (
            <div className="mb-5">
              {availability.note && (
                <p className="text-sm leading-7 text-ink-light mb-3">
                  预约说明：{availability.note}
                </p>
              )}
              {!availability.enabled ? (
                <p className="notice text-sm">
                  暂未开放新的预约，可以继续通过留言商量。
                </p>
              ) : !dates.length ? (
                <p className="notice text-sm">
                  暂时没有双方都空闲的时段，请通过留言商量或请对方补充时间。
                </p>
              ) : (
                <>
                  <label className="block text-sm">
                    选择日期
                    <select
                      disabled={busy}
                      className="field mt-2"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setChoice("");
                        setEndsAt("");
                        requestId.current = crypto.randomUUID();
                      }}
                    >
                      {dates.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <label className="block text-sm">
                      开始时间
                      <select
                        className="field mt-2"
                        disabled={busy}
                        value={choice}
                        onChange={(e) => {
                          const next = choices.find(
                            (c) => c.key === e.target.value,
                          );
                          setChoice(e.target.value);
                          setEndsAt(
                            next
                              ? new Date(
                                  Math.min(
                                    +new Date(next.startsAt) + 2 * QUARTER,
                                    +new Date(next.limit),
                                  ),
                                ).toISOString()
                              : "",
                          );
                          requestId.current = crypto.randomUUID();
                        }}
                      >
                        <option value="">请选择时间</option>
                        {choices.map((c) => (
                          <option key={c.key} value={c.key}>
                            {scheduleTime(c.startsAt)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-sm">
                      结束时间
                      <select
                        className="field mt-2"
                        disabled={busy || !selected}
                        value={endsAt}
                        onChange={(e) => {
                          setEndsAt(e.target.value);
                          requestId.current = crypto.randomUUID();
                        }}
                      >
                        {!selected && <option value="">先选开始时间</option>}
                        {endOptions.map((end) => (
                          <option key={end} value={end}>
                            {scheduleDate(end) === date
                              ? scheduleTime(end)
                              : "24:00"}{" "}
                            ·{" "}
                            {(+new Date(end) - +new Date(selected!.startsAt)) /
                              60000}
                            分钟
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {interval && (
                    <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm leading-6 text-accent-blue">
                      {formatSlot(interval.startsAt, interval.endsAt)}
                      <br />
                      <span className="text-xs">
                        只占用所选会议时间，其他开放时间仍可预约。
                      </span>
                    </p>
                  )}
                  {action === "request_change" && (
                    <button
                      type="button"
                      onClick={() => {
                        setChoice("");
                        setEndsAt("");
                      }}
                      disabled={busy}
                      className="text-xs text-accent-blue mt-3"
                    >
                      暂不建议具体时间
                    </button>
                  )}
                </>
              )}
            </div>
          )
        )}
        {action !== "update_link" && (
          <label className="block text-sm mb-4">
            {action === "request_change"
              ? "无法赴约的原因与建议"
              : action === "create"
                ? "想聊什么（选填）"
                : "给对方的说明（选填）"}
            <textarea
              className="field mt-2"
              rows={4}
              required={action === "request_change"}
              disabled={busy}
              maxLength={action === "create" ? 3000 : 2000}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                requestId.current = crypto.randomUUID();
              }}
            />
          </label>
        )}
        {(action === "create" || action === "update_link") && (
          <label className="block text-sm mb-4">
            Zoom / 腾讯会议等链接（选填）
            <input
              type="url"
              className="field mt-2"
              placeholder="https://…"
              maxLength={2048}
              value={meetingUrl}
              disabled={busy}
              onChange={(e) => {
                setMeetingUrl(e.target.value);
                requestId.current = crypto.randomUUID();
              }}
            />
            <span className="block text-xs text-ink-light leading-6 mt-2">
              粘贴你在会议平台创建的链接，仅预约双方可见；也可以稍后补充。
            </span>
          </label>
        )}
        {error && (
          <p role="alert" className="error-notice mb-4">
            {error}
          </p>
        )}
        {action === "create" && (
          <p className="text-xs text-ink-light leading-6 mb-4">
            提交后即确认，双方时间表同步添加。此处只创建站内预约，不会自动创建会议室。
          </p>
        )}
        <button
          className="btn-primary w-full"
          disabled={
            busy ||
            loading ||
            (needsSlot && !validSelection) ||
            (action === "create" && !title.trim()) ||
            (action === "request_change" && !note.trim())
          }
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <CalendarClock size={16} />
          )}
          {busy
            ? "正在更新…"
            : action === "create"
              ? "确认预约"
              : action === "reschedule"
                ? "确认改到所选时间"
                : action === "request_change"
                  ? "告知对方并申请改期"
                  : action === "cancel"
                    ? "确认取消预约"
                    : "保存会议链接"}
        </button>
      </form>
    </Modal>
  );
}
