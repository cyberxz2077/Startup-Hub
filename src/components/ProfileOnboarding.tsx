import { useState, useEffect, useRef } from 'react';
import { LayoutGrid, Edit3, Check, X, Camera, Sparkles, Loader2 } from 'lucide-react';
import { ProfileData, Message, Attachment, Annotation, initialProfileData } from '@/types';
import { AIChat } from './AIChat';
import { HighlightableText } from './ui/HighlightableText';
import { AnnotationBubble } from './ui/AnnotationBubble';
import { AvatarCropper } from './ui/AvatarCropper';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const PROFILE_SYSTEM_INSTRUCTION = `
You are a top-tier Talent Agent and Career Coach. Help a talent articulate their unique value proposition.
Output JSON: { "reply": "string", "updates": { ...partial ProfileData... } }
Focus on extracting: name, title (e.g. Senior Engineer), location, bio, skills (array), experienceHighlights, education, lookingFor, superpower.
Tone: Encouraging, sharp, focused on highlighting strengths.

LANGUAGE INSTRUCTION: You MUST detect the language of the user's input (or uploaded file). If the user speaks Chinese (or uploads Chinese content), your 'reply' MUST be in Chinese. If the user speaks English, reply in English. Do not default to English if the input is Chinese.
`;

const MarkdownRenderer = ({ content, className = '' }: { content: string; className?: string }) => (
    <div className={`markdown-content ${className}`}>
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

const PublishModal = ({ isOpen, onClose, onConfirm, loading }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, loading?: boolean }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-border">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6 text-blue-600"><Check className="w-8 h-8" /></div>
                    <h2 className="text-2xl font-serif font-bold text-ink mb-2">Ready to Publish?</h2>
                    <p className="text-ink-light font-sans mb-8">Your profile will be live for founders to discover. You can still make updates later.</p>
                    <div className="flex gap-4 w-full">
                        <button onClick={onClose} disabled={loading} className="flex-1 py-3 px-4 rounded-lg border border-gray-300 font-sans font-medium text-ink hover:bg-gray-50 transition-colors disabled:opacity-50">Cancel</button>
                        <button onClick={onConfirm} disabled={loading} className="flex-1 py-3 px-4 rounded-lg bg-ink text-white font-sans font-medium hover:bg-ink-light transition-colors shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? "Saving..." : "Confirm & Publish"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ProfileOnboarding = ({ onBack }: { onBack: () => void }) => {
    const [data, setData] = useState<ProfileData>(initialProfileData);
    const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: "你好！我是你的职业经纪人。请告诉我你的职业背景、核心技能以及你正在寻找什么样的机会。如果有简历（PDF），请直接上传，我会帮你提取亮点。" }]);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [selection, setSelection] = useState<{ field: string, text: string, rect: DOMRect } | null>(null);
    const [loading, setLoading] = useState(false);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [showCropper, setShowCropper] = useState(false);
    const [tempImage, setTempImage] = useState<string | null>(null);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            setIsLoadingProfile(true);
            try {
                const res = await fetch('/api/profiles');
                if (res.ok) {
                    const profileData = await res.json();
                    setData(prev => ({ ...prev, ...profileData }));
                    if (profileData.name) {
                        setMessages([{ role: 'model', text: `欢迎回来，${profileData.name}！我已加载你的个人资料。今天想如何改进它？` }]);
                    }
                }
            } catch (e) {
                console.error("Failed to fetch profile", e);
            } finally {
                setIsLoadingProfile(false);
            }
        };
        fetchProfile();
    }, []);

    const handleMsg = async (text: string, att?: Attachment | null) => {
        const userMsg: Message = { role: 'user', text: att ? `[Resume: ${att.name}] ${text}` : text };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setLoading(true);
        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    systemInstruction: PROFILE_SYSTEM_INSTRUCTION,
                    attachment: att
                }),
            });

            if (!res.ok) throw new Error('AI response failed');

            const json = await res.json();
            setMessages(prev => [...prev, { role: 'model', text: json.reply }]);
            if (json.updates) setData(prev => ({ ...prev, ...json.updates }));
        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'model', text: "抱歉，AI 助手暂时无法响应。请检查网络连接或稍后再试。" }]);
        } finally {
            setLoading(false);
        }
    };

    const handleRevision = () => {
        if (annotations.length === 0) return alert("Please add annotations first.");
        const feedback = "Feedback based on annotations:\n" + annotations.map((a, i) => `${i + 1}. In ${a.field} (${a.selectedText}): ${a.comment}`).join("\n");
        handleMsg(feedback);
    };

    const [isSaving, setIsSaving] = useState(false);

    const confirmPublish = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/profiles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                if (res.status === 401) {
                    alert("Please login first!");
                    window.location.href = '/api/auth/login';
                    return;
                }
                throw new Error('Failed to save');
            }

            setIsPublishModalOpen(false);
            setMessages(prev => [...prev, { role: 'model', text: "恭喜！个人档案已成功发布并保存。正在为您寻找合适的机会..." }]);
            setTimeout(onBack, 2000);
        } catch (e) {
            console.error(e);
            alert("Failed to publish profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => {
                setTempImage(ev.target?.result as string);
                setShowCropper(true);
            };
            reader.readAsDataURL(file);
        }
    };

    const skills = Array.isArray(data.skills) ? data.skills : [];

    return (
        <div className="flex flex-col md:flex-row h-full animate-in fade-in duration-300">
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="flex-1 bg-[#F0EFE9] p-4 md:p-8 overflow-y-auto relative custom-scrollbar">
                    <div className="mb-4 flex-none flex justify-between items-center px-2">
                        <h2 className="text-xs font-sans font-bold text-ink-light uppercase tracking-widest flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Live Preview</h2>
                        <div className="text-[10px] bg-white px-2 py-1 rounded border border-border text-ink-light">{annotations.length} Annotations</div>
                    </div>

                    {isLoadingProfile ? (
                        <div className="max-w-3xl mx-auto bg-white/80 p-12 shadow-paper border border-border min-h-[400px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                                <p className="text-ink-light font-sans text-sm">正在加载您的 SecondMe 信息...</p>
                            </div>
                        </div>
                    ) : (
                    <div className="max-w-3xl mx-auto bg-white/80 p-12 shadow-paper border border-border min-h-full relative">
                        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                            <img src="https://www.svgrepo.com/show/491931/resume-cv.svg" className="w-32 h-32" alt="watermark" />
                        </div>

                        <div className="flex items-end gap-6 border-b-2 border-ink pb-8 mb-8">
                            <div className="relative group">
                                <div
                                    className="w-24 h-24 bg-gray-200 border border-gray-300 flex items-center justify-center text-4xl font-serif text-gray-400 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                                    onClick={() => avatarInputRef.current?.click()}
                                >
                                    {data.avatar ? (
                                        <img src={data.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        data.name ? data.name[0] : "?"
                                    )}

                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                        <Camera className="w-8 h-8" />
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    ref={avatarInputRef}
                                    onChange={handleAvatarSelect}
                                    className="hidden"
                                    accept="image/*"
                                />
                            </div>

                            <div className="flex-1">
                                <h1 className="text-4xl font-serif font-bold text-ink mb-1"><HighlightableText text={data.name || "Your Name"} field="name" annotations={annotations} onSelection={(f, t, r) => setSelection({ field: f, text: t, rect: r })} /></h1>
                                <div className="text-lg font-sans text-accent-blue font-medium"><HighlightableText text={data.title || "Current Title"} field="title" annotations={annotations} onSelection={(f, t, r) => setSelection({ field: f, text: t, rect: r })} /></div>
                                <div className="text-sm text-gray-500 mt-1"><HighlightableText text={data.location || "Location"} field="location" annotations={annotations} onSelection={(f, t, r) => setSelection({ field: f, text: t, rect: r })} /></div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <section className="bg-paper p-6 rounded-lg border border-ink/5">
                                <h3 className="font-bold uppercase text-xs text-ink-light mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-accent-red" /> My Superpower</h3>
                                <div className="text-lg font-serif italic text-ink">
                                    <MarkdownRenderer content={data.superpower || "Your unique superpower..."} />
                                </div>
                            </section>

                            <section>
                                <h3 className="font-bold uppercase text-xs text-ink-light mb-2">Professional Bio</h3>
                                <div className="leading-relaxed">
                                    <MarkdownRenderer content={data.bio || "Your professional background..."} />
                                </div>
                            </section>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <section>
                                    <h3 className="font-bold uppercase text-xs text-ink-light mb-3">Skills</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {skills.length ? skills.map((s, i) => <span key={i} className="px-3 py-1 bg-white border border-gray-200 rounded text-sm text-ink">{s}</span>) : <span className="text-gray-300 text-sm">Skills will appear here...</span>}
                                    </div>
                                </section>
                                <section>
                                    <h3 className="font-bold uppercase text-xs text-ink-light mb-3">Education</h3>
                                    <div className="text-sm">
                                        <MarkdownRenderer content={data.education || "Your education..."} />
                                    </div>
                                </section>
                            </div>

                            <section>
                                <h3 className="font-bold uppercase text-xs text-ink-light mb-2">Experience Highlights</h3>
                                <div className="text-sm leading-relaxed">
                                    <MarkdownRenderer content={data.experienceHighlights || "Your experience highlights..."} />
                                </div>
                            </section>

                            <section className="border-t border-dashed border-gray-300 pt-6">
                                <h3 className="font-bold uppercase text-xs text-ink-light mb-2">Looking For</h3>
                                <div className="text-base text-accent-blue">
                                    <MarkdownRenderer content={data.lookingFor || "What you're looking for..."} />
                                </div>
                            </section>
                        </div>
                    </div>
                    )}
                </div>

                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-40">
                    <button onClick={handleRevision} className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 shadow-float rounded-full text-ink font-sans font-medium hover:bg-gray-50 hover:text-accent-blue transition-all">
                        <Edit3 className="w-4 h-4" /> 修订 (Revise) {annotations.length > 0 && <span className="bg-accent-red text-white text-[10px] px-1.5 py-0.5 rounded-full">{annotations.length}</span>}
                    </button>
                    <button onClick={() => setIsPublishModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-ink shadow-float rounded-full text-white font-sans font-medium hover:bg-ink-light transition-all">
                        <Check className="w-4 h-4" /> 发布 (Publish)
                    </button>
                </div>

                {selection && <AnnotationBubble rect={selection.rect} onSave={(c) => { setAnnotations([...annotations, { id: Date.now().toString(), field: selection.field, selectedText: selection.text, comment: c, timestamp: Date.now() }]); setSelection(null); window.getSelection()?.removeAllRanges() }} onCancel={() => { setSelection(null); window.getSelection()?.removeAllRanges() }} />}
            </div>

            <div className="w-full md:w-[35%] border-l border-border bg-white z-20 shadow-2xl relative">
                <button onClick={onBack} className="absolute top-4 right-4 text-gray-400 hover:text-ink z-50"><X className="w-5 h-5" /></button>
                <AIChat messages={messages} onSendMessage={handleMsg} loading={loading} persona="Career Agent" />
            </div>

            <PublishModal isOpen={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)} onConfirm={confirmPublish} loading={isSaving} />

            {showCropper && tempImage && (
                <AvatarCropper
                    imageSrc={tempImage}
                    onCancel={() => { setShowCropper(false); setTempImage(null); }}
                    onSave={(croppedData) => {
                        setData(prev => ({ ...prev, avatar: croppedData }));
                        setShowCropper(false);
                        setTempImage(null);
                    }}
                />
            )}
        </div>
    );
};
