import { useOverlayStore } from "./use-overlay-store";
import { useCallback } from "react";

export function useControlledOverlay(id: string, closeCallback?: () => void) {
  const { isOpened, open, close } = useOverlayStore();

  const isOpen = isOpened(id);

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (nextOpen) {
        open(id, closeCallback);
      } else {
        close(id);
        // if the user actively clicks the close button, we need to manually clean up the pushState
        if (window.history.state?.type === "overlay") {
          window.history.back();
        }
      }
    },
    [id, open, close],
  );

  return { open: isOpen, onOpenChange };
}
