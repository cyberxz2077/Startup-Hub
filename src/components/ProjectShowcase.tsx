"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Search,
  MapPin,
  ArrowUpRight,
  Plus,
  X,
  Layers3,
  Loader2,
} from "lucide-react";
import { ProjectData } from "@/types";
import { api, errorText } from "@/lib/client";
import { ProjectArtifact } from "./ProjectArtifact";
import { Modal } from "./ui/Modal";
import { ContactDialog, ContactTarget } from "./ContactDialog";
export type ProjectWithMeta = ProjectData & {
  id: string;
  ownerId: string;
  published: boolean;
  owner: { name: string | null; avatar: string | null };
};
export function ProjectShowcase({
  onCreate,
  onContact,
  onLogin,
  isLoggedIn,
  userId,
}: {
  onCreate: () => void;
  onContact: (id: string) => void;
  onLogin: () => void;
  isLoggedIn: boolean;
  userId?: string;
}) {
  const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("全部");
  const [selected, setSelected] = useState<ProjectWithMeta | null>(null);
  const [contact, setContact] = useState<ContactTarget | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await api<ProjectWithMeta[]>("/api/projects");
      if (!Array.isArray(rows)) throw new Error("项目列表暂时无法加载。");
      setProjects(rows);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const sectors = [
    "全部",
    ...Array.from(new Set(projects.map((p) => p.sector).filter(Boolean))),
  ];
  const filtered = projects.filter(
    (p) =>
      (sector === "全部" || p.sector === sector) &&
      [p.name, p.oneLiner, p.sector, p.location].some((v) =>
        (v || "").toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );
  return (
    <section className="page-container py-12 md:py-16 animate-in">
      <div className="flex flex-wrap items-end justify-between gap-6 mb-9">
        <div>
          <p className="eyebrow mb-4">IDEAS LOOKING FOR BUILDERS</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            发现值得投入的想法。
          </h1>
          <p className="text-ink-light mt-5 leading-7">
            看看谁在创造什么，找到你愿意一起共建的方向。
          </p>
        </div>
        <button className="btn-primary" onClick={onCreate}>
          <Plus size={17} /> 建立我的项目
        </button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-7">
        <label className="relative flex-1 max-w-xl">
          <span className="sr-only">搜索项目</span>
          <Search
            size={18}
            className="absolute left-4 top-3.5 text-ink-light"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="field !pl-11"
            placeholder="搜索项目、领域或城市"
          />
        </label>
        <label>
          <span className="sr-only">按领域筛选</span>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="field min-w-36"
          >
            {sectors.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2
            className="animate-spin text-ink-light"
            aria-label="正在加载项目"
          />
        </div>
      ) : error ? (
        <div className="surface p-8">
          <p role="alert" className="error-notice">
            {error}
          </p>
          <button onClick={() => void load()} className="btn-secondary mt-5">
            重新加载
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface text-center py-20 px-5">
          <Layers3
            className="mx-auto mb-5 text-accent-blue"
            size={34}
            strokeWidth={1.4}
          />
          <h2 className="text-xl font-semibold">
            {projects.length
              ? "换个关键词，再找找看。"
              : "第一个想法，可以从你开始。"}
          </h2>
          <p className="text-sm text-ink-light mt-3 mb-6">
            {projects.length
              ? "试试更宽泛的领域或城市。"
              : "目前还没有公开项目。建立档案，向未来的伙伴发出邀请。"}
          </p>
          <button
            className="btn-secondary"
            onClick={
              projects.length
                ? () => {
                    setQuery("");
                    setSector("全部");
                  }
                : onCreate
            }
          >
            {projects.length ? "清除筛选" : "建立项目档案"}
            <ArrowUpRight size={15} />
          </button>
        </div>
      ) : (
        <>
          <p className="eyebrow mb-5">
            {filtered.length} PROJECTS · 最近更新的公开项目
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className="surface p-6 text-left flex flex-col group hover:border-accent-blue/50 transition-colors min-h-[300px]"
              >
                <div className="flex items-center justify-between mb-7">
                  <span className="rounded-md bg-blue-50 px-2.5 py-1.5 text-xs text-accent-blue">
                    {p.sector || "探索中"}
                  </span>
                  <ArrowUpRight
                    size={19}
                    className="text-ink-light group-hover:text-accent-blue"
                  />
                </div>
                <h2 className="text-xl font-semibold mb-3">{p.name}</h2>
                <p className="text-sm text-ink-light leading-7 line-clamp-2 mb-5">
                  {p.oneLiner}
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {p.talentNeeds?.slice(0, 3).map((role, i) => (
                    <span
                      key={i}
                      className="text-[11px] border border-border rounded-md px-2 py-1"
                    >
                      {role}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-4 border-t border-border flex justify-between items-center text-xs text-ink-light">
                  <span>{p.owner.name || "项目发起人"}</span>
                  <span className="flex gap-1 items-center">
                    <MapPin size={12} />
                    {p.location || "地点待补充"}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      {selected && (
        <Modal wide title={selected.name} onClose={() => setSelected(null)}>
          <div className="flex justify-between items-center mb-5">
            <p className="eyebrow">PROJECT DETAILS</p>
            <button
              className="icon-btn"
              aria-label="关闭项目详情"
              onClick={() => setSelected(null)}
            >
              <X size={18} />
            </button>
          </div>
          <ProjectArtifact data={selected} />
          <div className="mt-5 flex justify-end">
            <button
              disabled={userId === selected.ownerId}
              className="btn-primary"
              onClick={() => {
                if (!isLoggedIn) {
                  setSelected(null);
                  onLogin();
                } else {
                  setContact({
                    targetId: selected.id,
                    targetType: "project",
                    name: selected.name,
                  });
                  setSelected(null);
                }
              }}
            >
              {userId === selected.ownerId
                ? "这是你的项目"
                : isLoggedIn
                  ? "与发起人聊聊"
                  : "登录后联系"}
              <ArrowUpRight size={16} />
            </button>
          </div>
        </Modal>
      )}
      {contact && (
        <ContactDialog
          target={contact}
          onClose={() => setContact(null)}
          onSent={onContact}
        />
      )}
    </section>
  );
}
