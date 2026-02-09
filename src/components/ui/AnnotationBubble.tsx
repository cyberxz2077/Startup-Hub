import { useState } from 'react';
import { X } from 'lucide-react';

export const AnnotationBubble = ({ rect, onSave, onCancel }: { rect: DOMRect | null, onSave: (c: string) => void, onCancel: () => void }) => {
    const [comment, setComment] = useState("");
    if (!rect) return null;
    const top = rect.top + window.scrollY - 10;
    const left = rect.left + window.scrollX + (rect.width / 2);
    return (
        <div className="fixed z-[100] transform -translate-x-1/2 -translate-y-full bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-64 animate-in fade-in zoom-in-95" style={{ top, left }}>
            <div className="flex justify-between items-center mb-2"><span className="text-xs font-bold text-ink">Add Note</span><button onClick={onCancel}><X className="w-3 h-3" /></button></div>
            <textarea className="w-full text-sm border p-2 h-20 mb-2 font-sans focus:outline-none focus:border-ink" value={comment} onChange={e => setComment(e.target.value)} autoFocus placeholder="Your feedback..." />
            <button onClick={() => onSave(comment)} disabled={!comment.trim()} className="bg-ink text-white px-3 py-1 rounded text-xs w-full hover:bg-ink-light transition-colors">Save</button>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-white border-b border-r border-gray-200"></div>
        </div>
    );
};
