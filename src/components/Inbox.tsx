"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  MessageSquare,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { api, errorText } from "@/lib/client";
type Conversation = {
  id: string;
  person: { id: string; name: string | null };
  lastMessage: string;
  updatedAt: string;
};
type Message = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};
export function Inbox({
  userId,
  initialId,
}: {
  userId: string;
  initialId?: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(initialId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const lock = useRef(false);
  const end = useRef<HTMLDivElement>(null);
  const requestId = useRef(crypto.randomUUID());
  const load = useCallback(async () => {
    try {
      const rows = await api<Conversation[]>("/api/inbox");
      setConversations(rows);
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
    setError("");
    setText("");
    requestId.current = crypto.randomUUID();
    api<{ messages: Message[]; nextCursor: string | null }>(
      `/api/inbox?conversation=${selected}`,
      undefined,
      abort.signal,
    )
      .then((r) => {
        setMessages(r.messages);
        setCursor(r.nextCursor);
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoadingMessages(false);
      });
    return () => abort.abort();
  }, [selected]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [selected, messages.length]);
  const refresh = async () => {
    setError("");
    await load();
    if (selected) {
      try {
        const r = await api<{ messages: Message[]; nextCursor: string | null }>(
          `/api/inbox?conversation=${selected}`,
        );
        setMessages(r.messages);
        setCursor(r.nextCursor);
      } catch (e) {
        setError(errorText(e));
      }
    }
  };
  const earlier = async () => {
    if (!cursor || !selected) return;
    try {
      const r = await api<{ messages: Message[]; nextCursor: string | null }>(
        `/api/inbox?conversation=${selected}&before=${cursor}`,
      );
      setMessages((m) => [...r.messages, ...m]);
      setCursor(r.nextCursor);
    } catch (e) {
      setError(errorText(e));
    }
  };
  const send = async () => {
    if (!selected || !text.trim() || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await api<{ message: Message }>("/api/inbox", {
        conversationId: selected,
        content: text,
        requestId: requestId.current,
      });
      setMessages((m) =>
        m.some((v) => v.id === r.message.id) ? m : [...m, r.message],
      );
      setText("");
      requestId.current = crypto.randomUUID();
      await load();
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const person = conversations.find((c) => c.id === selected)?.person;
  return (
    <section className="page-container py-8 md:py-12">
      <div className="flex justify-between items-center mb-7">
        <div>
          <p className="eyebrow mb-3">CONVERSATIONS THAT MATTER</p>
          <h1 className="text-3xl font-semibold">从一句你好开始。</h1>
        </div>
        <button
          className="icon-btn"
          title="刷新消息"
          aria-label="刷新消息"
          onClick={() => void refresh()}
        >
          <RefreshCw size={18} />
        </button>
      </div>
      {error && (
        <p role="alert" className="error-notice mb-4">
          {error}
        </p>
      )}
      <div className="surface flex overflow-hidden h-[calc(100dvh-240px)] min-h-[440px]">
        <aside
          className={`w-full md:w-[280px] shrink-0 md:border-r border-border overflow-y-auto ${selected ? "hidden md:block" : ""}`}
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
                从项目详情或匹配结果，向感兴趣的人打个招呼。
              </p>
            </div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                disabled={busy}
                onClick={() => setSelected(c.id)}
                className={`w-full text-left p-5 border-b border-border transition-colors ${selected === c.id ? "bg-blue-50/80" : "hover:bg-paper"}`}
              >
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-paper border border-border flex items-center justify-center text-accent-blue">
                    {c.person.name?.[0] || "H"}
                  </span>
                  <span className="font-semibold text-sm">
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
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
                <button
                  className="icon-btn md:hidden"
                  disabled={busy}
                  onClick={() => setSelected(null)}
                  aria-label="返回会话列表"
                >
                  <ArrowLeft size={17} />
                </button>
                <h2 className="text-sm font-semibold">
                  {person?.name || "社区成员"}
                </h2>
                <span className="text-[10px] text-ink-light ml-auto">
                  站内消息
                </span>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5"
                role="log"
                aria-live="polite"
              >
                {cursor && (
                  <button
                    onClick={() => void earlier()}
                    className="text-xs text-accent-blue block mx-auto"
                  >
                    加载更早的消息
                  </button>
                )}
                {loadingMessages ? (
                  <Loader2
                    className="animate-spin mx-auto mt-10"
                    aria-label="正在加载消息"
                  />
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.senderId === userId ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 whitespace-pre-wrap text-sm leading-7 break-words ${m.senderId === userId ? "bg-accent-blue text-white" : "bg-paper border border-border"}`}
                      >
                        {m.content}
                        <time
                          className={`block text-[10px] mt-1 ${m.senderId === userId ? "text-white/70" : "text-ink-light"}`}
                          dateTime={m.createdAt}
                        >
                          {new Date(m.createdAt).toLocaleString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                    </div>
                  ))
                )}
                <div ref={end} />
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void send();
                }}
                className="p-4 border-t border-border flex items-end gap-3"
              >
                <label className="sr-only" htmlFor="reply">
                  回复消息
                </label>
                <textarea
                  id="reply"
                  className="field resize-none"
                  rows={2}
                  value={text}
                  maxLength={4000}
                  onChange={(e) => {
                    setText(e.target.value);
                    requestId.current = crypto.randomUUID();
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="写一条消息…"
                />
                <button
                  className="btn-primary !rounded-xl !px-3"
                  disabled={busy || !text.trim() || loadingMessages}
                  aria-label="发送回复"
                >
                  {busy ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <ArrowUp size={17} />
                  )}
                </button>
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
                在左侧选择一段对话。
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
