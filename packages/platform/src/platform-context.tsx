import { createContext, useContext, type ReactNode } from "react";
import { type PlatformAdapter, platform as defaultPlatform } from "./adapter.js";

const PlatformContext = createContext<PlatformAdapter>(defaultPlatform);

/// Overrides the platform adapter for a subtree — primarily useful in tests.
/// In production, the default context value is the module-level singleton and
/// no explicit provider is needed.
export function PlatformProvider({
  children,
  adapter,
}: {
  children: ReactNode;
  adapter: PlatformAdapter;
}) {
  return (
    <PlatformContext.Provider value={adapter}>
      {children}
    </PlatformContext.Provider>
  );
}

/// Returns the active platform adapter. Use in React components.
/// Non-React modules should import the `platform` singleton directly.
export function usePlatform(): PlatformAdapter {
  return useContext(PlatformContext);
}
