"use client";
import { useRef, useState } from "react";
import { X, Send } from "lucide-react";
import { api, errorText } from "@/lib/client";
import { Modal } from "./ui/Modal";
export type ContactTarget = {
  targetId: string;
  targetType: "project" | "user";
  name: string;
};
export function ContactDialog({
  target,
  onClose,
  onSent,
}: {
  target: ContactTarget;
  onClose: () => void;
  onSent: (id: string) => void;
}) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const lock = useRef(false);
  const send = async () => {
    if (lock.current || !content.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ conversationId: string }>("/api/inbox", {
        targetId: target.targetId,
        targetType: target.targetType,
        content,
        requestId: requestId.current,
      });
      onSent(result.conversationId);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
      lock.current = false;
    }
  };
  return (
    <Modal title="开启一段交流" onClose={busy ? undefined : onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-3">START A CONVERSATION</p>
            <h2 id="modal-title" className="text-2xl font-semibold">
              联系 {target.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="icon-btn"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>
        <p className="text-sm text-ink-light leading-7 mt-4 mb-5">
          介绍一下你自己，以及你对合作的想法。对方将在站内收件箱收到这条消息。
        </p>
        <label className="sr-only" htmlFor="contact-content">
          你的消息
        </label>
        <textarea
          autoFocus
          id="contact-content"
          className="field leading-7"
          rows={5}
          required
          maxLength={4000}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            requestId.current = crypto.randomUUID();
          }}
          placeholder="你好，我看到你的项目…"
        />
        {error && (
          <p role="alert" className="error-notice mt-4">
            {error}
          </p>
        )}
        <button className="btn-primary mt-5" disabled={busy || !content.trim()}>
          <Send size={15} />
          {busy ? "发送中…" : "发送站内消息"}
        </button>
      </form>
    </Modal>
  );
}
