import { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Paperclip, X, Send } from 'lucide-react';
import { Message, Attachment } from '@/types';

export const AIChat = ({ messages, onSendMessage, loading, persona }: { messages: Message[], onSendMessage: (text: string, att?: Attachment | null) => void, loading: boolean, persona: string }) => {
    const [input, setInput] = useState("");
    const [attachment, setAttachment] = useState<Attachment | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [input]);

    const handleSend = () => {
        if ((input.trim() || attachment) && !loading) {
            onSendMessage(input, attachment);
            setInput("");
            setAttachment(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
        }
    };

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (ev) => setAttachment({ name: file.name, data: (ev.target?.result as string).split(',')[1], mimeType: file.type });
            reader.readAsDataURL(file);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-border relative">
            <div className="p-4 border-b border-border flex items-center justify-between bg-paper/50 flex-none">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center shadow-lg"><Sparkles className="w-5 h-5" /></div>
                    <div><div className="font-serif font-bold text-ink">{persona}</div><div className="text-xs flex items-center gap-1"><span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-orange-500 animate-bounce' : 'bg-green-500 animate-pulse'}`}></span><span className={loading ? 'text-orange-600' : 'text-green-600'}>{loading ? 'Thinking...' : 'Online'}</span></div></div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-4 rounded-xl shadow-sm text-sm md:text-base leading-relaxed whitespace-pre-wrap font-sans ${msg.role === 'user' ? 'bg-ink text-white rounded-br-none' : 'bg-white border border-border text-ink rounded-bl-none'}`}>{msg.text}</div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-border text-ink rounded-xl rounded-bl-none p-4 shadow-sm flex items-center gap-2 text-sm">
                            <Loader2 className="animate-spin w-4 h-4 text-ink-light" />
                            <span className="text-ink-light italic">Processing...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-border bg-white flex flex-col gap-2">
                {attachment && <div className="text-xs bg-gray-100 p-2 rounded flex justify-between items-center border border-gray-200"><span className="flex items-center gap-1"><Paperclip className="w-3 h-3" /> {attachment.name}</span> <button onClick={() => setAttachment(null)}><X className="w-3 h-3" /></button></div>}
                <div className="flex gap-2 items-end bg-gray-50 border border-gray-200 rounded-xl p-2 focus-within:ring-1 focus-within:ring-ink transition-all">
                    <input type="file" ref={fileInputRef} onChange={handleFile} className="hidden" accept=".pdf,.doc,.docx,.txt,.md" />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-ink-light hover:text-ink hover:bg-gray-200 rounded transition-colors flex-shrink-0"><Paperclip className="w-5 h-5" /></button>
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type here..."
                        className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-ink text-sm font-sans placeholder:text-gray-400 focus:outline-none"
                        rows={1}
                    />
                    <button onClick={handleSend} disabled={loading} className="p-2 bg-ink text-white rounded hover:bg-ink-light disabled:opacity-50 transition-colors shadow-sm flex-shrink-0"><Send className="w-4 h-4" /></button>
                </div>
            </div>
        </div>
    );
};
