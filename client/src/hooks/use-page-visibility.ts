import { useEffect, useRef } from "react";

export function usePageVisibility(onVisible: () => void) {
  const onVisibleRef = useRef(onVisible);

  // Keep ref updated with the latest callback without triggering re-attachment
  useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible") {
        onVisibleRef.current();
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
    };
  }, []); // attach only once
}
