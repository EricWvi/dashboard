import type { Editor } from "@tiptap/react";
import { createContext, useContext, useState, type ReactNode } from "react";

type CloseActionContextType = {
  onClose: (e: Editor) => void;
  setOnClose: (onClose: (e: Editor) => void) => void;
};
const CloseActionContext = createContext<CloseActionContextType | undefined>(
  undefined,
);

export const CloseActionProvider = ({ children }: { children: ReactNode }) => {
  const [onClose, setOnClose] = useState(() => (_: Editor) => {});

  return (
    <CloseActionContext.Provider value={{ onClose, setOnClose }}>
      {children}
    </CloseActionContext.Provider>
  );
};

export const useCloseActionContext = () => {
  const context = useContext(CloseActionContext);
  if (!context)
    throw new Error(
      "useCloseActionContext must be used within CloseActionProvider",
    );
  return context;
};
