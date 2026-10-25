"use client";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, Loader2, X } from "lucide-react";
import { api, errorText } from "@/lib/client";
import { formatSlot, scheduleDate, scheduleTime } from "@/lib/schedule-time";
import type { PersonAvailability, ScheduleBooking } from "@/types/schedule";
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
  const [slotId, setSlotId] = useState("");
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
        const slots = result.slots.filter((s) => s.id !== booking?.slotId);
        setAvailability({ ...result, slots });
        const preferred = slots.find(
          (s) => action === "reschedule" && s.id === booking?.proposedSlotId,
        );
        setDate(
          preferred
            ? scheduleDate(preferred.startsAt)
            : slots[0]
              ? scheduleDate(slots[0].startsAt)
              : "",
        );
        if (preferred) setSlotId(preferred.id);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [action, booking, person.id]);
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      if (action === "create") {
        await api("/api/bookings", {
          conversationId,
          slotId,
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
          ...(action === "reschedule" ? { slotId, reason: note } : {}),
          ...(action === "request_change"
            ? { reason: note, ...(slotId ? { proposedSlotId: slotId } : {}) }
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
                        setSlotId("");
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
                  <div
                    role="group"
                    aria-label="可预约时段"
                    className="grid grid-cols-2 gap-2 mt-3"
                  >
                    {availability.slots
                      .filter((s) => scheduleDate(s.startsAt) === date)
                      .map((s) => (
                        <button
                          type="button"
                          key={s.id}
                          aria-pressed={slotId === s.id}
                          disabled={busy}
                          className={`rounded-xl border px-3 py-3 text-sm ${slotId === s.id ? "border-accent-blue bg-blue-50 text-accent-blue" : "border-border hover:border-accent-blue"}`}
                          onClick={() => {
                            setSlotId(s.id);
                            requestId.current = crypto.randomUUID();
                          }}
                        >
                          {scheduleTime(s.startsAt)}–{scheduleTime(s.endsAt)}
                        </button>
                      ))}
                  </div>
                  {action === "request_change" && (
                    <button
                      type="button"
                      onClick={() => setSlotId("")}
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
            (needsSlot && !slotId) ||
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
