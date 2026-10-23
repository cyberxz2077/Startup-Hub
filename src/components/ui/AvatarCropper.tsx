"use client";
import { useRef, useState } from "react";
import { Modal } from "./Modal";
import { X, ZoomIn, ZoomOut } from "lucide-react";
export function AvatarCropper({
  imageSrc,
  onCancel,
  onSave,
}: {
  imageSrc: string;
  onCancel: () => void;
  onSave: (data: string) => void;
}) {
  const image = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [base, setBase] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const bound = (x: number, y: number, factor = zoom) => {
    const img = image.current;
    if (!img) return { x: 0, y: 0 };
    const maxX = Math.max(0, (img.naturalWidth * base * factor - 250) / 2);
    const maxY = Math.max(0, (img.naturalHeight * base * factor - 250) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  };
  const save = () => {
    if (!image.current || !base) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 250;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, 250, 250);
    ctx.translate(125 + pos.x, 125 + pos.y);
    ctx.scale(base * zoom, base * zoom);
    ctx.drawImage(
      image.current,
      -image.current.naturalWidth / 2,
      -image.current.naturalHeight / 2,
    );
    onSave(canvas.toDataURL("image/jpeg", 0.85));
  };
  return (
    <Modal title="调整头像" onClose={onCancel}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">调整头像</h2>
        <button
          onClick={onCancel}
          className="icon-btn"
          aria-label="关闭头像编辑"
        >
          <X size={18} />
        </button>
      </div>
      <div
        className="mx-auto w-[250px] h-[250px] rounded-full overflow-hidden relative bg-paper border border-border cursor-move touch-none"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const dx = e.clientX - drag.current.x,
            dy = e.clientY - drag.current.y;
          drag.current = { x: e.clientX, y: e.clientY };
          setPos((p) => bound(p.x + dx, p.y + dy));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        {/* Canvas uses this local data URL at its natural dimensions; optimization would change crop geometry. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={image}
          src={imageSrc}
          alt="待裁剪的头像"
          draggable={false}
          className="absolute max-w-none left-1/2 top-1/2 pointer-events-none"
          onLoad={(e) =>
            setBase(
              Math.max(
                250 / e.currentTarget.naturalWidth,
                250 / e.currentTarget.naturalHeight,
              ),
            )
          }
          style={{
            transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${base * zoom})`,
          }}
        />
      </div>
      <label className="flex items-center gap-3 mt-6">
        <ZoomOut size={17} />
        <span className="sr-only">头像缩放</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          className="flex-1 accent-accent-blue"
          onChange={(e) => {
            const next = Number(e.target.value);
            setZoom(next);
            setPos((p) => bound(p.x, p.y, next));
          }}
        />
        <ZoomIn size={17} />
      </label>
      <p className="text-xs text-ink-light text-center my-5">
        拖动调整位置，滑动放大。
      </p>
      <button className="btn-primary w-full" onClick={save} disabled={!base}>
        使用这张头像
      </button>
    </Modal>
  );
}
