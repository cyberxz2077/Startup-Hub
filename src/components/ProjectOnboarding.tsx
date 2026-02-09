import { useState, useEffect } from 'react';
import { LayoutGrid, Edit3, Check, X, Upload } from 'lucide-react';
import { ProjectData, Message, Attachment, Annotation, initialProjectData } from '@/types';
import { GoogleGenAI } from '@google/genai';
import { AIChat } from './AIChat';
import { ProjectArtifact } from './ProjectArtifact';
import { AnnotationBubble } from './ui/AnnotationBubble';

const PROJECT_SYSTEM_INSTRUCTION = `
You are a seasoned Startup Co-founder and Interviewer. Help a founder articulate their project vision.
Output JSON: { "reply": "string", "updates": { ...partial ProjectData... } }
CRITICAL: You must aggressively extract and populate the following fields in the 'updates' object whenever relevant information is shared:
- productHighlights (What is the product?)
- vision (Long term goal)
- problem (What pain point?)
- solution (How do you solve it?)
- talentNeeds (Array of strings, e.g. ["CTO", "Growth Hacker"])
- targetAudience
- businessModel
- differentiation
- marketSize
- teamMembers
- whyNow
- longTermMoat
- roadmapFinance
- others
- name (Project Name)
- oneLiner (Catchy tagline)
- sector (e.g. AI, SaaS)
- location
- stage (e.g. Idea, Seed)

Ask one question at a time. Keep it conversational but focused.
If the user uploads a file (BP/Deck), analyze it completely and fill in AS MANY fields as possible in one go.
Tone: Professional, direct, slightly critical but constructive (like a YC partner).

LANGUAGE INSTRUCTION: You MUST detect the language of the user's input (or uploaded file). If the user speaks Chinese (or uploads Chinese content), your 'reply' MUST be in Chinese. If the user speaks English, reply in English. Do not default to English if the input is Chinese.
`;

const PublishModal = ({ isOpen, onClose, onConfirm, loading }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, loading?: boolean }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 border border-border">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600"><Upload className="w-8 h-8" /></div>
                    <h2 className="text-2xl font-serif font-bold text-ink mb-2">Ready to Publish?</h2>
                    <p className="text-ink-light font-sans mb-8">Your project profile will be live for candidates to see. You can still make updates later.</p>
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

export const ProjectOnboarding = ({ onBack }: { onBack: () => void }) => {
    const [data, setData] = useState<ProjectData>(initialProjectData);
    const [messages, setMessages] = useState<Message[]>([{ role: 'model', text: "你好！我是你的 AI 联合创始人助手。为了高效帮你生成项目档案，请告诉我你的项目名称、愿景和目前遇到的核心问题，或者直接上传 BP。" }]);
    const [chatSession, setChatSession] = useState<any>(null);
    const [annotations, setAnnotations] = useState<Annotation[]>([]);
    const [selection, setSelection] = useState<{ field: string, text: string, rect: DOMRect } | null>(null);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const init = async () => {
            const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
            if (!apiKey) {
                console.error("Gemini API Key missing");
                return;
            }
            const ai = new GoogleGenAI({ apiKey });
            // 使用 gemini-1.5-flash 模型
            setChatSession(ai.chats.create({ model: 'gemini-1.5-flash', config: { systemInstruction: PROJECT_SYSTEM_INSTRUCTION, responseMimeType: "application/json" } }));
        };
        init();
    }, []);

    const handleMsg = async (text: string, att?: Attachment | null) => {
        if (!chatSession) return;
        const userMsg: Message = { role: 'user', text: att ? `[File: ${att.name}] ${text}` : text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);
        try {
            const content = att ? [{ text }, { inlineData: { mimeType: att.mimeType, data: att.data } }] : text;
            const res = await chatSession.sendMessage({ message: content });
            const json = JSON.parse(res.text());
            setMessages(prev => [...prev, { role: 'model', text: json.reply }]);
            if (json.updates) setData(prev => ({ ...prev, ...json.updates }));
        } catch (e) { console.error(e); } finally {
            setLoading(false);
        }
    };

    const handleRevision = () => {
        if (annotations.length === 0) return alert("Please add annotations first.");
        const feedback = "Feedback based on annotations:\n" + annotations.map((a, i) => `${i + 1}. In ${a.field} (${a.selectedText}): ${a.comment}`).join("\n");
        handleMsg(feedback);
    };

    const confirmPublish = async () => {
        setIsSaving(true);
        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                if (res.status === 401) {
                    alert("Please login first!"); // Simple alert for now, could be better UI
                    window.location.href = '/api/auth/login';
                    return;
                }
                throw new Error('Failed to save');
            }

            setIsPublishModalOpen(false);
            setMessages(prev => [...prev, { role: 'model', text: "恭喜！项目已成功发布并保存。正在为您匹配潜在候选人..." }]);
            setTimeout(onBack, 2000);
        } catch (e) {
            console.error(e);
            alert("Failed to publish project. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full animate-in fade-in duration-300">
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="flex-1 bg-[#F0EFE9] p-4 md:p-8 overflow-y-auto custom-scrollbar relative">
                    <div className="mb-4 flex-none flex justify-between items-center px-2">
                        <h2 className="text-xs font-sans font-bold text-ink-light uppercase tracking-widest flex items-center gap-2"><LayoutGrid className="w-4 h-4" /> Live Preview</h2>
                        <div className="text-[10px] bg-white px-2 py-1 rounded border border-border text-ink-light">{annotations.length} Annotations</div>
                    </div>

                    <ProjectArtifact
                        data={data}
                        annotations={annotations}
                        onAddAnnotation={(f, t, r) => setSelection({ field: f, text: t, rect: r })}
                    />
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
                <AIChat messages={messages} onSendMessage={handleMsg} loading={loading} persona="Co-founder Agent" />
            </div>

            <PublishModal isOpen={isPublishModalOpen} onClose={() => setIsPublishModalOpen(false)} onConfirm={confirmPublish} loading={isSaving} />
        </div>
    );
};
