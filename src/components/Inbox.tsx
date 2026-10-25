"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUp,
  CalendarClock,
  Mail,
  MessageSquare,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { api, errorText } from "@/lib/client";
import { formatSlot } from "@/lib/schedule-time";
import type { BookingEvent, ScheduleBooking } from "@/types/schedule";
import { BookingCard } from "./BookingCard";
import { BookingDialog, type BookingAction } from "./BookingDialog";

type Conversation = {
  id: string;
  person: {
    id: string;
    name: string | null;
    profile?: { published: boolean } | null;
  };
  lastMessage: string;
  updatedAt: string;
};
type Message = {
  id: string;
  senderId: string;
  content: string;
  subject: string;
  emailSent: boolean;
  kind: string;
  bookingId: string | null;
  bookingEvent: BookingEvent | null;
  createdAt: string;
};
type Draft = {
  content: string;
  subject: string;
  emailSent: boolean;
  long: boolean;
  requestId: string;
};
const emptyDraft = (): Draft => ({
  content: "",
  subject: "",
  emailSent: false,
  long: false,
  requestId: crypto.randomUUID(),
});
const eventLabels: Record<BookingEvent["action"], string> = {
  created: "发起了预约",
  rescheduled: "确认了新时间",
  change_requested: "原时段不可用，提出改期",
  cancelled: "取消了预约",
  link_updated: "更新了会议链接",
};
function MessageBody({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(false);
  const long = message.content.length > 1200;
  return (
    <>
      {message.subject && (
        <h3 className="font-semibold mb-3 border-b border-current/20 pb-2">
          {message.subject}
        </h3>
      )}
      <p className="whitespace-pre-wrap break-words">
        {long && !expanded
          ? `${message.content.slice(0, 900)}…`
          : message.content}
      </p>
      {long && (
        <button
          className="underline underline-offset-4 text-xs mt-3"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded
            ? "收起长信"
            : `展开全文（${message.content.length.toLocaleString()}字）`}
        </button>
      )}
      {message.emailSent && (
        <p className="mt-3 text-xs opacity-80 flex items-start gap-1.5">
          <Mail size={13} className="shrink-0 mt-1" />
          发件人注明：已通过其他邮箱另发邮件，请注意查收。
        </p>
      )}
    </>
  );
}
export function Inbox({
  userId,
  initialId,
}: {
  userId: string;
  initialId?: string;
}) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(initialId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [threadTab, setThreadTab] = useState("messages");
  const [dialog, setDialog] = useState<{
    action: BookingAction;
    booking?: ScheduleBooking;
  } | null>(null);
  const lock = useRef(false);
  const refreshLock = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const draftRef = useRef(draft);
  draftRef.current = draft;
  useEffect(() => {
    setSelected(initialId || null);
  }, [initialId]);
  const storeDraft = (id: string, value: Draft) => {
    try {
      sessionStorage.setItem(
        `hub:letter:${userId}:${id}`,
        JSON.stringify(value),
      );
    } catch {
      /* Optional tab-local recovery. */
    }
  };
  const edit = (update: Partial<Draft>) => {
    const next = {
      ...draftRef.current,
      ...update,
      requestId: crypto.randomUUID(),
    };
    draftRef.current = next;
    setDraft(next);
    if (selected) storeDraft(selected, next);
  };
  const load = useCallback(async () => {
    try {
      setConversations(await api<Conversation[]>("/api/inbox"));
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
    if (!selected) return;
    const abort = new AbortController();
    setLoadingMessages(true);
    setMessages([]);
    setBookings([]);
    setCursor(null);
    setError("");
    setThreadTab("messages");
    let restored = emptyDraft();
    try {
      const saved = JSON.parse(
        sessionStorage.getItem(`hub:letter:${userId}:${selected}`) || "null",
      );
      if (
        saved &&
        typeof saved.content === "string" &&
        typeof saved.subject === "string"
      )
        restored = {
          ...restored,
          content: saved.content.slice(0, 20000),
          subject: saved.subject.slice(0, 160),
          emailSent: saved.emailSent === true,
          long: saved.long === true,
          requestId:
            typeof saved.requestId === "string"
              ? saved.requestId
              : restored.requestId,
        };
    } catch {
      /* Invalid cache is ignored. */
    }
    draftRef.current = restored;
    setDraft(restored);
    Promise.all([
      api<{ messages: Message[]; nextCursor: string | null }>(
        `/api/inbox?conversation=${selected}`,
        undefined,
        abort.signal,
      ),
      api<ScheduleBooking[]>(
        `/api/bookings?conversation=${selected}`,
        undefined,
        abort.signal,
      ),
    ])
      .then(([r, plans]) => {
        if (!abort.signal.aborted) {
          setMessages(r.messages);
          setCursor(r.nextCursor);
          setBookings(plans);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoadingMessages(false);
      });
    return () => abort.abort();
  }, [selected, userId]);
  const refresh = useCallback(async () => {
    if (refreshLock.current) return;
    refreshLock.current = true;
    const id = selectedRef.current;
    try {
      await load();
      if (id) {
        const [r, plans] = await Promise.all([
          api<{ messages: Message[]; nextCursor: string | null }>(
            `/api/inbox?conversation=${id}`,
          ),
          api<ScheduleBooking[]>(`/api/bookings?conversation=${id}`),
        ]);
        if (selectedRef.current === id) {
          setMessages((previous) =>
            [
              ...new Map(
                [...previous, ...r.messages].map((m) => [m.id, m]),
              ).values(),
            ].sort(
              (a, b) =>
                a.createdAt.localeCompare(b.createdAt) ||
                a.id.localeCompare(b.id),
            ),
          );
          setBookings(plans);
          setError("");
        }
      }
    } catch (e) {
      if (selectedRef.current === id) setError(errorText(e));
    } finally {
      refreshLock.current = false;
    }
  }, [load]);
  useEffect(() => {
    const poll = () => {
      if (!document.hidden && !lock.current) void refresh();
    };
    const timer = setInterval(poll, 20000);
    window.addEventListener("focus", poll);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", poll);
    };
  }, [refresh]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [selected, messages.length, threadTab]);
  const earlier = async () => {
    const id = selected;
    if (!cursor || !id) return;
    try {
      const r = await api<{ messages: Message[]; nextCursor: string | null }>(
        `/api/inbox?conversation=${id}&before=${cursor}`,
      );
      if (selectedRef.current === id) {
        setMessages((previous) => [
          ...new Map(
            [...r.messages, ...previous].map((m) => [m.id, m]),
          ).values(),
        ]);
        setCursor(r.nextCursor);
      }
    } catch (e) {
      setError(errorText(e));
    }
  };
  const send = async () => {
    const id = selected;
    const sent = draftRef.current;
    if (!id || !sent.content.trim() || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ message: Message }>("/api/inbox", {
        conversationId: id,
        content: sent.content,
        subject: sent.subject,
        emailSent: sent.emailSent,
        requestId: sent.requestId,
      });
      if (selectedRef.current === id) {
        setMessages((current) =>
          current.some((m) => m.id === r.message.id)
            ? current
            : [...current, r.message],
        );
        if (draftRef.current.requestId === sent.requestId) {
          const blank = emptyDraft();
          draftRef.current = blank;
          setDraft(blank);
          storeDraft(id, blank);
        }
      }
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const person = conversations.find((c) => c.id === selected)?.person;
  const needsAction = bookings.filter(
    (b) => b.status === "change_requested",
  ).length;
  return (
    <section className="page-container py-7 md:py-10">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <p className="eyebrow mb-3">CONVERSATIONS THAT MATTER</p>
          <h1 className="text-3xl font-semibold">聊想法，也约下一步。</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link className="btn-secondary !text-xs" href="/?view=schedule">
            <CalendarClock size={16} />
            我的时间表
          </Link>
          <button
            className="icon-btn"
            title="刷新消息"
            aria-label="刷新消息"
            onClick={() => void refresh()}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <div
        className={`surface flex overflow-hidden ${draft.long ? "min-h-[720px] h-[calc(100dvh-210px)]" : "h-[calc(100dvh-230px)] min-h-[570px]"}`}
      >
        <aside
          className={`w-full md:w-[250px] shrink-0 md:border-r border-border overflow-y-auto ${selected ? "hidden md:block" : ""}`}
          aria-label="会话列表"
        >
          {loading ? (
            <p className="p-7 text-sm text-ink-light">正在加载…</p>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare
                size={28}
                className="mx-auto mb-4 text-accent-blue"
              />
              <p className="font-semibold">还没有对话</p>
              <p className="mt-3 text-sm text-ink-light leading-7">
                从用户或项目详情，向感兴趣的人打个招呼。
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                disabled={busy}
                onClick={() => {
                  setSelected(c.id);
                  router.replace(`/?view=inbox&conversation=${c.id}`);
                }}
                className={`w-full text-left p-5 border-b border-border transition-colors ${selected === c.id ? "bg-blue-50/80" : "hover:bg-paper"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 shrink-0 rounded-xl bg-paper border border-border flex items-center justify-center text-accent-blue">
                    {c.person.name?.[0] || "H"}
                  </span>
                  <span className="font-semibold text-sm break-words">
                    {c.person.name || "社区成员"}
                  </span>
                </div>
                <p className="text-xs text-ink-light mt-3 truncate">
                  {c.lastMessage}
                </p>
              </button>
            ))
          )}
        </aside>
        <div
          className={`flex-1 min-w-0 flex-col ${selected ? "flex" : "hidden md:flex"}`}
        >
          {selected ? (
            <>
              <div className="px-4 py-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    className="icon-btn md:hidden"
                    disabled={busy}
                    onClick={() => {
                      setSelected(null);
                      router.replace("/?view=inbox");
                    }}
                    aria-label="返回会话列表"
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <h2 className="text-sm font-semibold min-w-0 flex-1 break-words">
                    {person?.profile?.published ? (
                      <Link
                        className="hover:text-accent-blue"
                        href={`/?view=profile_detail&id=${person.id}`}
                      >
                        {person.name || "社区成员"} ↗
                      </Link>
                    ) : (
                      person?.name || "社区成员"
                    )}
                  </h2>
                  <button
                    className="btn-primary !text-xs !py-2 !px-3 shrink-0"
                    disabled={!person || loadingMessages}
                    onClick={() => setDialog({ action: "create" })}
                  >
                    <CalendarClock size={14} />
                    预约时间
                  </button>
                </div>
                <div className="flex gap-4 mt-3 text-xs">
                  <button
                    className={
                      threadTab === "messages"
                        ? "text-accent-blue font-semibold"
                        : "text-ink-light"
                    }
                    onClick={() => setThreadTab("messages")}
                  >
                    留言与长信
                  </button>
                  <button
                    className={
                      threadTab === "bookings"
                        ? "text-accent-blue font-semibold"
                        : "text-ink-light"
                    }
                    onClick={() => setThreadTab("bookings")}
                  >
                    双方预约 · {bookings.length}
                    {needsAction > 0 && (
                      <span className="ml-1 text-amber-700">
                        （{needsAction}待改期）
                      </span>
                    )}
                  </button>
                  <span className="ml-auto text-[10px] text-ink-light hidden sm:inline">
                    每20秒自动更新
                  </span>
                </div>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto p-4 md:p-5 space-y-4"
                role={threadTab === "messages" ? "log" : undefined}
                aria-live="polite"
              >
                {loadingMessages ? (
                  <Loader2
                    className="animate-spin mx-auto mt-10"
                    aria-label="正在加载消息"
                  />
                ) : threadTab === "bookings" ? (
                  <>
                    {bookings.length === 0 && (
                      <p className="text-sm text-ink-light p-5 leading-7">
                        还没有安排会议。点上方“预约时间”，查看对方开放的时段。
                      </p>
                    )}
                    {bookings.map((b) => (
                      <BookingCard
                        key={b.id}
                        booking={b}
                        userId={userId}
                        onAction={(action, booking) =>
                          setDialog({ action, booking })
                        }
                      />
                    ))}
                  </>
                ) : (
                  <>
                    {cursor && (
                      <button
                        onClick={() => void earlier()}
                        className="text-xs text-accent-blue block mx-auto"
                      >
                        加载更早的消息
                      </button>
                    )}
                    {messages.map((m) =>
                      m.kind === "booking" && m.bookingEvent ? (
                        <div
                          key={m.id}
                          className="rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm leading-7 max-w-xl mx-auto"
                        >
                          <p className="font-semibold flex items-center gap-2">
                            <CalendarClock
                              size={16}
                              className="text-accent-blue"
                            />
                            {m.senderId === userId
                              ? "你"
                              : person?.name || "对方"}
                            {eventLabels[m.bookingEvent.action]}
                          </p>
                          <p className="mt-2">
                            {m.bookingEvent.title} ·{" "}
                            {formatSlot(
                              m.bookingEvent.startsAt,
                              m.bookingEvent.endsAt,
                            )}
                          </p>
                          {m.bookingEvent.reason && (
                            <p className="text-ink-light mt-2 whitespace-pre-wrap break-words">
                              {m.bookingEvent.reason}
                            </p>
                          )}
                          {m.bookingEvent.proposedStartsAt &&
                            m.bookingEvent.proposedEndsAt && (
                              <p className="mt-2 text-ink-light">
                                建议：
                                {formatSlot(
                                  m.bookingEvent.proposedStartsAt,
                                  m.bookingEvent.proposedEndsAt,
                                )}
                              </p>
                            )}
                          <div className="flex flex-wrap justify-between gap-2 mt-3">
                            <time
                              className="text-[10px] text-ink-light"
                              dateTime={m.createdAt}
                            >
                              {new Date(m.createdAt).toLocaleString("zh-CN", {
                                timeZone: "Asia/Shanghai",
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                            <button
                              className="text-xs text-accent-blue"
                              onClick={() => setThreadTab("bookings")}
                            >
                              查看 / 处理预约 →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={m.id}
                          className={`flex ${m.senderId === userId ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[94%] md:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 break-words ${m.senderId === userId ? "bg-accent-blue text-white" : "bg-paper border border-border"}`}
                          >
                            <MessageBody message={m} />
                            <time
                              className={`block text-[10px] mt-2 ${m.senderId === userId ? "text-white/70" : "text-ink-light"}`}
                              dateTime={m.createdAt}
                            >
                              {new Date(m.createdAt).toLocaleString("zh-CN", {
                                timeZone: "Asia/Shanghai",
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </time>
                          </div>
                        </div>
                      ),
                    )}
                    <div ref={end} />
                  </>
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className="p-3 md:p-4 border-t border-border shrink-0 bg-white"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <button
                    type="button"
                    className="text-xs text-accent-blue"
                    onClick={() => edit({ long: !draft.long })}
                  >
                    {draft.long ? "收起长信编辑" : "写一封长信"}
                  </button>
                  <span className="text-[10px] text-ink-light">
                    {draft.content.length.toLocaleString()} / 20,000
                  </span>
                </div>
                {draft.long && (
                  <label className="block text-xs text-ink-light mb-2">
                    信件主题
                    <input
                      className="field mt-1 !py-2"
                      maxLength={160}
                      value={draft.subject}
                      onChange={(e) => edit({ subject: e.target.value })}
                      placeholder="例如：合作背景、讨论问题与会前材料"
                    />
                  </label>
                )}
                <div className="flex gap-2 items-end">
                  <label className="sr-only" htmlFor="reply">
                    回复消息
                  </label>
                  <textarea
                    id="reply"
                    className="field resize-y max-h-[250px]"
                    rows={draft.long ? 7 : 3}
                    value={draft.content}
                    maxLength={20000}
                    onChange={(e) => edit({ content: e.target.value })}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        (e.ctrlKey || e.metaKey) &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    placeholder={
                      draft.long
                        ? "像写邮件一样，完整介绍背景、想法和问题…"
                        : "写一条消息，或展开写一封长信…"
                    }
                  />
                  <button
                    className="btn-primary !rounded-xl !px-3 !py-3"
                    disabled={busy || !draft.content.trim() || loadingMessages}
                    aria-label="发送回复"
                  >
                    {busy ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <ArrowUp size={17} />
                    )}
                  </button>
                </div>
                {draft.long && (
                  <label className="flex items-start gap-2 mt-2 text-[11px] text-ink-light leading-5">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={draft.emailSent}
                      onChange={(e) => edit({ emailSent: e.target.checked })}
                    />
                    我已通过其他邮箱另发邮件，请对方注意查收（仅标记，本站不代发）
                  </label>
                )}
                <p className="text-[10px] text-ink-light mt-2">
                  Enter 换行 · Ctrl / ⌘ + Enter 发送 · 草稿随当前标签页保留
                </p>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center p-8 text-center">
              <MessageSquare
                size={36}
                className="text-accent-blue mb-5"
                strokeWidth={1.3}
              />
              <h2 className="text-xl font-semibold">
                好的合作，始于真实的交流。
              </h2>
              <p className="text-sm text-ink-light mt-4">
                选择一段对话，写信或安排下一场会议。
              </p>
            </div>
          )}
        </div>
      </div>
      {dialog && person && selected && (
        <BookingDialog
          {...dialog}
          person={person}
          conversationId={selected}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      )}
    </section>
  );
}
