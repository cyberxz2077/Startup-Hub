'use client';

import { useState, useEffect } from 'react';
import { Send, User, ChevronLeft, Briefcase, Building2 } from 'lucide-react';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    createdAt: string;
}

interface ChatSession {
    id: string;
    targetId: string;
    targetType: string;
    messages: Message[];
    updatedAt: string;
}

const getTargetInfo = (session: ChatSession) => {
    const nameMatch = session.targetId.match(/test_((.+))/);
    const name = nameMatch ? nameMatch[1].replace(/_/g, ' ') : session.targetId;
    const type = session.targetType;
    return { name, type };
};

export const Inbox = ({ onBack }: { onBack: () => void }) => {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        fetch('/api/inbox')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setSessions(data);
                setLoading(false);
            });
    }, []);

    const sendMessage = async () => {
        if (!newMessage.trim() || !selectedSession) return;

        try {
            const res = await fetch('/api/inbox', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    targetId: selectedSession.targetId,
                    targetType: selectedSession.targetType,
                    content: newMessage
                })
            });

            if (res.ok) {
                const data = await res.json();
                const updatedMsg: Message = data.message;
                setSelectedSession({
                    ...selectedSession,
                    messages: [updatedMsg, ...selectedSession.messages]
                });
                setNewMessage('');
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="p-8 text-center text-ink-light animate-pulse">Loading conversations...</div>;

    return (
        <div className="flex flex-col h-full bg-paper-texture">
            <div className="h-14 border-b border-border flex items-center px-4 gap-4 bg-white/80 backdrop-blur shrink-0">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5 text-ink" />
                </button>
                <h2 className="font-serif font-bold text-lg">Inbox</h2>
            </div>

            <div className="flex-1 flex overflow-hidden">
                <div className={`w-full md:w-80 border-r border-border bg-white overflow-y-auto ${selectedSession ? 'hidden md:block' : 'block'}`}>
                    {sessions.length === 0 ? (
                        <div className="p-8 text-center text-gray-400 text-sm">No messages yet.</div>
                    ) : (
                        sessions.map(s => {
                            const info = getTargetInfo(s);
                            return (
                                <div
                                    key={s.id}
                                    onClick={() => setSelectedSession(s)}
                                    className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${selectedSession?.id === s.id ? 'bg-accent-blue/5 border-l-4 border-l-accent-blue' : ''}`}
                                >
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                            {info.type === 'project' ? (
                                                <Briefcase className="w-5 h-5 text-accent-blue" />
                                            ) : (
                                                <Building2 className="w-5 h-5 text-ink-light" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-sm truncate text-ink">{info.name}</div>
                                            <div className="text-[10px] text-gray-400 uppercase tracking-tighter">{info.type}</div>
                                        </div>
                                    </div>
                                    <div className="text-xs text-ink-light truncate pl-13 mt-1">
                                        {s.messages[0]?.content || "No messages"}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className={`flex-1 flex flex-col bg-white/50 ${!selectedSession ? 'hidden md:flex items-center justify-center text-gray-400 italic' : 'flex'}`}>
                    {!selectedSession ? (
                        <div className="text-center">
                            <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p>Select a conversation to start chatting</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse gap-4">
                                {selectedSession.messages.map(m => (
                                    <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${m.role === 'user' ? 'bg-ink text-white rounded-br-none' : 'bg-white border border-border text-ink rounded-bl-none shadow-sm'}`}>
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-white border-t border-border flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                    placeholder="Type your message..."
                                    className="flex-1 px-4 py-2 bg-gray-50 border border-border rounded-full text-sm focus:outline-none focus:border-ink transition-colors"
                                />
                                <button
                                    onClick={sendMessage}
                                    className="w-10 h-10 bg-ink text-white rounded-full flex items-center justify-center hover:bg-ink-light transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
