"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Eye,
  Pencil,
  Save,
  ArrowUpRight,
  Loader2,
  MessageSquare,
  FileText,
} from "lucide-react";
import {
  ProjectData,
  ProfileData,
  initialProfileData,
  initialProjectData,
  Message,
  Attachment,
} from "@/types";
import { api, errorText } from "@/lib/client";
import { projectSchema, profileSchema } from "@/lib/validation";
import { AIChat } from "./AIChat";
import Image from "next/image";
import { AvatarCropper } from "./ui/AvatarCropper";
import { Modal } from "./ui/Modal";
import { ProjectArtifact } from "./ProjectArtifact";

type Draft = ProjectData | ProfileData;
const projectLabels: Record<keyof ProjectData, string> = {
  name: "项目名称",
  oneLiner: "一句话介绍",
  sector: "领域",
  location: "所在城市 / 远程",
  stage: "当前阶段",
  vision: "项目愿景",
  problem: "要解决的问题",
  solution: "解决方案",
  talentNeeds: "期待的伙伴（用逗号分隔）",
  productHighlights: "产品亮点",
  targetAudience: "目标用户",
  businessModel: "商业模式",
  differentiation: "差异化",
  marketSize: "市场机会与依据",
  teamMembers: "现有团队",
  whyNow: "为什么是现在",
  longTermMoat: "长期优势",
  roadmapFinance: "计划与融资需求",
  others: "其他说明",
};
const profileLabels: Record<keyof ProfileData, string> = {
  name: "姓名 / 昵称",
  title: "职业方向",
  location: "所在城市 / 远程",
  bio: "关于你",
  skills: "核心技能（用逗号分隔）",
  experienceHighlights: "代表经历",
  education: "教育背景",
  lookingFor: "希望参与的项目与合作",
  superpower: "你最擅长的事",
  others: "其他说明",
  avatar: "头像",
};

export function Onboarding({
  mode,
  userId,
  projectId,
  draftKey = "new",
  onBack,
}: {
  mode: "project" | "profile";
  userId: string;
  projectId?: string;
  draftKey?: string;
  onBack: () => void;
}) {
  const initial = mode === "project" ? initialProjectData : initialProfileData;
  const labels = mode === "project" ? projectLabels : profileLabels;
  const [data, setData] = useState<Draft>(initial);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text:
        mode === "project"
          ? "你好，先说说你正在做什么，以及希望找到怎样的伙伴。已有想法或项目介绍也可以直接粘贴进来。"
          : "你好，你擅长什么，又希望和怎样的项目一起工作？可以从一段经历，或者一份简历正文开始。",
    },
  ]);
  const [avatarSource, setAvatarSource] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const [id, setId] = useState(projectId);
  const [published, setPublished] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [aiError, setAiError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState<"edit" | "chat">("edit");
  const [confirming, setConfirming] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const saveLock = useRef(false);
  const storageKey = `hub:draft:${userId}:${mode}:${projectId || draftKey}`;
  useEffect(() => {
    const abort = new AbortController();
    const load = async () => {
      try {
        let cached: {
          data: Draft;
          id?: string;
          published: boolean;
          messages?: Message[];
        } | null = null;
        try {
          const raw = sessionStorage.getItem(storageKey);
          if (raw) cached = JSON.parse(raw);
        } catch {
          /* unavailable browser storage */
        }
        if (cached) {
          const parsed = (
            mode === "project" ? projectSchema : profileSchema
          ).safeParse(cached.data);
          if (parsed.success) {
            setData(parsed.data);
            setId(cached.id);
            setPublished(cached.published === true);
            if (Array.isArray(cached.messages))
              setMessages(
                cached.messages
                  .filter(
                    (m) =>
                      ["user", "model"].includes(m.role) &&
                      typeof m.text === "string",
                  )
                  .slice(-30),
              );
            setNotice("已恢复此标签页中的草稿。");
            setLoaded(true);
            return;
          }
        }
        if (mode === "profile") {
          const record = await api<ProfileData & { published: boolean }>(
            "/api/profiles",
            undefined,
            abort.signal,
          );
          setData(profileSchema.parse(record));
          setPublished(record.published);
        } else if (projectId) {
          const records = await api<
            (ProjectData & { id: string; published: boolean })[]
          >("/api/projects?mine=true", undefined, abort.signal);
          const record = records.find((p) => p.id === projectId);
          if (!record) throw new Error("找不到可编辑的项目。");
          const normalized = Object.fromEntries(
            Object.keys(initialProjectData).map((k) => [
              k,
              record[k as keyof ProjectData] ??
                initialProjectData[k as keyof ProjectData],
            ]),
          );
          setData(projectSchema.parse(normalized));
          setPublished(record.published);
        }
        if (!abort.signal.aborted) setLoaded(true);
      } catch (e) {
        if (!abort.signal.aborted) setLoadError(errorText(e));
      }
    };
    void load();
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, [mode, projectId, storageKey]);
  useEffect(() => {
    if (!loaded) return;
    try {
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({ data, id, published, messages }),
      );
    } catch {
      setNotice("浏览器暂存不可用，请及时保存到账号。");
    }
  }, [data, id, published, loaded, storageKey, messages]);
  const send = async (text: string, attachment?: Attachment | null) => {
    if (lock.current) return false;
    lock.current = true;
    setLoading(true);
    setAiError("");
    const msg: Message = {
      role: "user",
      text: attachment
        ? `${text}\n\n[资料：${attachment.name}]\n${attachment.data}`
        : text,
    };
    const next = [...messages, msg].slice(-24);
    setMessages(next);
    controller.current = new AbortController();
    try {
      const response = await api<{ reply: string; updates: Partial<Draft> }>(
        "/api/ai/chat",
        { mode, messages: next, currentData: data },
        controller.current.signal,
      );
      setData((old) => ({
        ...old,
        ...Object.fromEntries(
          Object.entries(response.updates).filter(
            ([key]) =>
              JSON.stringify(old[key as keyof Draft]) ===
              JSON.stringify(data[key as keyof Draft]),
          ),
        ),
      }));
      setMessages([...next, { role: "model", text: response.reply }]);
      setNotice("AI 建议已填入草稿，检查并修改后再保存。");
      return true;
    } catch (e) {
      if (!controller.current.signal.aborted) {
        setAiError(errorText(e));
        setMessages(messages);
      }
      return false;
    } finally {
      lock.current = false;
      setLoading(false);
    }
  };
  const save = async (makePublic: boolean) => {
    if (saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{ projectId?: string }>(
        mode === "project" ? "/api/projects" : "/api/profiles",
        {
          ...data,
          ...(mode === "project" && id ? { id } : {}),
          published: makePublic,
        },
      );
      if (result.projectId) setId(result.projectId);
      setPublished(makePublic);
      setConfirming(false);
      setNotice(
        makePublic
          ? "已发布。其他成员现在可以发现这份档案。"
          : "草稿已保存到你的账号。",
      );
    } catch (e) {
      setError(errorText(e));
      setConfirming(false);
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };
  const setField = (key: string, value: string | string[]) => {
    setData((prev) => ({ ...prev, [key]: value }));
    setNotice("");
  };
  const field = (key: string) => {
    const value = data[key as keyof Draft];
    const isArray = key === "talentNeeds" || key === "skills";
    const compact = [
      "name",
      "title",
      "oneLiner",
      "sector",
      "location",
      "stage",
    ].includes(key);
    const inputId = `field-${key}`;
    return (
      <label
        key={key}
        htmlFor={inputId}
        className={`block text-xs font-medium ${["name", "sector", "location", "stage", "title"].includes(key) ? "" : "sm:col-span-2"}`}
      >
        {labels[key as keyof typeof labels] || key}
        <span className="text-accent-blue ml-1">
          {(mode === "project"
            ? ["name", "oneLiner", "vision"]
            : ["name", "title", "lookingFor"]
          ).includes(key)
            ? "·"
            : ""}
        </span>
        {isArray ? (
          <TagInput
            id={inputId}
            value={value as unknown as string[]}
            onChange={(v) => setField(key, v)}
          />
        ) : compact ? (
          <input
            id={inputId}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setField(key, e.target.value)}
            className="field mt-2"
            maxLength={key === "oneLiner" ? 300 : 160}
          />
        ) : (
          <textarea
            id={inputId}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => setField(key, e.target.value)}
            className="field mt-2 resize-y leading-7"
            rows={3}
            maxLength={6000}
          />
        )}
      </label>
    );
  };
  if (loadError)
    return (
      <div className="page-container py-12">
        <p role="alert" className="error-notice">
          {loadError}
        </p>
        <button className="btn-secondary mt-5" onClick={onBack}>
          返回工作台
        </button>
      </div>
    );
  if (!loaded)
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin" aria-label="正在加载草稿" />
      </div>
    );
  const keys = Object.keys(labels).filter((k) => k !== "avatar");
  const main = mode === "project" ? keys.slice(0, 9) : keys.slice(0, 10);
  return (
    <div className="animate-in">
      <div className="border-b border-border bg-white/60">
        <div className="page-container flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-3">
            <button
              className="icon-btn"
              onClick={onBack}
              aria-label="返回工作台"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-lg font-semibold">
                {mode === "project" ? "项目工作室" : "我的个人档案"}
              </h1>
              <p className="text-[11px] text-ink-light mt-1">
                {published
                  ? "已公开 · 编辑后需再次保存"
                  : "私密草稿 · 由你决定何时发布"}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              disabled={saving || loading}
              onClick={() => void save(published)}
              className="btn-secondary !py-2.5"
            >
              <Save size={15} />{" "}
              {saving ? "保存中…" : published ? "保存修改" : "保存草稿"}
            </button>
            <button
              disabled={saving || loading}
              className="btn-primary !py-2.5"
              onClick={() => setConfirming(true)}
            >
              {published ? "公开设置" : "发布档案"}
              <ArrowUpRight size={15} />
            </button>
          </div>
        </div>
      </div>
      <div className="page-container py-4 flex flex-col gap-3">
        {error && (
          <p role="alert" className="error-notice">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="notice flex items-center gap-2">
            <Check size={16} className="shrink-0" />
            {notice}
          </p>
        )}
        <div className="lg:hidden flex gap-2">
          <button
            className={tab === "edit" ? "btn-primary" : "btn-secondary"}
            onClick={() => setTab("edit")}
          >
            <FileText size={15} /> 档案内容
          </button>
          <button
            className={tab === "chat" ? "btn-primary" : "btn-secondary"}
            onClick={() => setTab("chat")}
          >
            <MessageSquare size={15} /> AI 助手
          </button>
        </div>
      </div>
      <div className="page-container grid lg:grid-cols-[340px_1fr] xl:grid-cols-[370px_1fr] gap-5 pb-8 items-start">
        <div
          className={`surface overflow-hidden h-[calc(100dvh-250px)] min-h-[520px] lg:sticky lg:top-[96px] ${tab !== "chat" ? "hidden lg:block" : ""}`}
        >
          <AIChat
            messages={messages}
            onSendMessage={send}
            loading={loading}
            error={aiError}
            persona={mode === "project" ? "项目梳理助手" : "个人档案助手"}
          />
        </div>
        <div className={tab !== "edit" ? "hidden lg:block" : ""}>
          <div className="flex items-center justify-between mb-3">
            <p className="eyebrow">
              {preview ? "PROFILE PREVIEW" : "YOUR DRAFT"}
            </p>
            <button
              className="text-xs text-ink-light flex items-center gap-1.5 p-2"
              onClick={() => setPreview((v) => !v)}
            >
              {preview ? <Pencil size={14} /> : <Eye size={14} />}
              {preview ? "直接编辑" : "预览档案"}
            </button>
          </div>
          {preview ? (
            mode === "project" ? (
              <ProjectArtifact data={data as ProjectData} />
            ) : (
              <article className="surface p-6 md:p-9">
                <p className="eyebrow mb-6">BUILDER PROFILE</p>
                <h2 className="text-3xl font-semibold">
                  {data.name || "你的名字"}
                </h2>
                <p className="text-accent-blue mt-2">
                  {(data as ProfileData).title}
                </p>
                <p className="text-sm text-ink-light mt-2 mb-9">
                  {data.location}
                </p>
                <div className="space-y-7">
                  {keys
                    .filter((k) => !["name", "title", "location"].includes(k))
                    .map((k) => {
                      const v = data[k as keyof Draft];
                      return (
                        v && (
                          <section key={k}>
                            <h3 className="text-xs text-ink-light mb-2">
                              {labels[k as keyof typeof labels]}
                            </h3>
                            <p className="whitespace-pre-wrap text-sm leading-7">
                              {Array.isArray(v) ? v.join(" · ") : v}
                            </p>
                          </section>
                        )
                      );
                    })}
                </div>
              </article>
            )
          ) : (
            <div className="surface p-5 md:p-8">
              <div className="flex items-center gap-3 mb-7">
                <span className="h-8 w-1 rounded bg-accent-blue" />
                <div>
                  <h2 className="font-semibold">
                    {mode === "project"
                      ? "让别人快速理解你的项目"
                      : "让别人看见你的独特价值"}
                  </h2>
                  <p className="text-xs text-ink-light mt-1.5">
                    随时直接修改 · 蓝点标记为发布必填项
                  </p>
                </div>
              </div>
              {mode === "profile" && (
                <div className="mb-6 flex items-center gap-4">
                  <button
                    type="button"
                    className="relative h-14 w-14 rounded-2xl border border-border bg-paper overflow-hidden flex items-center justify-center text-accent-blue"
                    aria-label="更换头像"
                    onClick={() => avatarInput.current?.click()}
                  >
                    {(data as ProfileData).avatar ? (
                      <Image
                        src={(data as ProfileData).avatar}
                        unoptimized
                        width={56}
                        height={56}
                        alt="个人头像"
                      />
                    ) : (
                      <Pencil size={20} />
                    )}
                  </button>
                  <div>
                    <p className="text-sm font-medium">个人头像</p>
                    <p className="text-xs text-ink-light mt-1">
                      JPG、PNG 或 WebP，最大 2 MB
                    </p>
                  </div>
                  <input
                    type="file"
                    ref={avatarInput}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (
                        file.size > 2 * 1024 * 1024 ||
                        !["image/jpeg", "image/png", "image/webp"].includes(
                          file.type,
                        )
                      ) {
                        setError("请选择 2 MB 以内的 JPG、PNG 或 WebP 图片。");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () =>
                        setAvatarSource(reader.result as string);
                      reader.onerror = () => setError("图片读取失败，请重试。");
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              )}
              <div className="grid sm:grid-cols-2 gap-5">{main.map(field)}</div>
              {keys.length > main.length && (
                <details className="border-t border-border pt-5 mt-7">
                  <summary className="cursor-pointer text-sm font-semibold">
                    补充更多信息{" "}
                    <span className="text-ink-light font-normal text-xs">
                      （选填）
                    </span>
                  </summary>
                  <div className="grid sm:grid-cols-2 gap-5 mt-6">
                    {keys.slice(main.length).map(field)}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
      {confirming && (
        <Modal
          title="档案发布确认"
          onClose={saving ? undefined : () => setConfirming(false)}
        >
          <h2 className="text-xl font-semibold mb-3">
            {published ? "档案可见性" : "准备好被看见了吗？"}
          </h2>
          <p className="text-sm text-ink-light leading-7 mb-6">
            发布后，档案中的内容将用于公开展示与 AI
            匹配。请检查联系方式和其他私人信息，邮箱不会公开。
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              autoFocus
              className="btn-secondary"
              onClick={() => setConfirming(false)}
              disabled={saving}
            >
              继续编辑
            </button>
            <button
              className="btn-primary"
              onClick={() => void save(true)}
              disabled={saving}
            >
              {saving ? "保存中…" : "确认发布"}
            </button>
            {published && (
              <button
                className="btn-secondary"
                onClick={() => void save(false)}
                disabled={saving}
              >
                转为私密草稿
              </button>
            )}
          </div>
        </Modal>
      )}
      {avatarSource && (
        <AvatarCropper
          imageSrc={avatarSource}
          onCancel={() => setAvatarSource(null)}
          onSave={(value) => {
            setField("avatar", value);
            setAvatarSource(null);
          }}
        />
      )}
    </div>
  );
}
function TagInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const [text, setText] = useState(value?.join("，") || "");
  useEffect(() => {
    setText(value?.join("，") || "");
  }, [value]);
  return (
    <input
      id={id}
      className="field mt-2"
      value={text}
      maxLength={2000}
      onChange={(e) => setText(e.target.value)}
      onBlur={() =>
        onChange(
          text
            .split(/[,，、\n]/)
            .map((v) => v.trim())
            .filter(Boolean)
            .slice(0, 20),
        )
      }
    />
  );
}
