"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  Grid2X2,
  Mail,
  LogOut,
  UserRound,
  Loader2,
  UsersRound,
} from "lucide-react";
import { Landing } from "./Landing";
import { AuthForm, SessionUser } from "./AuthForm";
import { RoleSelectionPage } from "./RoleSelection";
import { ProjectShowcase } from "./ProjectShowcase";
import { ServiceShowcase } from "./ServiceShowcase";
import { ProjectOnboarding } from "./ProjectOnboarding";
import { ProfileOnboarding } from "./ProfileOnboarding";
import { Inbox } from "./Inbox";
import { Dashboard } from "./Dashboard";
import { PeopleShowcase } from "./PeopleShowcase";
import { ProfileDetail } from "./ProfileDetail";
import { ProjectDetail } from "./ProjectDetail";
import { api, errorText } from "@/lib/client";

const protectedViews = new Set([
  "role_selection",
  "project_create",
  "profile_create",
  "inbox",
  "dashboard",
]);
export function HubApp() {
  const router = useRouter();
  const params = useSearchParams();
  const view = params.get("view") || "landing";
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [lastProject, setLastProject] = useState<string | null>(null);
  const projectId = params.get("id");
  const draftId = params.get("draft");
  useEffect(() => {
    if (!user) {
      setLastProject(null);
      return;
    }
    const key = `hub:last-project:${user.id}`;
    try {
      if (view === "project_create") {
        const href = `/?view=project_create${projectId ? `&id=${encodeURIComponent(projectId)}` : draftId ? `&draft=${encodeURIComponent(draftId)}` : ""}`;
        sessionStorage.setItem(key, href);
        setLastProject(href);
      } else {
        const saved = sessionStorage.getItem(key);
        if (
          saved?.startsWith("/?view=project_create") &&
          !saved.includes("#")
        ) {
          const parameters = new URLSearchParams(saved.split("?")[1]);
          setLastProject(
            `/?view=project_create${parameters.get("id") ? `&id=${encodeURIComponent(parameters.get("id")!)}` : parameters.get("draft") ? `&draft=${encodeURIComponent(parameters.get("draft")!)}` : ""}`,
          );
        }
      }
    } catch {
      /* Optional tab-local navigation memory. */
    }
  }, [user, view, projectId, draftId]);
  useEffect(() => {
    const controller = new AbortController();
    api<{ user: SessionUser | null }>(
      "/api/auth/session",
      undefined,
      controller.signal,
    )
      .then((r) => setUser(r.user))
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorText(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setReady(true);
      });
    return () => controller.abort();
  }, []);
  const go = (next: string) => {
    setError("");
    router.push(
      `/?view=${next}${next === "project_create" ? `&draft=${crypto.randomUUID()}` : ""}`,
    );
  };
  const logout = async () => {
    setLoggingOut(true);
    try {
      await api("/api/auth/logout", {});
      setUser(null);
      router.push("/");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoggingOut(false);
    }
  };
  const needsLogin = view === "login" || (protectedViews.has(view) && !user);
  const activeNav =
    view === "profile_detail"
      ? "people_showcase"
      : view === "project_detail"
        ? "project_showcase"
        : view;
  const continueProject = () =>
    lastProject ? router.push(lastProject) : go("project_create");
  const onContact = (id: string) =>
    router.push(`/?view=inbox&conversation=${id}`);
  const loginForDetail = () =>
    router.push(
      `/?view=login&next=${view}&id=${encodeURIComponent(projectId || "")}`,
    );
  const navs = [
    { view: "project_showcase", label: "探索项目", icon: BriefcaseBusiness },
    { view: "people_showcase", label: "发现伙伴", icon: UsersRound },
    { view: "service_showcase", label: "合作资源", icon: Grid2X2 },
    { view: "inbox", label: "消息", icon: Mail },
  ];
  return (
    <div className="min-h-dvh flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3"
      >
        跳转到主要内容
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-paper/95 backdrop-blur-md">
        <nav
          aria-label="主导航"
          className="page-container flex h-[76px] items-center justify-between gap-3"
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0"
            aria-label="Startup Hub 首页"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-white text-xl font-bold">
              H<span className="text-[#8FA5FF]">.</span>
            </span>
            <span className="text-[16px] font-semibold tracking-tight hidden sm:block">
              startup<span className="text-ink-light">hub</span>
              <span className="block text-[8px] leading-3 tracking-[.23em] font-mono font-normal text-ink-light">
                BUILD TOGETHER
              </span>
            </span>
          </Link>
          <div className="hidden lg:flex items-center gap-0.5 lg:gap-3">
            {navs.map((n) => (
              <Link
                href={`/?view=${n.view}`}
                key={n.view}
                title={n.label}
                aria-label={n.label}
                aria-current={activeNav === n.view ? "page" : undefined}
                className={`nav-link ${activeNav === n.view ? "nav-active" : ""}`}
              >
                <n.icon size={17} strokeWidth={1.7} />
                <span className="hidden md:inline">{n.label}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {user ? (
              <>
                <Link
                  href="/?view=dashboard"
                  className="btn-secondary !p-2.5 sm:!px-4"
                  aria-label="我的工作台"
                >
                  <UserRound size={17} />
                  <span className="text-xs">我的工作台</span>
                </Link>
                <button
                  className="icon-btn"
                  aria-label="退出登录"
                  title="退出登录"
                  disabled={loggingOut}
                  onClick={() => void logout()}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link
                href="/?view=login"
                className="btn-secondary !px-4 !py-2.5 text-xs"
              >
                登录 / 加入 <ArrowUpRight size={14} />
              </Link>
            )}
          </div>
        </nav>
        <nav
          aria-label="移动端主导航"
          className="lg:hidden grid grid-cols-4 gap-1 px-3 pb-2"
        >
          {navs.map((item) => (
            <Link
              key={item.view}
              href={`/?view=${item.view}`}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-1 py-2.5 text-[11px] ${activeNav === item.view ? "bg-white text-accent-blue" : "text-ink-light"}`}
              aria-current={activeNav === item.view ? "page" : undefined}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      {error && (
        <div role="alert" className="page-container pt-4">
          <p className="error-notice">{error}</p>
        </div>
      )}
      <main id="main-content" className="flex-1">
        {!ready && protectedViews.has(view) ? (
          <div className="py-28 flex justify-center">
            <Loader2 className="animate-spin" aria-label="正在检查登录状态" />
          </div>
        ) : needsLogin ? (
          <AuthForm
            onSuccess={(u) => {
              setUser(u);
              if (view === "login") {
                const next = params.get("next");
                if (next === "profile_detail" || next === "project_detail")
                  router.replace(
                    `/?view=${next}&id=${encodeURIComponent(projectId || "")}`,
                  );
                else go("dashboard");
              }
            }}
          />
        ) : (
          <>
            {view === "role_selection" && <RoleSelectionPage onNavigate={go} />}
            {view === "project_create" && user && (
              <ProjectOnboarding
                key={`${user.id}:${params.get("id")}:${params.get("draft")}`}
                userId={user.id}
                projectId={params.get("id") || undefined}
                draftKey={params.get("draft") || "new"}
                onBack={() => go("dashboard")}
                onSwitch={() => go("profile_create")}
              />
            )}
            {view === "profile_create" && user && (
              <ProfileOnboarding
                userId={user.id}
                onBack={() => go("dashboard")}
                onSwitch={continueProject}
              />
            )}
            {view === "project_showcase" && (
              <ProjectShowcase onCreate={() => go("project_create")} />
            )}
            {view === "people_showcase" && <PeopleShowcase />}
            {view === "profile_detail" && (
              <ProfileDetail
                key={projectId}
                id={projectId || ""}
                userId={user?.id}
                onContact={onContact}
                onLogin={loginForDetail}
              />
            )}
            {view === "project_detail" && (
              <ProjectDetail
                key={projectId}
                id={projectId || ""}
                userId={user?.id}
                onContact={onContact}
                onLogin={loginForDetail}
              />
            )}
            {view === "service_showcase" && <ServiceShowcase />}
            {view === "inbox" && user && (
              <Inbox
                userId={user.id}
                initialId={params.get("conversation") || undefined}
              />
            )}
            {view === "dashboard" && user && (
              <Dashboard
                userId={user.id}
                onNavigate={go}
                onContinueProject={continueProject}
                hasProjectDraft={!!lastProject}
              />
            )}
            {![
              "role_selection",
              "project_create",
              "profile_create",
              "project_showcase",
              "people_showcase",
              "profile_detail",
              "project_detail",
              "service_showcase",
              "inbox",
              "dashboard",
            ].includes(view) && <Landing />}
          </>
        )}
      </main>
    </div>
  );
}
