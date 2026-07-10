"use client";

import { useCallback, useRef } from "react";

import { cn } from "@/lib/utils";

interface ResizableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnKey: string;
  width: number;
  onResize: (key: string, width: number) => void;
  /** Disable drag handle (e.g. very narrow # column still resizable by default). */
  resizable?: boolean;
}

/**
 * Table header cell with a right-edge drag handle to resize the column.
 */
export function ResizableTh({
  columnKey,
  width,
  onResize,
  resizable = true,
  className,
  style,
  children,
  ...rest
}: ResizableThProps) {
  const startX = useRef(0);
  const startW = useRef(0);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (!resizable) return;
      e.preventDefault();
      e.stopPropagation();
      startX.current = e.clientX;
      startW.current = width;
      const target = e.currentTarget;
      target.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX.current;
        onResize(columnKey, startW.current + delta);
      };
      const onUp = (ev: PointerEvent) => {
        target.releasePointerCapture(ev.pointerId);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        document.body.classList.remove("ge-col-resizing");
      };
      document.body.classList.add("ge-col-resizing");
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [columnKey, onResize, resizable, width]
  );

  return (
    <th
      {...rest}
      className={cn("relative select-none", className)}
      style={{ ...style, width, minWidth: width, maxWidth: width }}
    >
      <div className="pr-2">{children}</div>
      {resizable ? (
        <span
          role="separator"
          aria-orientation="vertical"
          aria-label={`Resize ${columnKey} column`}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              onResize(columnKey, width - 12);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              onResize(columnKey, width + 12);
            }
          }}
          className="ge-col-resize-handle absolute top-0 right-0 z-[3] h-full w-2 cursor-col-resize touch-none"
        >
          <span className="ge-col-resize-grip" aria-hidden />
        </span>
      ) : null}
    </th>
  );
}

/** Apply the same fixed width to a body cell. */
export function colStyle(width: number): React.CSSProperties {
  return { width, minWidth: width, maxWidth: width };
}
