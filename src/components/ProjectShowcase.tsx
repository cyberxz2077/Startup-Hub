import { useState, useEffect } from 'react';
import { Search, MapPin, Users, ArrowUpRight, Sparkles } from 'lucide-react';
import { ProjectData } from '@/types';

interface ProjectWithMeta extends ProjectData {
    id: string;
    owner: { name: string | null, avatar: string | null };
    createdAt: string;
}

export const ProjectShowcase = ({ onBack }: { onBack: () => void }) => {
    const [projects, setProjects] = useState<ProjectWithMeta[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        fetch('/api/projects')
            .then(res => res.json())
            .then(data => {
                setProjects(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.oneLiner.toLowerCase().includes(filter.toLowerCase()) ||
        p.sector.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col bg-paper-texture animate-in fade-in duration-500 overflow-hidden">
            {/* Header */}
            <div className="p-8 md:p-12 pb-6 flex-none">
                <div className="max-w-6xl mx-auto w-full">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink mb-4">Discover the Future</h1>
                    <p className="text-lg text-ink-light mb-8 max-w-2xl font-sans">
                        Browse high-potential projects verified by our AI agents. Connect with founders who share your vision.
                    </p>

                    <div className="relative max-w-lg">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by keywords, sector, or vision..."
                            className="w-full pl-12 pr-4 py-3 rounded-full border border-border bg-white shadow-sm focus:ring-2 focus:ring-ink focus:outline-none transition-all"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto px-8 md:px-12 pb-12 custom-scrollbar">
                <div className="max-w-6xl mx-auto">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ink"></div>
                        </div>
                    ) : filteredProjects.length === 0 ? (
                        <div className="text-center py-20 bg-white/50 border border-dashed border-gray-300 rounded-xl">
                            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-ink-light font-sans">No projects found yet. Be the first to publish one!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredProjects.map((project) => (
                                <div key={project.id} className="group bg-white border border-border rounded-xl p-6 shadow-sm hover:shadow-float hover:-translate-y-1 transition-all flex flex-col h-[320px] relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <ArrowUpRight className="w-5 h-5 text-ink-light" />
                                    </div>

                                    <div className="mb-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-accent-blue bg-blue-50 px-2 py-1 rounded-sm">{project.sector || 'General'}</span>
                                            <span className="text-[10px] font-serif italic text-gray-400">{project.stage}</span>
                                        </div>
                                        <h3 className="text-xl font-serif font-bold text-ink mb-1 line-clamp-1" title={project.name}>{project.name}</h3>
                                        <p className="text-sm text-ink/70 font-sans line-clamp-2 min-h-[2.5em]">{project.oneLiner}</p>
                                    </div>

                                    <div className="flex-1 bg-paper/50 rounded-lg p-3 mb-4 overflow-hidden">
                                        <div className="text-xs text-ink-light mb-1 font-bold flex items-center gap-1"><Users className="w-3 h-3" /> Looking for:</div>
                                        <div className="flex flex-wrap gap-1">
                                            {project.talentNeeds?.slice(0, 3).map((role, i) => (
                                                <span key={i} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-ink/80">{role}</span>
                                            ))}
                                            {(project.talentNeeds?.length || 0) > 3 && <span className="text-[10px] text-gray-400">+{project.talentNeeds.length - 3}</span>}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gray-200 overflow-hidden">
                                                {project.owner.avatar ? (
                                                    <img src={project.owner.avatar} alt="Owner" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">{project.owner.name?.[0] || '?'}</div>
                                                )}
                                            </div>
                                            <span className="text-xs font-sans text-ink-light">{project.owner.name || 'Anonymous Founder'}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                                            <MapPin className="w-3 h-3" />
                                            {project.location || 'Remote'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
