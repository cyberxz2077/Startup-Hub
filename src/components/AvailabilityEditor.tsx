"use client";
import { useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { api, errorText } from "@/lib/client";
import {
  addDays,
  scheduleBounds,
  scheduleDate,
  scheduleTime,
  slotIso,
} from "@/lib/schedule-time";
import type { OwnSchedule } from "@/types/schedule";
type Row = {
  key: string;
  id?: string;
  date: string;
  start: string;
  end: string;
  booked?: boolean;
};
export function AvailabilityEditor({
  data,
  onSaved,
}: {
  data: OwnSchedule;
  onSaved: (next: OwnSchedule) => void;
}) {
  const [enabled, setEnabled] = useState(data.settings.enabled);
  const [note, setNote] = useState(data.settings.note);
  const [meetingUrl, setMeetingUrl] = useState(data.settings.meetingUrl);
  const [rows, setRows] = useState<Row[]>(
    data.slots.map((s) => ({
      key: s.id,
      id: s.id,
      date: scheduleDate(s.startsAt),
      start: scheduleTime(s.startsAt),
      end: scheduleTime(s.endsAt),
      booked: s.booked,
    })),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const bounds = scheduleBounds();
  const update = (
    key: string,
    field: "date" | "start" | "end",
    value: string,
  ) =>
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, [field]: value } : row,
      ),
    );
  const add = (days = 1) =>
    setRows((current) => [
      ...current,
      ...Array.from({ length: days }, (_, i) => ({
        key: crypto.randomUUID(),
        date: addDays(bounds.min, i + 1),
        start: "14:00",
        end: "14:30",
      })),
    ]);
  const save = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await api<OwnSchedule>("/api/schedule", {
        enabled,
        note,
        meetingUrl,
        version: data.settings.version,
        slots: rows.map((row) => ({
          ...(row.id ? { id: row.id } : {}),
          startsAt: slotIso(row.date, row.start),
          endsAt: slotIso(row.date, row.end),
        })),
      });
      onSaved(next);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  return (
    <form
      className="surface p-5 md:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-semibold">由你决定何时开放交流</h2>
          <p className="text-sm text-ink-light mt-3 leading-7">
            北京时间（UTC+8）。每个时段可预约一次，时长15–120分钟。
          </p>
        </div>
        <button className="btn-primary" disabled={busy}>
          {busy && <Loader2 size={15} className="animate-spin" />}保存预约设置
        </button>
      </div>
      <fieldset disabled={busy} className="grid md:grid-cols-2 gap-3 mb-6">
        <legend className="sr-only">是否开放预约</legend>
        <label
          className={`rounded-2xl border p-4 cursor-pointer ${!enabled ? "border-accent-blue bg-blue-50/50" : "border-border"}`}
        >
          <input
            type="radio"
            name="availability"
            checked={!enabled}
            onChange={() => setEnabled(false)}
            className="mr-2"
          />
          <strong className="text-sm">只接受留言</strong>
          <span className="block mt-2 text-xs text-ink-light leading-6">
            关闭新的预约入口。已有预约继续保留，可逐条沟通改期。
          </span>
        </label>
        <label
          className={`rounded-2xl border p-4 cursor-pointer ${enabled ? "border-accent-blue bg-blue-50/50" : "border-border"}`}
        >
          <input
            type="radio"
            name="availability"
            checked={enabled}
            onChange={() => setEnabled(true)}
            className="mr-2"
          />
          <strong className="text-sm">开放时间预约</strong>
          <span className="block mt-2 text-xs text-ink-light leading-6">
            未来三天内至少提供一个空闲时段，最多开放未来30天。
          </span>
        </label>
      </fieldset>
      <label className="block text-sm mb-5">
        预约说明
        <textarea
          className="field mt-2"
          rows={3}
          maxLength={600}
          value={note}
          disabled={busy}
          onChange={(e) => setNote(e.target.value)}
          placeholder="适合聊的话题、会前准备、合作偏好…"
        />
      </label>
      <label className="block text-sm mb-6">
        默认线上会议链接（选填）
        <input
          className="field mt-2"
          type="url"
          maxLength={2048}
          value={meetingUrl}
          disabled={busy}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="粘贴 Zoom、腾讯会议等 HTTPS 链接"
        />
        <span className="block text-xs text-ink-light leading-6 mt-2">
          只在新预约确认后提供给预约双方；修改默认值不会改动已有会议。
        </span>
      </label>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="font-semibold">
          可预约时段{" "}
          <span className="font-normal text-xs text-ink-light">
            {rows.length} / 120
          </span>
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy || rows.length > 117}
            className="btn-secondary !text-xs !py-2"
            onClick={() => add(3)}
          >
            填入未来三天
          </button>
          <button
            type="button"
            disabled={busy || rows.length >= 120}
            className="btn-secondary !text-xs !py-2"
            onClick={() => add()}
          >
            <Plus size={14} />
            添加时段
          </button>
        </div>
      </div>
      {rows.length === 0 && (
        <p className="rounded-xl bg-paper p-6 text-sm text-ink-light mb-5">
          还没有设置时间。你可以先填入未来三天，再按实际安排调整。
        </p>
      )}
      <div className="space-y-3 mb-5">
        {rows.map((row, index) => (
          <fieldset
            key={row.key}
            disabled={busy}
            className="rounded-xl border border-border p-3 flex flex-wrap items-end gap-3"
          >
            <legend className="sr-only">可用时段 {index + 1}</legend>
            <label className="text-[11px] text-ink-light flex-1 min-w-[150px]">
              日期
              <input
                aria-label={`时段${index + 1}日期`}
                required
                disabled={row.booked}
                type="date"
                min={bounds.min}
                max={bounds.max}
                value={row.date}
                onChange={(e) => update(row.key, "date", e.target.value)}
                className="field mt-1"
              />
            </label>
            <label className="text-[11px] text-ink-light flex-1 min-w-[100px]">
              开始
              <input
                aria-label={`时段${index + 1}开始`}
                required
                disabled={row.booked}
                type="time"
                step={900}
                value={row.start}
                onChange={(e) => update(row.key, "start", e.target.value)}
                className="field mt-1"
              />
            </label>
            <label className="text-[11px] text-ink-light flex-1 min-w-[100px]">
              结束
              <input
                aria-label={`时段${index + 1}结束`}
                required
                disabled={row.booked}
                type="time"
                step={900}
                value={row.end}
                onChange={(e) => update(row.key, "end", e.target.value)}
                className="field mt-1"
              />
            </label>
            {row.booked ? (
              <span className="text-xs text-accent-blue py-3">
                已有预约，请在计划中申请改期
              </span>
            ) : (
              <button
                type="button"
                className="icon-btn mb-1"
                aria-label={`移除时段${index + 1}`}
                onClick={() =>
                  setRows((current) => current.filter((r) => r.key !== row.key))
                }
              >
                <X size={16} />
              </button>
            )}
          </fieldset>
        ))}
      </div>
      {!enabled && rows.length > 0 && (
        <p className="notice text-xs mb-4">
          这些时段会保留，但在开启预约前不会提供给别人选择。
        </p>
      )}
      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <button className="btn-primary" disabled={busy}>
        {busy ? "正在保存…" : "保存预约设置"}
      </button>
    </form>
  );
}
