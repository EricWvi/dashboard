import { useEffect } from "react";
import { useOverlayStore } from "@/hooks/use-overlay-store";
import { isTouchDevice } from "@/lib/utils";

export function OverlayController() {
  const { activeOverlays, close } = useOverlayStore();

  useEffect(() => {
    if (!isTouchDevice || activeOverlays.length === 0) return;

    window.history.pushState(
      { type: "overlay", depth: activeOverlays.length },
      "",
    );

    const handlePopState = () => {
      if (activeOverlays.length > 0) {
        const lastId = activeOverlays[activeOverlays.length - 1].id;
        close(lastId);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeOverlays, close]);

  return null;
}
