import { useCallback, useRef } from "react";

// Simple throttle implementation
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): T {
  const lastCall = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (now - lastCall.current >= delay) {
        lastCall.current = now;
        callback(...args);
      } else {
        timeoutRef.current = setTimeout(
          () => {
            lastCall.current = Date.now();
            callback(...args);
          },
          delay - (now - lastCall.current),
        );
      }
    }) as T,
    [callback, delay],
  );
}
