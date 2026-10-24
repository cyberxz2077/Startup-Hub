"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  Loader2,
  Fingerprint,
  FolderOpen,
  Pencil,
} from "lucide-react";
import { api, errorText } from "@/lib/client";
import type { ProfileData, ProjectWithMeta } from "@/types";
import { ContactDialog, ContactTarget } from "./ContactDialog";
import { useRouter } from "next/navigation";
type Match = ContactTarget & {
  label: string;
  score: number;
  reason: string;
  pros: string[];
  cons: string[];
};
export function Dashboard({
  onNavigate,
  userId,
  onContinueProject,
  hasProjectDraft,
}: {
  onNavigate: (view: string) => void;
  userId: string;
  onContinueProject: () => void;
  hasProjectDraft: boolean;
}) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [profile, setProfile] = useState<
    (ProfileData & { published: boolean }) | null
  >(null);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [source, setSource] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [scope, setScope] = useState("");
  const [contact, setContact] = useState<ContactTarget | null>(null);
  const lock = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<ProjectWithMeta[]>(
        "/api/projects?mine=true",
        undefined,
        controller.signal,
      ),
      api<ProfileData & { published: boolean }>(
        "/api/profiles",
        undefined,
        controller.signal,
      ),
    ])
      .then(([records, personal]) => {
        setProjects(records);
        setProfile(personal);
        if (!personal.title && records.length) setSource(records[0].id);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const match = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMatches(null);
    try {
      const r = await api<{ matches: Match[]; scope: string }>("/api/match", {
        type: source === "profile" ? "profile" : "project",
        id: source === "profile" ? "current" : source,
      });
      setMatches(r.matches);
      setScope(r.scope);
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="page-container py-12 md:py-16 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-5 mb-10">
        <div>
          <p className="eyebrow mb-4">YOUR WORKSPACE</p>
          <h1 className="text-4xl font-semibold tracking-tight">
            下一步，一起向前。
          </h1>
          <p className="mt-4 text-ink-light">
            管理档案，发现合作，继续上次的想法。
          </p>
        </div>
        <button
          onClick={() => onNavigate("project_create")}
          className="btn-primary"
        >
          <Plus size={17} /> 新建项目
        </button>
      </div>
      {error && (
        <p role="alert" className="error-notice mb-6">
          {error}
        </p>
      )}
      <div className="grid md:grid-cols-2 gap-5 mb-8">
        <section className="surface p-6 md:p-7">
          <div className="flex items-center justify-between mb-5">
            <Fingerprint
              size={27}
              strokeWidth={1.5}
              className="text-accent-blue"
            />
            <span className="text-xs text-ink-light">
              {loading
                ? "加载中…"
                : profile?.published
                  ? "已在用户库公开"
                  : profile?.title
                    ? "私密草稿"
                    : "待完善"}
            </span>
          </div>
          <h2 className="text-xl font-semibold">我的个人档案</h2>
          <p className="mt-3 mb-5 text-sm leading-7 text-ink-light">
            让伙伴了解你的经历、能力和合作意向。发起项目之后，也可以继续完善自己。
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate("profile_create")}
              className="btn-primary"
            >
              <Pencil size={15} />
              {profile?.title ? "编辑个人档案" : "完善个人档案"}
            </button>
            {profile?.published && (
              <Link
                className="btn-secondary"
                href={`/?view=profile_detail&id=${userId}`}
              >
                查看公开档案
                <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
        </section>
        <section className="surface p-6 md:p-7">
          <div className="flex items-center justify-between mb-5">
            <FolderOpen
              size={27}
              strokeWidth={1.5}
              className="text-accent-blue"
            />
            <span className="text-xs text-ink-light">
              {loading ? "加载中…" : `${projects.length} 个已保存项目`}
            </span>
          </div>
          <h2 className="text-xl font-semibold">我的项目</h2>
          <p className="mt-3 mb-5 text-sm leading-7 text-ink-light">
            整理正在推进的想法。公开项目会展示在项目库，并关联到你的公开个人档案。
          </p>
          <div className="flex flex-wrap gap-3">
            {hasProjectDraft ? (
              <button className="btn-primary" onClick={onContinueProject}>
                继续上次的项目
                <ArrowUpRight size={15} />
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => onNavigate("project_create")}
              >
                <Plus size={15} />
                建立项目档案
              </button>
            )}
            <Link className="btn-secondary" href="/?view=people_showcase">
              去用户库找伙伴
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </section>
      </div>
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        <div className="space-y-6">
          <section className="surface p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="rounded-xl bg-blue-50 text-accent-blue p-2.5">
                <Sparkles size={20} />
              </span>
              <h2 className="text-xl font-semibold">发现互补的可能</h2>
            </div>
            <p className="text-sm text-ink-light leading-7 mb-5">
              选择你的个人档案或项目，从最近更新的公开资料中寻找合作方向。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1">
                <span className="sr-only">用于匹配的档案</span>
                <select
                  className="field"
                  value={source}
                  onChange={(e) => {
                    setSource(e.target.value);
                    setMatches(null);
                  }}
                  disabled={busy}
                >
                  <option value="profile">我的个人档案 → 寻找项目</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} → 寻找伙伴
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="btn-primary"
                onClick={() => void match()}
                disabled={busy || loading}
              >
                {busy ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ArrowUpRight size={17} />
                )}
                {busy ? "分析中…" : "开始匹配"}
              </button>
            </div>
            <p className="text-xs text-ink-light mt-4 leading-6">
              所选资料将交由 DeepSeek
              分析。分数表示资料契合度，合作仍需双方交流确认。
            </p>
          </section>
          {matches !== null && (
            <section aria-live="polite">
              <h2 className="font-semibold mb-2">本次匹配结果</h2>
              <p className="text-xs text-ink-light mb-5 leading-6">{scope}</p>
              {matches.length === 0 ? (
                <div className="surface p-8 text-center">
                  <p className="font-semibold">暂时还没有可比较的公开资料。</p>
                  <p className="text-sm text-ink-light mt-3">
                    可以先完善档案，之后再来看看。
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((m) => (
                    <article key={m.targetId} className="surface p-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="h-14 w-14 rounded-2xl bg-blue-50 flex flex-col items-center justify-center text-accent-blue">
                          <span className="text-xl font-semibold">
                            {m.score}
                          </span>
                          <span className="text-[9px]">资料契合度</span>
                        </div>
                        <div>
                          <Link
                            className="font-semibold text-xl hover:text-accent-blue"
                            href={`/?view=${m.targetType === "user" ? "profile_detail" : "project_detail"}&id=${m.targetId}`}
                          >
                            {m.name}
                          </Link>
                          <p className="text-xs text-ink-light mt-1">
                            {m.label}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-ink-light leading-7 mb-4">
                        {m.reason}
                      </p>
                      <div className="grid sm:grid-cols-2 gap-5 text-xs">
                        <div>
                          <h4 className="font-semibold mb-2">契合之处</h4>
                          <ul className="space-y-2 text-ink-light leading-6">
                            {m.pros.map((p, i) => (
                              <li key={i}>· {p}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">交流时可以确认</h4>
                          <ul className="space-y-2 text-ink-light leading-6">
                            {m.cons.map((p, i) => (
                              <li key={i}>· {p}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <button
                        className="btn-secondary mt-5"
                        onClick={() => setContact(m)}
                      >
                        打个招呼
                        <ArrowUpRight size={15} />
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
        <aside className="space-y-5">
          <section className="surface p-6">
            <h2 className="font-semibold mb-5 flex items-center gap-2">
              <FolderOpen size={17} className="text-accent-blue" />
              我的项目
            </h2>
            {loading ? (
              <p className="text-sm text-ink-light">正在加载…</p>
            ) : projects.length === 0 ? (
              <p className="text-sm text-ink-light leading-7">
                还没有项目，从一个小想法开始。
              </p>
            ) : (
              <div className="space-y-4">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between gap-3 items-center border-t border-border pt-4 first:border-0 first:pt-0"
                  >
                    <div>
                      <Link
                        href={`/?view=project_create&id=${p.id}`}
                        className="text-sm font-medium hover:text-accent-blue"
                      >
                        {p.name}
                      </Link>
                      <p className="text-[10px] text-ink-light mt-1">
                        {p.published ? "公开项目" : "私密草稿"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Link
                        href={`/?view=project_create&id=${p.id}`}
                        className="icon-btn"
                        aria-label={`编辑项目 ${p.name}`}
                      >
                        <Pencil size={14} />
                      </Link>
                      {p.published && (
                        <Link
                          href={`/?view=project_detail&id=${p.id}`}
                          className="icon-btn"
                          aria-label={`查看公开项目 ${p.name}`}
                        >
                          <ArrowUpRight size={15} />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
      {contact && (
        <ContactDialog
          target={contact}
          onClose={() => setContact(null)}
          onSent={(id) => router.push(`/?view=inbox&conversation=${id}`)}
        />
      )}
    </section>
  );
}
