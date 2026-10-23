import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  AudioLines,
  Fingerprint,
  Orbit,
  Sparkles,
  MoveUpRight,
} from "lucide-react";

function ConnectionGraphic() {
  return (
    <div
      className="relative mx-auto aspect-[1.12] w-full max-w-[540px]"
      aria-label="把项目愿景、互补能力与共同方向连接起来的示意图"
      role="img"
    >
      <svg
        viewBox="0 0 560 500"
        className="absolute inset-0 h-full w-full"
        fill="none"
        aria-hidden="true"
      >
        <ellipse
          cx="280"
          cy="235"
          rx="190"
          ry="175"
          stroke="#DDE3EA"
          strokeDasharray="3 7"
        />
        <g className="network-orbit">
          <ellipse
            cx="280"
            cy="235"
            rx="230"
            ry="100"
            transform="rotate(-28 280 235)"
            stroke="#C5CEDB"
          />
          <circle
            cx="480"
            cy="137"
            r="6"
            fill="#3658F5"
            stroke="#F8FAF9"
            strokeWidth="4"
          />
          <ellipse
            cx="280"
            cy="235"
            rx="222"
            ry="105"
            transform="rotate(32 280 235)"
            stroke="#D9E0E8"
          />
        </g>
        <path
          d="M122 310L280 235L430 160M280 235L390 375"
          stroke="#3658F5"
          strokeOpacity=".5"
          strokeDasharray="4 5"
        />
        <path
          d="M280 155L354 198V281L280 325L206 281V198L280 155Z"
          fill="#EFF2FA"
          stroke="#C3CCE2"
        />
        <path
          d="M280 155V235M206 198L280 235L354 198M280 235V325"
          stroke="#BAC5DD"
        />
        <path
          d="M245 204L270 219V246L291 234V208L316 193V266L291 281V255L270 267V294L245 279V204Z"
          fill="#3658F5"
          transform="translate(0 -2)"
        />
        <circle
          cx="280"
          cy="235"
          r="132"
          stroke="#3658F5"
          strokeOpacity=".12"
        />
        <path d="M45 48H67M56 37V59M495 415H517M506 404V426" stroke="#AAB6C6" />
        <text
          x="34"
          y="470"
          fill="#6D798B"
          fontFamily="monospace"
          fontSize="10"
          letterSpacing="2"
        >
          IDEAS × PEOPLE × POSSIBILITY
        </text>
      </svg>
      <div className="absolute left-[2%] top-[21%] rounded-2xl border border-border bg-white p-4 shadow-paper w-[43%]">
        <div className="mb-3 flex items-center gap-2 text-[10px] font-mono tracking-wider text-ink-light">
          <span className="h-1.5 w-1.5 bg-accent-blue rounded-full" /> START
          WITH AN IDEA
        </div>
        <p className="text-base font-semibold">你想创造什么？</p>
        <div className="flex gap-1.5 mt-3">
          <span className="h-1.5 w-20 rounded bg-[#E3E9F8]" />
          <span className="h-1.5 w-9 rounded bg-[#EEF1F5]" />
        </div>
      </div>
      <div className="absolute right-0 top-[53%] rounded-2xl border border-border bg-white p-3 sm:p-4 shadow-paper w-[47%] sm:w-[41%]">
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex rounded-xl bg-blue-50 p-2 text-accent-blue">
            <Fingerprint size={22} />
          </span>
          <div>
            <p className="text-sm font-semibold whitespace-nowrap">互补的能力</p>
            <p className="text-xs text-ink-light mt-1">值得一起开始的人</p>
          </div>
        </div>
      </div>
      <div className="absolute bottom-[14%] left-[14%] flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2.5 text-xs text-ink-light shadow-paper">
        <Orbit size={15} className="text-accent-blue" /> 共同方向，无限可能
      </div>
    </div>
  );
}
export function Landing() {
  return (
    <div className="animate-in">
      <section className="page-container grid items-center gap-8 pb-12 pt-14 md:grid-cols-[1.1fr_1fr] md:gap-12 md:pt-24 md:pb-20">
        <div className="relative z-10">
          <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-border px-3 py-1.5 text-xs text-ink-light">
            <span className="relative h-1.5 w-1.5 rounded-full bg-accent-blue" />{" "}
            为认真创造的人而建{" "}
            <span className="ml-2 text-[10px] font-mono text-accent-blue">
              INVITE ONLY
            </span>
          </div>
          <h1 className="text-[42px] font-semibold tracking-[-.05em] leading-[1.23] lg:text-[66px]">
            让想法，
            <br />
            遇见<span className="text-accent-blue">共建的人。</span>
          </h1>
          <p className="mt-7 max-w-[430px] text-[16px] leading-8 text-ink-light">
            好的开始，是找到同路人。
            <br />
            在这里梳理你的想法、发现互补的能力，
            <br className="hidden sm:block" />
            让下一次合作从彼此理解开始。
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/?view=role_selection" className="btn-primary px-7">
              开始连接 <ArrowUpRight size={18} />
            </Link>
            <Link href="/?view=project_showcase" className="btn-secondary px-6">
              探索项目 <ArrowRight size={17} />
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs text-ink-light">
            <Sparkles size={13} /> AI 协助梳理 · 由你决定如何呈现
          </p>
        </div>
        <ConnectionGraphic />
      </section>
      <section className="page-container pb-16">
        <div className="border-t border-border pt-9">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
            <h2 className="text-lg font-semibold">
              从一个想法，到一次真正的连接。
            </h2>
            <span className="eyebrow">LESS FRICTION. MORE BUILDING.</span>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                n: "01",
                icon: AudioLines,
                title: "说清你正在做的事",
                text: "聊聊项目或经历，AI 帮你整理成一份清晰的档案。也可以随时直接编辑。",
              },
              {
                n: "02",
                icon: Orbit,
                title: "发现互补的可能",
                text: "从项目需求和个人能力出发，了解契合点，也看见需要进一步确认的条件。",
              },
              {
                n: "03",
                icon: MoveUpRight,
                title: "让合作开始发生",
                text: "主动发出一条站内消息，从真实的交流开始，决定是否一起向前。",
              },
            ].map((item) => (
              <article key={item.n} className="surface p-6">
                <div className="mb-6 flex items-center justify-between">
                  <item.icon
                    size={22}
                    strokeWidth={1.5}
                    className="text-accent-blue"
                  />
                  <span className="font-mono text-xs text-ink-light">
                    /{item.n}
                  </span>
                </div>
                <h3 className="font-semibold mb-3">{item.title}</h3>
                <p className="text-sm leading-7 text-ink-light">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <footer className="page-container pb-8">
        <div className="flex flex-wrap gap-3 justify-between border-t border-border pt-6 text-[11px] text-ink-light">
          <span className="font-mono tracking-wider">
            STARTUP HUB / BUILD TOGETHER.
          </span>
          <span>想法值得开始，合作值得认真。</span>
        </div>
      </footer>
    </div>
  );
}
