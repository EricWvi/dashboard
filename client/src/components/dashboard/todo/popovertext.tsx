import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

export default function PopoverText({
  className,
  text,
  detail,
  ...props
}: React.ComponentProps<"div"> & { text: string; detail?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number } | null>(
    null,
  );
  const spanRef = useRef<HTMLSpanElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    if (divRef.current && spanRef.current) {
      const spanRect = spanRef.current.getBoundingClientRect();
      const divRect = divRef.current.getBoundingClientRect();
      if (!detail && spanRect.width <= divRect.width) {
        return;
      }
      setPos({ top: spanRect.top });
      setOpen(true);
    }
  };

  return (
    <>
      <div
        {...props}
        className={cn("truncate", className)}
        ref={divRef}
        onClick={(e) => {
          e.stopPropagation();
          handleOpen();
        }}
      >
        <span ref={spanRef}>{text}</span>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-200"
          onMouseDown={(e) => {
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
        >
          <div
            className="fixed inset-0"
            onClick={() => {
              setOpen(false);
            }}
          />

          <div
            style={{ ...pos }}
            className="bg-card border-border fixed left-1/2 z-201 w-[calc(100%-2rem)] max-w-2xl -translate-1/2 rounded-sm border p-4 shadow-xl"
          >
            {detail ?? text}
          </div>
        </div>
      )}
    </>
  );
}
