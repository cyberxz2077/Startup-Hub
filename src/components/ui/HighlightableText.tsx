import { useRef } from 'react';
import { Annotation } from '@/types';

export const HighlightableText = ({
    text, field, annotations, onSelection
}: {
    text: string, field: string, annotations: Annotation[],
    onSelection: (field: string, text: string, rect: DOMRect) => void
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const handleMouseUp = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const selectedText = selection.toString().trim();
        if (selectedText.length > 0 && containerRef.current?.contains(selection.anchorNode)) {
            onSelection(field, selectedText, rect);
        }
    };

    const renderHighlightedText = () => {
        if (!text) return <span className="text-gray-400 italic">Content pending...</span>;
        if (annotations.length === 0) return text;

        const fieldAnnotations = annotations.filter(a => a.field === field && text.includes(a.selectedText));
        if (fieldAnnotations.length === 0) return text;
        fieldAnnotations.sort((a, b) => text.indexOf(a.selectedText) - text.indexOf(b.selectedText));
        let lastIndex = 0;
        const elements: React.ReactNode[] = [];
        fieldAnnotations.forEach((ann, idx) => {
            const startIndex = text.indexOf(ann.selectedText, lastIndex);
            if (startIndex === -1) return;
            if (startIndex > lastIndex) elements.push(text.substring(lastIndex, startIndex));
            elements.push(
                <span key={ann.id} className="bg-yellow-100 border-b-2 border-yellow-300 relative group cursor-pointer">
                    {ann.selectedText}
                    <sup className="bg-accent-red text-white text-[9px] font-bold rounded-full w-4 h-4 inline-flex items-center justify-center -top-2 ml-0.5 shadow-sm select-none">{annotations.findIndex(a => a.id === ann.id) + 1}</sup>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-ink text-white text-xs p-2 rounded shadow-xl z-50 pointer-events-none whitespace-normal">
                        {ann.comment}
                    </div>
                </span>
            );
            lastIndex = startIndex + ann.selectedText.length;
        });
        if (lastIndex < text.length) elements.push(text.substring(lastIndex));
        return elements;
    };

    return <div ref={containerRef} onMouseUp={handleMouseUp} className="relative inline">{renderHighlightedText()}</div>;
};
