import type { Editor } from "@tiptap/react";
import { createContext, useContext, useState, type ReactNode } from "react";

type CloseActionContextType = {
  onClose: (e: Editor, changed: boolean) => void;
  setOnClose: (onClose: (e: Editor, changed: boolean) => void) => void;
};
const CloseActionContext = createContext<CloseActionContextType | undefined>(
  undefined,
);

export const CloseActionProvider = ({ children }: { children: ReactNode }) => {
  const [onClose, setOnClose] = useState(
    () => (_editor: Editor, _changed: boolean) => {},
  );

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
