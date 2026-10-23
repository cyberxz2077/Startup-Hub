"use client";
import { useCallback, useEffect, useState } from "react";
import { Search, MapPin, Building2, ArrowUpRight, Loader2 } from "lucide-react";
import { api, errorText } from "@/lib/client";
import { safeWebsite } from "@/lib/validation";
type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  services: string | null;
  city: string | null;
  contact: string | null;
  website: string | null;
};
export function ServiceShowcase() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await api<Service[]>("/api/services");
      if (!Array.isArray(rows)) throw new Error("资源列表暂时无法加载。");
      setServices(rows);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const categories = [
    "全部",
    ...Array.from(new Set(services.map((s) => s.category))),
  ];
  const filtered = services.filter(
    (s) =>
      (category === "全部" || s.category === category) &&
      [s.name, s.description, s.services, s.city].some((v) =>
        (v || "").toLowerCase().includes(query.trim().toLowerCase()),
      ),
  );
  return (
    <section className="page-container py-12 md:py-16 animate-in">
      <p className="eyebrow mb-4">THE SUPPORT AROUND YOUR IDEA</p>
      <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
        找到下一步需要的支持。
      </h1>
      <p className="text-ink-light mt-5 mb-9 leading-7">
        从产品到运营，探索社区收录的合作资源。
      </p>
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <label className="relative flex-1 max-w-xl">
          <span className="sr-only">搜索合作资源</span>
          <Search
            size={18}
            className="absolute left-4 top-3.5 text-ink-light"
          />
          <input
            className="field !pl-11"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索服务、机构或城市"
          />
        </label>
        <label>
          <span className="sr-only">服务类型</span>
          <select
            className="field min-w-36"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <div className="py-20 flex justify-center">
          <Loader2 className="animate-spin" aria-label="正在加载资源" />
        </div>
      ) : error ? (
        <div className="surface p-8">
          <p role="alert" className="error-notice">
            {error}
          </p>
          <button className="btn-secondary mt-4" onClick={() => void load()}>
            重新加载
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="surface p-16 text-center">
          <Building2
            size={34}
            className="mx-auto text-accent-blue mb-5"
            strokeWidth={1.4}
          />
          <h2 className="text-xl font-semibold">
            {services.length ? "暂时没有符合条件的资源" : "合作资源正在积累中"}
          </h2>
          <p className="text-sm text-ink-light mt-3">
            {services.length
              ? "试着调整关键词或分类。"
              : "新的资源收录后，会出现在这里。"}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((s) => (
            <article key={s.id} className="surface p-6 flex flex-col">
              <div className="flex justify-between mb-6">
                <Building2
                  size={25}
                  className="text-accent-blue"
                  strokeWidth={1.5}
                />
                <span className="eyebrow">{s.category}</span>
              </div>
              <h2 className="text-xl font-semibold mb-3">{s.name}</h2>
              <p className="text-sm text-ink-light leading-7 mb-5">
                {s.description}
              </p>
              <p className="text-xs leading-6 mb-5">{s.services}</p>
              <div className="mt-auto border-t border-border pt-4">
                <p className="text-xs text-ink-light flex gap-1 mb-4 items-center">
                  <MapPin size={12} />
                  {s.city || "地点待补充"}
                </p>
                <div className="flex flex-wrap gap-3">
                  {s.contact && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.contact) ? (
                    <a
                      className="btn-secondary !py-2 text-xs"
                      href={`mailto:${encodeURIComponent(s.contact)}`}
                    >
                      邮件联系
                    </a>
                  ) : s.contact ? (
                    <p className="text-xs text-ink-light">{s.contact}</p>
                  ) : null}
                  {safeWebsite(s.website) && (
                    <a
                      href={safeWebsite(s.website)!}
                      className="btn-secondary !py-2 text-xs"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      访问网站
                      <ArrowUpRight size={13} />
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
