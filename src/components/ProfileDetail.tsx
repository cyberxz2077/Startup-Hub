"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  FolderOpen,
} from "lucide-react";
import type { PublicProfile } from "@/types";
import { api, errorText } from "@/lib/client";
import { MemberAvatar } from "./ui/MemberAvatar";
import { ContactDialog } from "./ContactDialog";

export function ProfileDetail({
  id,
  userId,
  onContact,
  onLogin,
}: {
  id: string;
  userId?: string;
  onContact: (id: string) => void;
  onLogin: () => void;
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(false);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        if (!id) throw new Error("请选择要查看的个人档案。");
        setProfile(
          await api<PublicProfile>(
            `/api/people/${encodeURIComponent(id)}`,
            undefined,
            signal,
          ),
        );
      } catch (error) {
        if (!signal?.aborted) setError(errorText(error));
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [id],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  return (
    <section className="page-container py-8 md:py-12 animate-in">
      <Link
        href="/?view=people_showcase"
        className="inline-flex items-center gap-2 text-sm text-ink-light mb-7 hover:text-ink"
      >
        <ArrowLeft size={16} />
        返回用户库
      </Link>
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin" aria-label="正在加载个人档案" />
        </div>
      ) : error || !profile ? (
        <div className="surface p-8">
          <p role="alert" className="error-notice">
            {error || "个人档案不存在。"}
          </p>
          <button className="btn-secondary mt-5" onClick={() => void load()}>
            重新加载
          </button>
        </div>
      ) : (
        <>
          <header className="surface p-6 md:p-9 mb-6">
            <p className="eyebrow mb-7">BUILDER PROFILE</p>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex gap-4 items-center min-w-0">
                <MemberAvatar name={profile.name} avatar={profile.avatar} />
                <div className="min-w-0">
                  <h1 className="text-3xl font-semibold break-words">
                    {profile.name}
                  </h1>
                  <p className="text-accent-blue mt-2 break-words">
                    {profile.title}
                  </p>
                  {profile.location && (
                    <p className="flex items-center gap-1.5 text-sm text-ink-light mt-2">
                      <MapPin size={14} />
                      {profile.location}
                    </p>
                  )}
                </div>
              </div>
              {userId === profile.userId ? (
                <Link className="btn-secondary" href="/?view=profile_create">
                  <Pencil size={16} />
                  编辑我的档案
                </Link>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => (userId ? setContact(true) : onLogin())}
                >
                  <MessageSquare size={16} />
                  {userId ? "聊聊合作" : "登录后联系"}
                </button>
              )}
            </div>
            {profile.bio && (
              <p className="text-sm leading-8 whitespace-pre-wrap mt-7 max-w-3xl">
                {profile.bio}
              </p>
            )}
            <div className="flex flex-wrap gap-2 mt-5">
              {profile.skills.map((skill, index) => (
                <span
                  key={`${index}:${skill}`}
                  className="bg-blue-50 rounded-lg px-3 py-1.5 text-xs text-accent-blue"
                >
                  {skill}
                </span>
              ))}
            </div>
          </header>
          <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="surface p-6 md:p-9 space-y-8">
              {(
                [
                  ["希望参与的项目与合作", profile.lookingFor],
                  ["代表经历", profile.experienceHighlights],
                  ["擅长解决的问题", profile.superpower],
                  ["教育背景", profile.education],
                  ["其他说明", profile.others],
                ] as const
              )
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <section key={label}>
                    <h2 className="font-semibold mb-3">{label}</h2>
                    <p className="text-sm leading-8 whitespace-pre-wrap text-ink-light break-words">
                      {value}
                    </p>
                  </section>
                ))}
            </div>
            <aside className="surface p-6">
              <h2 className="font-semibold flex items-center gap-2 mb-2">
                <FolderOpen size={18} className="text-accent-blue" />
                发起的项目
              </h2>
              <p className="text-xs text-ink-light mb-5">
                {profile.projectCount} 个公开项目
              </p>
              {profile.projects.length ? (
                <div className="space-y-3">
                  {profile.projects.map((project) => (
                    <Link
                      href={`/?view=project_detail&id=${project.id}`}
                      key={project.id}
                      className="block rounded-xl border border-border p-4 hover:border-accent-blue transition-colors"
                    >
                      <div className="flex gap-3 items-start justify-between">
                        <h3 className="font-semibold text-sm break-words">
                          {project.name}
                        </h3>
                        <ArrowUpRight
                          size={16}
                          className="text-accent-blue shrink-0"
                        />
                      </div>
                      <p className="text-xs leading-6 text-ink-light mt-2 line-clamp-3">
                        {project.oneLiner}
                      </p>
                      <p className="text-[11px] text-accent-blue mt-3">
                        {[project.sector, project.stage]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-light leading-7">
                  还没有公开的项目，也可以直接聊聊共同感兴趣的方向。
                </p>
              )}
            </aside>
          </div>
          {contact && (
            <ContactDialog
              target={{
                targetType: "user",
                targetId: profile.userId,
                name: profile.name,
              }}
              onClose={() => setContact(false)}
              onSent={onContact}
            />
          )}
        </>
      )}
    </section>
  );
}
