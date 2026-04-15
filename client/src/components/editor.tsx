import { useControlledOverlay } from "@/hooks/use-controlled-overlay";
import { createContext, useContext, useState, type ReactNode } from "react";

type TTOverlayContextType = {
  open: boolean;
  id: string | number;
  setId: (id: string | number) => void;
  setOpen: (open: boolean) => void;
};

const TTOverlayContext = createContext<TTOverlayContextType | undefined>(
  undefined,
);

export const TTOverlayProvider = ({ children }: { children: ReactNode }) => {
  const { open, onOpenChange } = useControlledOverlay("simple-editor-wrapper");
  const [id, setId] = useState<string | number>(0);

  return (
    <TTOverlayContext.Provider value={{ open, id, setId, setOpen: onOpenChange }}>
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

export const SimpleEditorWrapper = () => null;
