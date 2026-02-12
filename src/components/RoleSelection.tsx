'use client';

import { useState, useEffect, useRef } from 'react';
import { Briefcase, User, ArrowRight, CornerDownLeft, Building2, FileText, ChevronRight, CheckCircle, Loader2, LogIn, ChevronUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface UserInfo {
    name: string;
    email?: string;
    avatar?: string;
    bio?: string;
}

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

const MarkdownRenderer = ({ content, className = '' }: { content: string; className?: string }) => (
    <div className={`markdown-content text-sm text-ink-light ${className}`}>
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                h1: ({ children }) => <h1 className="text-lg font-bold text-ink mb-2 mt-3 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold text-ink mb-1.5 mt-2.5 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold text-ink mb-1 mt-2 first:mt-0">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-semibold text-ink mb-0.5 mt-1.5 first:mt-0">{children}</h4>,
                p: ({ children }) => <p className="mb-1.5 last:mb-0 leading-relaxed">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                br: () => <br />,
                hr: () => <hr className="my-3 border-gray-200" />,
                code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-600 my-2">{children}</blockquote>,
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
);

export const RoleSelectionPage = ({ onNavigate }: { onNavigate: (view: 'project_create' | 'profile_create') => void }) => {
    const [selectedRole, setSelectedRole] = useState<'founder' | 'talent' | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isCardExpanded, setIsCardExpanded] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/profiles');
            if (res.ok) {
                const data = await res.json();
                if (data.name) {
                    setUserInfo({
                        name: data.name,
                        email: data.email,
                        avatar: data.avatar,
                        bio: data.bio,
                    });
                }
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleClick = (role: 'founder' | 'talent') => {
        if (role === 'talent') {
            onNavigate('profile_create');
        } else {
            setSelectedRole('founder');
        }
    };

    const handleFounderAction = (action: 'project' | 'profile') => {
        if (action === 'project') onNavigate('project_create');
        else onNavigate('profile_create');
    };

    const handleLogin = () => {
        window.location.href = '/api/auth/login';
    };

    const UserInfoCard = () => {
        const hasBio = userInfo?.bio && userInfo.bio.length > 100;
        
        return (
            <div 
                ref={cardRef}
                className={`mt-8 rounded-xl border transition-all duration-300 ease-out ${
                    userInfo ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                } ${isCardExpanded && hasBio ? 'shadow-lg' : ''}`}
                onMouseEnter={() => hasBio && setIsCardExpanded(true)}
                onMouseLeave={() => setIsCardExpanded(false)}
            >
                {userInfo ? (
                    <div className="p-6">
                        <div className="flex items-center gap-2 text-green-700 font-bold mb-4">
                            <CheckCircle className="w-5 h-5" />
                            <span>已获取您的 SecondMe 身份信息</span>
                        </div>
                        <div className="flex items-start gap-4">
                            {userInfo.avatar ? (
                                <img 
                                    src={userInfo.avatar} 
                                    alt="Avatar" 
                                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md flex-shrink-0"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center border-2 border-white shadow-md flex-shrink-0">
                                    <User className="w-7 h-7 text-gray-400" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="space-y-1.5">
                                    <div className="text-sm">
                                        <span className="font-bold text-ink">Name：</span>
                                        <span className="text-ink-light">{userInfo.name || '未设置'}</span>
                                    </div>
                                    {userInfo.email && (
                                        <div className="text-sm">
                                            <span className="font-bold text-ink">Email：</span>
                                            <span className="text-ink-light">{userInfo.email}</span>
                                        </div>
                                    )}
                                    {userInfo.bio && (
                                        <div className="text-sm">
                                            <span className="font-bold text-ink">Bio：</span>
                                        </div>
                                    )}
                                </div>
                                
                                {userInfo.bio && (
                                    <div 
                                        className={`mt-2 overflow-hidden transition-all duration-300 ease-out ${
                                            isCardExpanded && hasBio ? 'max-h-[500px]' : 'max-h-16'
                                        }`}
                                    >
                                        <div className={`p-3 bg-white/60 rounded-lg border border-green-100 ${
                                            isCardExpanded && hasBio ? '' : 'relative'
                                        }`}>
                                            <MarkdownRenderer content={userInfo.bio} />
                                            {!isCardExpanded && hasBio && (
                                                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white/80 to-transparent pointer-events-none" />
                                            )}
                                        </div>
                                    </div>
                                )}
                                
                                {hasBio && (
                                    <div className={`flex items-center justify-center gap-1 text-xs text-gray-400 mt-2 transition-opacity duration-200 ${
                                        isCardExpanded ? 'opacity-0' : 'opacity-100'
                                    }`}>
                                        <ChevronUp className="w-3 h-3" />
                                        <span>鼠标悬停查看完整信息</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-ink font-medium">未登录 SecondMe</p>
                                <p className="text-ink-light text-sm">登录后可同步您的身份信息</p>
                            </div>
                            <button 
                                onClick={handleLogin}
                                className="flex items-center gap-2 px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink-light transition-colors"
                            >
                                <LogIn className="w-4 h-4" />
                                登录
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="flex flex-col min-h-full items-center justify-center bg-paper-texture relative p-4">
            <GeometricDecorations />

            <div className="z-10 w-full max-w-4xl animate-in fade-in duration-500">
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink">Choose Your Path</h1>
                    <p className="text-ink-light font-sans text-lg">How will you contribute to the future?</p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-ink-light" />
                    </div>
                ) : selectedRole === null ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <button 
                                onClick={() => handleRoleClick('founder')} 
                                className="group relative bg-white border border-border p-8 rounded-xl shadow-paper hover:shadow-float transition-all hover:-translate-y-1 text-left"
                            >
                                <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center mb-6 group-hover:bg-ink group-hover:text-white transition-colors">
                                    <Briefcase className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-serif font-bold text-ink mb-2">I am a Founder</h3>
                                <p className="text-ink-light text-sm leading-relaxed">I have a vision and I&apos;m looking for builders to bring it to life. I need to recruit a team.</p>
                                <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-wider text-accent-red opacity-0 group-hover:opacity-100 transition-opacity">
                                    Select <ArrowRight className="w-4 h-4 ml-2" />
                                </div>
                            </button>

                            <button 
                                onClick={() => handleRoleClick('talent')} 
                                className="group relative bg-white border border-border p-8 rounded-xl shadow-paper hover:shadow-float transition-all hover:-translate-y-1 text-left"
                            >
                                <div className="w-16 h-16 bg-paper rounded-full flex items-center justify-center mb-6 group-hover:bg-accent-blue group-hover:text-white transition-colors">
                                    <User className="w-8 h-8" />
                                </div>
                                <h3 className="text-2xl font-serif font-bold text-ink mb-2">I am a Talent</h3>
                                <p className="text-ink-light text-sm leading-relaxed">I have exceptional skills and I&apos;m looking for a high-potential ship to board.</p>
                                <div className="mt-8 flex items-center text-sm font-bold uppercase tracking-wider text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity">
                                    Select <ArrowRight className="w-4 h-4 ml-2" />
                                </div>
                            </button>
                        </div>

                        <UserInfoCard />
                    </>
                ) : (
                    <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                        <div className="bg-white/80 backdrop-blur border border-border p-8 rounded-xl shadow-xl text-center relative">
                            <button onClick={() => setSelectedRole(null)} className="absolute top-4 left-4 text-gray-400 hover:text-ink flex items-center gap-1 text-xs">
                                <CornerDownLeft className="w-3 h-3" /> Back
                            </button>
                            <div className="w-12 h-12 bg-ink text-white rounded-full flex items-center justify-center mx-auto mb-4">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-ink mb-6">Founder Actions</h3>

                            <div className="space-y-4">
                                <button onClick={() => handleFounderAction('project')} className="w-full flex items-center gap-4 p-4 border border-border rounded-lg hover:border-ink hover:bg-paper transition-all group">
                                    <div className="bg-orange-100 text-orange-700 p-2 rounded">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="font-bold text-ink">Create Project</div>
                                        <div className="text-xs text-ink-light">Draft your venture&apos;s manifesto</div>
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
