import { Target, Users, Plus, Briefcase, Layers } from 'lucide-react';
import { ProjectData, Annotation } from '@/types';
import { HighlightableText } from './ui/HighlightableText';
import { DetailBlock } from './ui/DetailBlock';

export const ProjectArtifact = ({
    data, annotations, onAddAnnotation
}: {
    data: ProjectData, annotations: Annotation[], onAddAnnotation: (field: string, text: string, rect: DOMRect) => void
}) => {
    const isEmpty = (str: string) => !str || str.trim() === "";
    // Ensure talentNeeds is an array to avoid map errors
    const talentNeeds = Array.isArray(data.talentNeeds) ? data.talentNeeds : [];

    return (
        <div className="bg-white/80 backdrop-blur-sm shadow-paper border border-border p-8 md:p-12 min-h-[800px] relative pb-32">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                <img src="https://www.svgrepo.com/show/530573/conversation.svg" className="w-32 h-32" alt="watermark" />
            </div>

            {/* Header Section */}
            <div className="border-b-2 border-ink pb-8 mb-8">
                <div className="flex justify-between items-start">
                    <div className="space-y-4 max-w-[80%]">
                        <div className="text-xs font-sans font-bold tracking-[0.2em] text-accent-red uppercase mb-2">Project Manifest</div>
                        {isEmpty(data.name) ? (
                            <div className="h-12 bg-gray-100 rounded animate-pulse w-2/3"></div>
                        ) : (
                            <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink leading-tight">
                                <HighlightableText text={data.name} field="name" annotations={annotations} onSelection={onAddAnnotation} />
                            </h1>
                        )}

                        {isEmpty(data.oneLiner) ? (
                            <div className="h-6 bg-gray-100 rounded animate-pulse w-full mt-4"></div>
                        ) : (
                            <p className="text-xl text-ink-light italic font-serif mt-2">
                                "<HighlightableText text={data.oneLiner} field="oneLiner" annotations={annotations} onSelection={onAddAnnotation} />"
                            </p>
                        )}
                    </div>

                    <div className="border border-ink p-3 w-32 flex flex-col gap-2 items-center justify-center bg-paper rotate-[-2deg] shadow-sm">
                        <div className="text-[10px] font-sans uppercase tracking-widest text-ink-light text-center border-b border-ink/20 pb-1 w-full">Status</div>
                        <div className="font-bold font-serif text-center text-sm">{data.stage || "Drafting"}</div>
                        <div className="w-full h-px bg-ink/20"></div>
                        <div className="font-bold font-serif text-center text-accent-blue text-xs">{data.location || "China"}</div>
                    </div>
                </div>

                <div className="flex gap-4 mt-6">
                    {data.sector && (
                        <span className="px-3 py-1 bg-ink text-white text-xs font-sans tracking-wide rounded-full">
                            {data.sector}
                        </span>
                    )}
                </div>
            </div>

            {/* Core Content */}
            <div className="space-y-12">

                {/* Section 1: Vision */}
                <section>
                    <h2 className="flex items-center gap-3 text-lg font-bold font-sans tracking-wide text-ink mb-4 border-l-4 border-accent-red pl-3">
                        <Target className="w-5 h-5 text-accent-red" />
                        The Vision (愿景)
                    </h2>
                    {isEmpty(data.vision) ? (
                        <div className="p-6 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm font-sans text-center">
                            Tell the AI about the future you are building...
                        </div>
                    ) : (
                        <p className="text-lg leading-relaxed text-ink/90 whitespace-pre-wrap">
                            <HighlightableText text={data.vision} field="vision" annotations={annotations} onSelection={onAddAnnotation} />
                        </p>
                    )}
                </section>

                {/* Section 2: Problem & Solution Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <section>
                        <h3 className="text-sm font-bold font-sans uppercase tracking-widest text-ink-light mb-3">The Problem</h3>
                        {isEmpty(data.problem) ? (
                            <div className="h-24 bg-gray-50 border border-dashed border-gray-300 rounded-lg"></div>
                        ) : (
                            <p className="text-base leading-relaxed text-ink/80">
                                <HighlightableText text={data.problem} field="problem" annotations={annotations} onSelection={onAddAnnotation} />
                            </p>
                        )}
                    </section>
                    <section>
                        <h3 className="text-sm font-bold font-sans uppercase tracking-widest text-ink-light mb-3">The Solution</h3>
                        {isEmpty(data.solution) ? (
                            <div className="h-24 bg-gray-50 border border-dashed border-gray-300 rounded-lg"></div>
                        ) : (
                            <p className="text-base leading-relaxed text-ink/80">
                                <HighlightableText text={data.solution} field="solution" annotations={annotations} onSelection={onAddAnnotation} />
                            </p>
                        )}
                    </section>
                </div>

                {/* Section 3: Talent Needs */}
                <section>
                    <h2 className="flex items-center gap-3 text-lg font-bold font-sans tracking-wide text-ink mb-6 border-l-4 border-accent-blue pl-3">
                        <Users className="w-5 h-5 text-accent-blue" />
                        Who We Are Looking For (寻找同路人)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {talentNeeds.length === 0 ? (
                            <div className="col-span-2 p-6 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm font-sans text-center">
                                Describe the key roles or traits you need...
                            </div>
                        ) : (
                            talentNeeds.map((role, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-4 border border-border bg-white shadow-sm rounded transition hover:border-accent-blue group">
                                    <div className="w-8 h-8 rounded-full bg-paper flex items-center justify-center text-ink font-serif font-bold group-hover:bg-accent-blue group-hover:text-white transition-colors">
                                        {idx + 1}
                                    </div>
                                    <span className="font-serif text-lg">{role}</span>
                                </div>
                            ))
                        )}

                        {talentNeeds.length > 0 && (
                            <div className="flex items-center justify-center p-4 border border-dashed border-gray-300 rounded cursor-not-allowed opacity-50">
                                <Plus className="w-5 h-5 mr-2" />
                                <span className="text-sm font-sans">Add via Chat</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* Section 4: Project Details */}
                <section>
                    <h2 className="flex items-center gap-3 text-lg font-bold font-sans tracking-wide text-ink mb-6 border-l-4 border-ink pl-3">
                        <Briefcase className="w-5 h-5 text-ink" />
                        Project Details (项目详情)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                        <DetailBlock label="What" subLabel="产品功能" field="productHighlights" data={data} annotations={annotations} onSelection={onAddAnnotation} />
                        <DetailBlock label="Target Audience" subLabel="用户群体" field="targetAudience" data={data} annotations={annotations} onSelection={onAddAnnotation} />
                        <DetailBlock label="Commercial Essence" subLabel="商业模式" field="businessModel" data={data} annotations={annotations} onSelection={onAddAnnotation} />
                        <DetailBlock label="Differentiation" subLabel="差异化" field="differentiation" data={data} annotations={annotations} onSelection={onAddAnnotation} />
                        <DetailBlock label="Market Size" subLabel="市场规模" field="marketSize" data={data} annotations={annotations} onSelection={onAddAnnotation} />
                        <DetailBlock label="Team" subLabel="已有成员" field="teamMembers" data={data} annotations={annotations} onSelection={onAddAnnotation} />
                        <DetailBlock label="Why Now" subLabel="时机" field="whyNow" data={data} annotations={annotations} onSelection={onAddAnnotation} />
                        <DetailBlock label="Long-term Moat" subLabel="长期壁垒" field="longTermMoat" data={data} annotations={annotations} onSelection={onAddAnnotation} />

                        <div className="md:col-span-2 mt-4 pt-4 border-t border-dashed border-gray-200">
                            <DetailBlock label="Roadmap & Finance" subLabel="融资与规划" field="roadmapFinance" data={data} annotations={annotations} onSelection={onAddAnnotation} />
                        </div>
                    </div>
                </section>

                {/* Section 5: Others */}
                <section className="pt-8 border-t border-ink/10">
                    <h2 className="flex items-center gap-3 text-lg font-bold font-sans tracking-wide text-ink mb-6 border-l-4 border-gray-500 pl-3">
                        <Layers className="w-5 h-5 text-gray-500" />
                        Other Things (其他内容)
                    </h2>
                    {isEmpty(data.others) ? (
                        <div className="p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-400 text-sm font-sans">
                            Any other details will appear here...
                        </div>
                    ) : (
                        <p className="text-base leading-relaxed text-ink/80">
                            <HighlightableText text={data.others} field="others" annotations={annotations} onSelection={onAddAnnotation} />
                        </p>
                    )}
                </section>

                {/* Footer Signature Area */}
                <div className="mt-16 pt-8 border-t-2 border-ink flex justify-between items-end">
                    <div>
                        <div className="text-xs font-sans text-gray-400 mb-1">Created on</div>
                        <div className="font-mono text-sm">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                        <div className="font-cursive text-2xl text-ink/60 mb-1 font-serif italic">Verified by AI Hub</div>
                        <div className="h-px w-32 bg-ink/60 ml-auto"></div>
                    </div>
                </div>

            </div>
        </div>
    );
};
