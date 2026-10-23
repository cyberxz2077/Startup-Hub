import { ArrowUpRight, Layers3, Fingerprint } from "lucide-react";
export const RoleSelectionPage = ({
  onNavigate,
}: {
  onNavigate: (view: "project_create" | "profile_create") => void;
}) => (
  <section className="page-container py-14 md:py-20 animate-in">
    <div className="max-w-[860px] mx-auto">
      <p className="eyebrow mb-5">YOUR NEXT CHAPTER</p>
      <h1 className="text-4xl font-semibold tracking-tight mb-5">
        这次，从哪里开始？
      </h1>
      <p className="text-ink-light leading-7 mb-10">
        一个清晰的介绍，让对的人更容易看见你。两种身份可以同时拥有。
      </p>
      <div className="grid md:grid-cols-2 gap-5">
        {[
          {
            view: "project_create" as const,
            icon: Layers3,
            tag: "FOR FOUNDERS",
            title: "我有一个项目",
            desc: "整理愿景、产品和合作需求，寻找愿意一起共建的人。",
            cta: "建立项目档案",
          },
          {
            view: "profile_create" as const,
            icon: Fingerprint,
            tag: "FOR BUILDERS",
            title: "我带着能力而来",
            desc: "展示你的经历和擅长的事，探索想要参与的项目与合作。",
            cta: "建立个人档案",
          },
        ].map((item) => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className="surface text-left p-7 md:p-9 hover:border-accent-blue transition-colors group"
          >
            <item.icon
              size={32}
              strokeWidth={1.4}
              className="text-accent-blue mb-10"
            />
            <p className="eyebrow mb-3">{item.tag}</p>
            <h2 className="text-2xl font-semibold mb-4">{item.title}</h2>
            <p className="text-sm text-ink-light leading-7 mb-8">{item.desc}</p>
            <span className="text-sm font-semibold flex items-center justify-between">
              {item.cta}
              <ArrowUpRight
                size={19}
                className="text-accent-blue group-hover:translate-x-0.5 transition-transform"
              />
            </span>
          </button>
        ))}
      </div>
    </div>
  </section>
);
