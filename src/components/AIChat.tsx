"use client";
import { useState, useRef, useEffect } from "react";
import {
  AudioLines,
  Loader2,
  Paperclip,
  X,
  ArrowUp,
  RotateCcw,
} from "lucide-react";
import { Message, Attachment } from "@/types";

export function AIChat({
  messages,
  onSendMessage,
  loading,
  error,
  persona,
}: {
  messages: Message[];
  onSendMessage: (
    text: string,
    attachment?: Attachment | null,
  ) => Promise<boolean>;
  loading: boolean;
  error?: string;
  persona: string;
}) {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [fileError, setFileError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textInput = useRef<HTMLTextAreaElement>(null);
  const sending = useRef(false);
  useEffect(() => {
    end.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "nearest",
    });
  }, [messages, loading]);
  const send = async (text = input.trim()) => {
    if ((!text && !attachment) || loading || sending.current) return;
    sending.current = true;
    setFileError("");
    const sentAttachment = attachment;
    try {
      const sent = await onSendMessage(text, sentAttachment);
      if (sent) {
        // Preserve anything the user starts writing while the response is pending.
        setInput((current) => (current.trim() === text ? "" : current));
        setAttachment((current) =>
          current === sentAttachment ? null : current,
        );
        if (fileInput.current) fileInput.current.value = "";
      }
    } finally {
      sending.current = false;
    }
  };
  const choose = (suggestion: string) => {
    if (loading || sending.current) return;
    if (input.trim() || attachment) {
      setInput((current) =>
        current.trim() ? `${current}\n${suggestion}` : suggestion,
      );
      textInput.current?.focus();
      return;
    }
    // Keep the selected answer in the composer if this request fails.
    setInput(suggestion);
    void send(suggestion);
  };
  const readFile = async (file?: File) => {
    setFileError("");
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 50000) {
      setFileError(
        "请使用 50 KB 以内的 TXT 或 Markdown 文件；PDF / Word 请粘贴正文。",
      );
      return;
    }
    try {
      const text = await file.text();
      if (text.length > 12000 || text.includes("\0") || !text.trim())
        throw new Error();
      setAttachment({ name: file.name, data: text, mimeType: "text/plain" });
    } catch {
      setFileError(
        "无法读取这份文本，请使用 UTF-8 编码且不超过 12,000 字符的文件。",
      );
    }
  };
  return (
    <section
      className="flex h-full min-h-0 flex-col bg-white"
      aria-label="AI 对话助手"
    >
      <div className="flex items-center gap-3 p-5 border-b border-border">
        <span className="rounded-xl bg-blue-50 text-accent-blue p-2.5">
          <AudioLines size={20} />
        </span>
        <div>
          <h2 className="font-semibold text-sm">{persona}</h2>
          <p className="mt-1 text-[11px] text-ink-light">
            把想法说出来，一起梳理清楚
          </p>
        </div>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-5 space-y-5"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message, i) => (
          <div key={i} className={message.role === "user" ? "ml-6" : "mr-3"}>
            <p className="text-[10px] text-ink-light mb-2 font-mono">
              {message.role === "user" ? "YOU" : "HUB ASSISTANT"}
            </p>
            <div
              className={`text-sm leading-7 whitespace-pre-wrap break-words ${message.role === "user" ? "bg-[#F1F4FC] rounded-2xl px-4 py-3" : ""}`}
            >
              {message.text}
            </div>
            {message.role === "model" &&
              i === messages.length - 1 &&
              !!message.suggestions?.length && (
                <div className="mt-4" role="group" aria-label="建议回答">
                  <div className="flex flex-col gap-2">
                    {message.suggestions.map((suggestion, index) => (
                      <button
                        key={`${index}:${suggestion}`}
                        type="button"
                        disabled={loading}
                        onClick={() => choose(suggestion)}
                        className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/50 px-3 py-2.5 text-left text-xs leading-5 text-ink transition-colors hover:border-accent-blue hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-blue disabled:opacity-50"
                      >
                        <span
                          aria-hidden="true"
                          className="font-mono text-accent-blue shrink-0"
                        >
                          {index + 1}
                        </span>
                        <span className="min-w-0 break-words">
                          {suggestion}
                        </span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] leading-5 text-ink-light">
                    {input.trim() || attachment
                      ? "选择会补充到输入框，发送前可以修改。"
                      : "点击选择，也可以直接输入自己的想法。"}
                  </p>
                </div>
              )}
          </div>
        ))}
        {loading && (
          <p
            className="flex items-center gap-2 text-sm text-ink-light"
            role="status"
          >
            <Loader2 size={15} className="animate-spin" /> 正在整理你的想法…
          </p>
        )}
        <div ref={end} />
      </div>
      <div className="p-4 border-t border-border">
        {(error || fileError) && (
          <p role="alert" className="error-notice mb-3 text-xs">
            {error || fileError}
          </p>
        )}
        {attachment && (
          <div className="mb-3 flex items-center justify-between text-xs gap-2 bg-blue-50 rounded-lg px-3 py-2">
            <span className="truncate">{attachment.name}</span>
            <button
              disabled={loading}
              onClick={() => setAttachment(null)}
              aria-label="移除附件"
              className="p-1"
            >
              <X size={14} />
            </button>
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="rounded-2xl border border-border bg-paper p-3 focus-within:border-accent-blue"
        >
          <label className="sr-only" htmlFor="ai-input">
            告诉 AI 你的想法
          </label>
          <textarea
            id="ai-input"
            ref={textInput}
            value={input}
            maxLength={4000}
            onChange={(e) => setInput(e.target.value)}
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
            placeholder="比如：我正在做一个帮助独立开发者的工具…"
            className="w-full bg-transparent resize-none outline-none text-sm leading-6 min-h-20"
            rows={3}
          />
          <div className="flex items-center justify-between">
            <input
              type="file"
              ref={fileInput}
              disabled={loading}
              className="hidden"
              accept=".txt,.md"
              onChange={(e) => void readFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => fileInput.current?.click()}
              title="添加 TXT / Markdown 资料"
              aria-label="添加文字附件"
              className="icon-btn"
            >
              <Paperclip size={17} />
            </button>
            <span className="text-[10px] text-ink-light">
              Enter 发送 · Shift + Enter 换行
            </span>
            <button
              className="rounded-xl bg-accent-blue text-white p-2.5"
              disabled={loading || (!input.trim() && !attachment)}
              aria-label={error ? "重试发送" : "发送消息"}
            >
              {loading ? (
                <Loader2 size={17} className="animate-spin" />
              ) : error ? (
                <RotateCcw size={17} />
              ) : (
                <ArrowUp size={17} />
              )}
            </button>
          </div>
        </form>
        <p className="text-[10px] text-ink-light mt-3 leading-5">
          消息和当前档案将发送给 DeepSeek。AI 建议可直接修改，确认后再发布。
        </p>
      </div>
    </section>
  );
}
