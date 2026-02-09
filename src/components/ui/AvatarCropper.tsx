import { useState, useRef } from 'react';
import { X, ZoomIn, ZoomOut, Move } from 'lucide-react';

export const AvatarCropper = ({ imageSrc, onCancel, onSave }: { imageSrc: string, onCancel: () => void, onSave: (data: string) => void }) => {
    const [scale, setScale] = useState(1);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const lastPos = useRef({ x: 0, y: 0 });
    const imgRef = useRef<HTMLImageElement>(null);
    const CROP_SIZE = 250;

    const handleMouseDown = (e: React.MouseEvent) => {
        setDragging(true);
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragging) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        setPos(p => ({ x: p.x + dx, y: p.y + dy }));
        lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => setDragging(false);

    const handleSave = () => {
        const canvas = document.createElement('canvas');
        canvas.width = CROP_SIZE;
        canvas.height = CROP_SIZE;
        const ctx = canvas.getContext('2d');
        if (ctx && imgRef.current) {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, CROP_SIZE, CROP_SIZE);

            ctx.save();
            // Center align
            ctx.translate(CROP_SIZE / 2 + pos.x, CROP_SIZE / 2 + pos.y);
            ctx.scale(scale, scale);
            ctx.drawImage(imgRef.current, -imgRef.current.naturalWidth / 2, -imgRef.current.naturalHeight / 2);
            ctx.restore();
            onSave(canvas.toDataURL('image/jpeg', 0.9));
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md animate-in fade-in zoom-in-95">
                <div className="p-4 border-b border-border flex justify-between items-center">
                    <h3 className="font-serif font-bold text-ink">Edit Profile Picture</h3>
                    <button onClick={onCancel}><X className="w-5 h-5 text-ink-light hover:text-ink" /></button>
                </div>

                <div className="p-8 flex flex-col items-center gap-6 bg-paper-texture">
                    <div
                        className="w-[250px] h-[250px] border-2 border-dashed border-ink/30 rounded-full overflow-hidden relative cursor-move shadow-inner bg-gray-100"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {/* Visual Guide Overlay */}
                        <div className="absolute inset-0 pointer-events-none z-10 rounded-full border border-white/50"></div>

                        <img
                            ref={imgRef}
                            src={imageSrc}
                            alt="Crop Target"
                            className="max-w-none absolute top-1/2 left-1/2 select-none"
                            style={{
                                transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${scale})`,
                                pointerEvents: 'none'
                            }}
                            draggable={false}
                        />
                    </div>

                    <div className="flex items-center gap-4 w-full max-w-[250px]">
                        <ZoomOut className="w-4 h-4 text-ink-light" />
                        <input
                            type="range"
                            min="0.5"
                            max="3"
                            step="0.05"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="flex-1 accent-ink cursor-pointer"
                        />
                        <ZoomIn className="w-4 h-4 text-ink-light" />
                    </div>

                    <p className="text-xs text-ink-light flex items-center gap-1"><Move className="w-3 h-3" /> Drag to position</p>
                </div>

                <div className="p-4 border-t border-border bg-gray-50 flex gap-3">
                    <button onClick={onCancel} className="flex-1 py-2 text-sm font-medium text-ink-light hover:text-ink hover:bg-gray-200 rounded transition-colors">Cancel</button>
                    <button onClick={handleSave} className="flex-1 py-2 text-sm font-medium bg-ink text-white hover:bg-ink-light rounded shadow-lg transition-colors">Save Photo</button>
                </div>
            </div>
        </div>
    );
};
