"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Fingerprint,
  Loader2,
  MapPin,
  Search,
  UsersRound,
} from "lucide-react";
import type { PublicProfile } from "@/types";
import { api, errorText } from "@/lib/client";
import { MemberAvatar } from "./ui/MemberAvatar";

export function PeopleShowcase() {
  const [people, setPeople] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("全部");
  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      setPeople(await api<PublicProfile[]>("/api/people", undefined, signal));
    } catch (error) {
      if (!signal?.aborted) setError(errorText(error));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const locations = [
    "全部",
    ...new Set(people.map((person) => person.location).filter(Boolean)),
  ];
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = people.filter((person) => {
    const searchable = [
      person.name,
      person.title,
      person.location,
      person.bio,
      person.lookingFor,
      ...person.skills,
      ...person.projects.map((project) => project.name),
    ]
      .join(" ")
      .toLocaleLowerCase();
    return (
      (location === "全部" || person.location === location) &&
      terms.every((term) => searchable.includes(term))
    );
  });
  return (
    <section className="page-container py-12 md:py-16 animate-in">
      <div className="mb-9 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-4">PEOPLE WHO BUILD</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
            发现一起把事做成的人。
          </h1>
          <p className="mt-5 text-ink-light leading-7">
            用户库 · 了解彼此的能力、经历，以及正在发起的项目。
          </p>
        </div>
        <Link href="/?view=profile_create" className="btn-primary">
          <Fingerprint size={18} />
          完善我的个人档案
        </Link>
      </div>
      <div className="mb-7 flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1 max-w-xl">
          <span className="sr-only">搜索用户</span>
          <Search
            size={18}
            className="absolute left-4 top-3.5 text-ink-light"
          />
          <input
            className="field !pl-11"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索姓名、技能、合作方向或项目"
          />
        </label>
        <label>
          <span className="sr-only">按城市筛选用户</span>
          <select
            className="field min-w-36"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          >
            {locations.map((item) => (
              <option key={item} value={item}>
                {item === "全部" ? "全部城市 / 远程" : item}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2
            className="animate-spin text-ink-light"
            aria-label="正在加载用户库"
          />
        </div>
      ) : error ? (
        <div className="surface p-8">
          <p role="alert" className="error-notice">
            {error}
          </p>
          <button className="btn-secondary mt-5" onClick={() => void load()}>
            重新加载
          </button>
        </div>
      ) : !filtered.length ? (
        <div className="surface px-6 py-16 text-center">
          <UsersRound size={34} className="mx-auto text-accent-blue mb-5" />
          <h2 className="text-xl font-semibold">
            {people.length
              ? "暂时没有符合条件的伙伴"
              : "让未来的伙伴先认识你。"}
          </h2>
          <p className="mt-3 mb-6 text-sm text-ink-light leading-7">
            {people.length
              ? "试试其他技能、城市或合作方向。"
              : "这里展示主动发布的个人档案。完善并发布后，你也会出现在用户库。"}
          </p>
          {people.length ? (
            <button
              className="btn-secondary"
              onClick={() => {
                setQuery("");
                setLocation("全部");
              }}
            >
              清除筛选
            </button>
          ) : (
            <Link className="btn-secondary" href="/?view=profile_create">
              建立个人档案
              <ArrowUpRight size={16} />
            </Link>
          )}
        </div>
      ) : (
        <>
          <p className="eyebrow mb-5">
            {filtered.length} BUILDERS · 最近更新的公开档案
          </p>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((person) => (
              <article
                key={person.userId}
                className="surface p-6 flex flex-col"
              >
                <Link
                  href={`/?view=profile_detail&id=${person.userId}`}
                  className="flex gap-4 items-center group"
                >
                  <MemberAvatar name={person.name} avatar={person.avatar} />
                  <div className="min-w-0">
                    <h2 className="text-xl font-semibold break-words group-hover:text-accent-blue">
                      {person.name}
                    </h2>
                    <p className="text-sm text-ink-light mt-1 break-words">
                      {person.title}
                    </p>
                  </div>
                </Link>
                {person.location && (
                  <p className="flex gap-1.5 items-center text-xs text-ink-light mt-5">
                    <MapPin size={13} />
                    {person.location}
                  </p>
                )}
                <p className="text-sm leading-7 text-ink-light mt-4 line-clamp-3">
                  {person.bio || person.lookingFor}
                </p>
                <div className="flex flex-wrap gap-2 mt-4 mb-6">
                  {person.skills.slice(0, 5).map((skill, index) => (
                    <span
                      key={`${index}:${skill}`}
                      className="rounded-md bg-blue-50 px-2 py-1 text-[11px] text-accent-blue"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <div className="mt-auto border-t border-border pt-4">
                  {person.projects.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[11px] text-ink-light mb-2">
                        发起的项目 · {person.projectCount}
                      </p>
                      <div className="space-y-2">
                        {person.projects.map((project) => (
                          <Link
                            key={project.id}
                            href={`/?view=project_detail&id=${project.id}`}
                            className="flex items-start gap-2 text-xs hover:text-accent-blue"
                          >
                            <span className="min-w-0 break-words">
                              {project.name}
                            </span>
                            <ArrowUpRight
                              size={13}
                              className="shrink-0 ml-auto"
                            />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  <Link
                    href={`/?view=profile_detail&id=${person.userId}`}
                    className="text-sm font-semibold flex items-center justify-between hover:text-accent-blue"
                  >
                    查看个人档案
                    <ArrowUpRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
