"use client";
import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, errorText } from "@/lib/client";
import { cellsToIntervals, intervalCells } from "@/lib/schedule-intervals";
import type { OwnSchedule } from "@/types/schedule";
import { WeeklyAvailabilityGrid } from "./WeeklyAvailabilityGrid";
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
  const [cells, setCells] = useState(() => intervalCells(data.slots));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
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
        slots: cellsToIntervals(cells),
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
            选出你愿意交流的时间范围，对方再选择具体的会议时间。支持全天开放。
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
      <WeeklyAvailabilityGrid
        cells={cells}
        onChange={setCells}
        bookings={data.bookings}
        disabled={busy}
      />
      {!enabled && cells.size > 0 && (
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
