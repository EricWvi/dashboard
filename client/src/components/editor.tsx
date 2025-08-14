import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import { useDraft } from "@/hooks/use-draft";
import { createContext, useContext, useState, type ReactNode } from "react";

type TTEditorContext = {
  open: boolean;
  setOpen: (open: boolean) => void;
  id: number;
  setId: (n: number) => void;
};

const TTContext = createContext<TTEditorContext | undefined>(undefined);

export const TTProvider = ({ children }: { children: ReactNode }) => {
  const [id, setId] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);

  return (
    <TTContext.Provider value={{ id, setId, open, setOpen }}>
      {children}
    </TTContext.Provider>
  );
};

export const useTTContext = () => {
  const context = useContext(TTContext);
  if (!context) throw new Error("useTTContext must be used within TTProvider");
  return context;
};

export const SimpleEditorWrapper = () => {
  const { open, id } = useTTContext();
  const { data: draft } = useDraft(id);
  return (
    open &&
    draft && (
      <div className="bg-background fixed inset-0 z-50">
        {/* removing `overflow-auto` from the fixed overlay and instead 
          constraining the editor’s height and making it scrollable 
          solves the mobile overlay + sticky toolbar problem */}
        <div className="dashboard-editor h-full w-full overflow-auto">
          <SimpleEditor draft={draft.content} />
        </div>
      </div>
    )
  );
};
