import { useState } from 'react';
import { Briefcase, User, ArrowRight, CornerDownLeft, Building2, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const GeometricDecorations = () => (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-[200px] -right-[200px] w-[800px] h-[800px] rounded-full border border-ink/10 opacity-60"></div>
        <div className="absolute -top-[150px] -right-[150px] w-[700px] h-[700px] rounded-full border border-dashed border-ink/20 opacity-40 animate-[spin_120s_linear_infinite]"></div>
        <div className="absolute top-[200px] right-[200px] w-12 h-12 bg-orange-300 rounded-full opacity-70 translate-x-1/2 -translate-y-1/2 shadow-lg shadow-orange-200/50"></div>
        <div className="absolute top-0 left-[10%] w-px h-full bg-ink/10 hidden md:block"></div>
        <div className="absolute top-0 right-[10%] w-px h-full bg-ink/10 hidden md:block"></div>
        <div className="absolute top-[30%] left-0 w-full h-px bg-ink/10"></div>
        <div className="absolute -bottom-[50px] -left-[50px] w-64 h-64 border border-ink/10 rotate-12 opacity-50"></div>
    </div>
);

export const RoleSelectionPage = ({ onNavigate }: { onNavigate: (view: 'project_create' | 'profile_create') => void }) => {
    const [selectedRole, setSelectedRole] = useState<'founder' | 'talent' | null>(null);

    const handleFounderClick = () => setSelectedRole('founder');
    const handleTalentClick = () => onNavigate('profile_create'); // Direct to profile for talent

    const handleFounderAction = (action: 'project' | 'profile') => {
        if (action === 'project') onNavigate('project_create');
        else onNavigate('profile_create');
    };

    return (
        <div className="flex flex-col min-h-full items-center justify-center bg-paper-texture relative p-4">
            <GeometricDecorations />

            <div className="z-10 w-full max-w-4xl animate-in fade-in duration-500">
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink">Choose Your Path</h1>
                    <p className="text-ink-light font-sans text-lg">How will you contribute to the future?</p>
                </div>

                {selectedRole === null ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <button onClick={handleFounderClick} className="group relative bg-white border border-border p-8 rounded-xl shadow-paper hover:shadow-float transition-all hover:-translate-y-1 text-left">
                            <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center mb-6 group-hover:bg-ink group-hover:text-white transition-colors">
                                <Briefcase className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-ink mb-2">I am a Founder</h3>
                            <p className="text-ink-light text-sm leading-relaxed">I have a vision and I'm looking for builders to bring it to life. I need to recruit a team.</p>
                            <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-wider text-accent-red opacity-0 group-hover:opacity-100 transition-opacity">
                                Select <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        </button>

                        <button onClick={handleTalentClick} className="group relative bg-white border border-border p-8 rounded-xl shadow-paper hover:shadow-float transition-all hover:-translate-y-1 text-left">
                            <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center mb-6 group-hover:bg-accent-blue group-hover:text-white transition-colors">
                                <User className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-ink mb-2">I am a Talent</h3>
                            <p className="text-ink-light text-sm leading-relaxed">I have exceptional skills and I'm looking for a high-potential ship to board.</p>
                            <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-wider text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity">
                                Select <ArrowRight className="w-4 h-4 ml-2" />
                            </div>
                        </button>
                    </div>
                ) : (
                    <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white/80 backdrop-blur border border-border p-8 rounded-xl shadow-xl text-center">
                            <button onClick={() => setSelectedRole(null)} className="absolute top-4 left-4 text-gray-400 hover:text-ink flex items-center gap-1 text-xs">
                                <CornerDownLeft className="w-3 h-3" /> Back
                            </button>
                            <div className="w-12 h-12 bg-ink text-white rounded-full flex items-center justify-center mx-auto mb-4">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-ink mb-6">Founder Actions</h3>

                            {/* 增加登录提示 */}
                            <div className="mb-6 p-4 bg-orange-50 border border-orange-100 rounded text-sm text-orange-700">
                                <Link href="/api/auth/login" className="underline font-bold">Login with SecondMe</Link> required to save projects
                            </div>

                            <div className="space-y-4">
                                <button onClick={() => handleFounderAction('project')} className="w-full flex items-center gap-4 p-4 border border-border rounded-lg hover:border-ink hover:bg-paper transition-all group">
                                    <div className="bg-orange-100 text-orange-700 p-2 rounded">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-ink">Create Project</div>
                                        <div className="text-xs text-ink-light">Draft your venture's manifesto</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-ink" />
                                </button>

                                <button onClick={() => handleFounderAction('profile')} className="w-full flex items-center gap-4 p-4 border border-border rounded-lg hover:border-ink hover:bg-paper transition-all group">
                                    <div className="bg-blue-100 text-blue-700 p-2 rounded">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-ink">Create My Profile</div>
                                        <div className="text-xs text-ink-light">Build your personal founder archive</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-ink" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
