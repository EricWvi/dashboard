import { useEffect, useRef } from "react";

export function usePageVisibility(
  onVisible: () => void,
  onHidden?: () => void,
) {
  const onVisibleRef = useRef(onVisible);
  const onHiddenRef = useRef(onHidden);

  // Keep ref updated with the latest callback without triggering re-attachment
  useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    onHiddenRef.current = onHidden;
  }, [onHidden]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        onVisibleRef.current();
      } else if (document.visibilityState === "hidden" && onHiddenRef.current) {
        onHiddenRef.current();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
    };
  }, []); // attach only once
}
