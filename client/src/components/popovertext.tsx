import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

export default function PopoverText(
  props: React.ComponentProps<"div"> & { text: string },
) {
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
      if (spanRect.width <= divRect.width) {
        return;
      }
      setPos({ top: spanRect.top });
      setOpen(true);
    }
  };

  return (
    <>
      <div
        className={cn("truncate", props.className)}
        ref={divRef}
        onClick={handleOpen}
      >
        <span ref={spanRef}>{props.text}</span>
      </div>

      {open && (
        <div>
          <div
            className="fixed inset-0 z-50"
            onClick={() => setOpen(false)}
          ></div>
          <div
            style={{ ...pos }}
            className="bg-card border-border fixed left-1/2 z-60 w-[calc(100%-2rem)] max-w-2xl -translate-1/2 rounded-sm border p-4 shadow-xl"
          >
            {props.text}
          </div>
        </div>
      )}
    </>
  );
}
