import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, ZoomIn, ZoomOut } from "lucide-react";

/**
 * LinkedIn/Instagram-style image adjuster: drag to reposition, slider to zoom.
 * Shows the photo at the exact aspect ratio it will be displayed at, so hosts
 * can be sure nothing important gets cut off. "Save" bakes the visible crop
 * into a new file that gets uploaded.
 */
interface ImageAdjusterProps {
  src: string; // data URL of the raw selected image
  aspect: number; // width / height of the final crop
  fileName?: string;
  outputWidth?: number;
  onApply: (file: File, dataUrl: string) => void;
  onCancel: () => void;
}

export function ImageAdjuster({
  src,
  aspect,
  fileName = "image.jpg",
  outputWidth = 1280,
  onApply,
  onCancel,
}: ImageAdjusterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const dragState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(
    null,
  );

  // Load natural image dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = src;
  }, [src]);

  // How much the image is scaled on screen: cover-fit base scale * user zoom
  const getScales = useCallback(() => {
    const container = containerRef.current;
    if (!container || !imgSize) return null;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const baseScale = Math.max(cw / imgSize.w, ch / imgSize.h);
    const scale = baseScale * zoom;
    return { cw, ch, scale };
  }, [imgSize, zoom]);

  // Keep the image covering the frame - no blank edges
  const clampOffset = useCallback(
    (x: number, y: number, zoomOverride?: number) => {
      const container = containerRef.current;
      if (!container || !imgSize) return { x, y };
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const baseScale = Math.max(cw / imgSize.w, ch / imgSize.h);
      const scale = baseScale * (zoomOverride ?? zoom);
      const maxX = Math.max(0, (imgSize.w * scale - cw) / 2);
      const maxY = Math.max(0, (imgSize.h * scale - ch) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [imgSize, zoom],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, baseX: offset.x, baseY: offset.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(clampOffset(dragState.current.baseX + dx, dragState.current.baseY + dy));
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleZoomChange = (value: number) => {
    setZoom(value);
    setOffset((prev) => clampOffset(prev.x, prev.y, value));
  };

  const handleSave = () => {
    const scales = getScales();
    const img = imgRef.current;
    if (!scales || !img || !imgSize) return;
    const { cw, ch, scale } = scales;

    // Visible region of the source image, in image pixels
    const sw = cw / scale;
    const sh = ch / scale;
    let sx = (imgSize.w - sw) / 2 - offset.x / scale;
    let sy = (imgSize.h - sh) / 2 - offset.y / scale;
    sx = Math.min(Math.max(0, sx), imgSize.w - sw);
    sy = Math.min(Math.max(0, sy), imgSize.h - sh);

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = Math.round(outputWidth / aspect);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const baseName = fileName.replace(/\.[^.]+$/, "");
        const file = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
        onApply(file, canvas.toDataURL("image/jpeg", 0.9));
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Adjust your photo</p>
        <p className="text-xs text-muted-foreground">Drag to reposition</p>
      </div>

      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg bg-black touch-none cursor-grab active:cursor-grabbing select-none"
        style={{ aspectRatio: `${aspect}` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {imgSize && (
          <img
            src={src}
            alt="Adjust preview"
            draggable={false}
            className="absolute left-1/2 top-1/2 max-w-none pointer-events-none"
            style={{
              width: imgSize.w,
              height: imgSize.h,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${
                (() => {
                  const s = getScales();
                  return s ? s.scale : 1;
                })()
              })`,
            }}
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => handleZoomChange(Number(e.target.value))}
          className="flex-1 accent-primary"
          aria-label="Zoom"
        />
        <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          <X className="h-4 w-4 mr-2" />
          Remove
        </Button>
        <Button type="button" className="flex-1" onClick={handleSave}>
          <Check className="h-4 w-4 mr-2" />
          Save photo
        </Button>
      </div>
    </div>
  );
}
