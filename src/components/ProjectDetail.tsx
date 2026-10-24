"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  MessageSquare,
  Pencil,
} from "lucide-react";
import type { ProjectWithMeta } from "@/types";
import { api, errorText } from "@/lib/client";
import { ProjectArtifact } from "./ProjectArtifact";
import { MemberAvatar } from "./ui/MemberAvatar";
import { ContactDialog } from "./ContactDialog";

export function ProjectDetail({
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
  const [project, setProject] = useState<ProjectWithMeta | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(false);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        if (!id) throw new Error("请选择要查看的项目。");
        setProject(
          await api<ProjectWithMeta>(
            `/api/projects/${encodeURIComponent(id)}`,
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
        href="/?view=project_showcase"
        className="inline-flex items-center gap-2 text-sm text-ink-light mb-7 hover:text-ink"
      >
        <ArrowLeft size={16} />
        返回项目库
      </Link>
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin" aria-label="正在加载项目详情" />
        </div>
      ) : error || !project ? (
        <div className="surface p-8">
          <p role="alert" className="error-notice">
            {error || "项目不存在。"}
          </p>
          <button className="btn-secondary mt-5" onClick={() => void load()}>
            重新加载
          </button>
        </div>
      ) : (
        <>
          <div className="grid lg:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="min-w-0">
              <ProjectArtifact data={project} headingLevel={1} />
            </div>
            <aside className="surface p-6 lg:sticky lg:top-[100px]">
              <p className="eyebrow mb-5">MEET THE FOUNDER</p>
              <h2 className="text-sm text-ink-light mb-4">项目发起人</h2>
              <div className="flex items-center gap-3 mb-5">
                <MemberAvatar
                  name={project.owner.name || "项目发起人"}
                  avatar={project.owner.avatar}
                />
                <p className="font-semibold min-w-0 break-words">
                  {project.owner.name || "项目发起人"}
                </p>
              </div>
              {project.owner.profilePublished ? (
                <Link
                  href={`/?view=profile_detail&id=${project.ownerId}`}
                  className="btn-secondary w-full mb-3"
                >
                  查看个人档案
                  <ArrowUpRight size={15} />
                </Link>
              ) : (
                <p className="text-xs text-ink-light leading-6 mb-5">
                  发起人尚未公开个人档案。
                </p>
              )}
              {userId === project.ownerId ? (
                <div className="space-y-3">
                  <Link
                    className="btn-primary w-full"
                    href={`/?view=project_create&id=${project.id}`}
                  >
                    <Pencil size={15} />
                    编辑项目
                  </Link>
                  {!project.owner.profilePublished && (
                    <Link
                      href="/?view=profile_create"
                      className="btn-secondary w-full"
                    >
                      完善我的个人档案
                      <ArrowUpRight size={15} />
                    </Link>
                  )}
                </div>
              ) : (
                <button
                  className="btn-primary w-full"
                  onClick={() => (userId ? setContact(true) : onLogin())}
                >
                  <MessageSquare size={16} />
                  {userId ? "与发起人聊聊" : "登录后联系"}
                </button>
              )}
            </aside>
          </div>
          {contact && (
            <ContactDialog
              target={{
                targetType: "project",
                targetId: project.id,
                name: project.name,
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
