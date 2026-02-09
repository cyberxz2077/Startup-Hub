import { ProjectData, Annotation } from '@/types';
import { HighlightableText } from './HighlightableText';

export const DetailBlock = ({
    label, subLabel, field, data, annotations, onSelection
}: {
    label: string, subLabel?: string, field: keyof ProjectData, data: ProjectData, annotations: Annotation[], onSelection: (field: string, text: string, rect: DOMRect) => void
}) => {
    const content = data[field] as string;
    const isPending = !content || content === "";

    return (
        <div className="space-y-2 group">
            <div className="flex items-baseline gap-2 border-b border-transparent group-hover:border-gray-100 transition-colors pb-1">
                <h3 className="text-xs font-bold font-sans uppercase tracking-widest text-ink">{label}</h3>
                {subLabel && <span className="text-[10px] text-gray-400 font-serif italic">{subLabel}</span>}
            </div>
            <div className="text-sm md:text-base leading-relaxed text-ink/80 min-h-[3rem]">
                {isPending ? (
                    <div className="text-gray-300 text-xs italic border-b border-dashed border-gray-200 inline-block w-full py-1">Pending...</div>
                ) : (
                    <HighlightableText text={content} field={field} annotations={annotations} onSelection={onSelection} />
                )}
            </div>
        </div>
    );
};
