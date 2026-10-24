import { ProjectData } from "@/types";
import { MapPin, Users, Target } from "lucide-react";
export function ProjectArtifact({
  data,
  headingLevel = 2,
}: {
  data: ProjectData;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  const details: [keyof ProjectData, string][] = [
    ["vision", "项目愿景"],
    ["problem", "要解决的问题"],
    ["solution", "解决方案"],
    ["productHighlights", "产品亮点"],
    ["targetAudience", "目标用户"],
    ["businessModel", "商业模式"],
    ["differentiation", "差异化"],
    ["marketSize", "市场机会与依据"],
    ["teamMembers", "现有团队"],
    ["whyNow", "为什么是现在"],
    ["longTermMoat", "长期优势"],
    ["roadmapFinance", "计划与融资需求"],
    ["others", "其他说明"],
  ];
  return (
    <article className="surface p-6 md:p-9">
      <div className="border-b border-border pb-7 mb-7">
        <p className="eyebrow mb-5">PROJECT / {data.sector || "EXPLORING"}</p>
        <Heading className="text-3xl md:text-4xl font-semibold tracking-tight break-words">
          {data.name || "一个新想法"}
        </Heading>
        <p className="text-base text-ink-light mt-4 leading-7">
          {data.oneLiner || "用一句话介绍你正在做的事。"}
        </p>
        <div className="flex flex-wrap gap-4 mt-5 text-xs text-ink-light">
          <span className="flex items-center gap-1">
            <MapPin size={13} />
            {data.location || "地点待补充"}
          </span>
          {data.stage && <span>{data.stage}</span>}
        </div>
      </div>
      <div className="space-y-7">
        {details
          .filter(([key]) => data[key])
          .map(([key, label]) => (
            <section key={key}>
              <h3 className="text-xs font-semibold text-ink-light mb-3 flex items-center gap-2">
                {key === "vision" && (
                  <Target size={14} className="text-accent-blue" />
                )}
                {label}
              </h3>
              <p className="whitespace-pre-wrap text-sm leading-7 break-words">
                {data[key]}
              </p>
            </section>
          ))}
        <section className="bg-paper rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users size={16} className="text-accent-blue" />
            期待的伙伴
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.talentNeeds?.length ? (
              data.talentNeeds.map((role, i) => (
                <span
                  key={i}
                  className="text-xs bg-white border border-border px-3 py-2 rounded-lg"
                >
                  {role}
                </span>
              ))
            ) : (
              <p className="text-sm text-ink-light">还在探索合作方向</p>
            )}
          </div>
        </section>
      </div>
      <p className="mt-8 pt-5 border-t border-border text-[10px] font-mono tracking-widest text-ink-light">
        SHARED BY THE FOUNDER · STARTUP HUB
      </p>
    </article>
  );
}
