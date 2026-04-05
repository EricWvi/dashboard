import { useControlledOverlay } from "@/hooks/use-controlled-overlay";
import { createContext, useContext, type ReactNode } from "react";

type TTOverlayContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const TTOverlayContext = createContext<TTOverlayContextType | undefined>(
  undefined,
);

export const TTOverlayProvider = ({ children }: { children: ReactNode }) => {
  const { open, onOpenChange } = useControlledOverlay("simple-editor-wrapper");

  return (
    <TTOverlayContext.Provider value={{ open, setOpen: onOpenChange }}>
      {children}
    </TTOverlayContext.Provider>
  );
};

export const useTTContext = () => {
  const context = useContext(TTOverlayContext);
  if (!context)
    throw new Error("useTTContext must be used within TTOverlayProvider");
  return context;
};
