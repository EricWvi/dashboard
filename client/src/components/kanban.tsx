import KanbanRender from "@/components/ui/kanban-render";
import { createContext, useContext, useState, type ReactNode } from "react";

type KanbanContext = {
  open: boolean;
  setOpen: (open: boolean) => void;
  id: number;
  setId: (n: number) => void;
};

const KanbanContext = createContext<KanbanContext | undefined>(undefined);

export const KanbanProvider = ({ children }: { children: ReactNode }) => {
  const [id, setId] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);

  return (
    <KanbanContext.Provider value={{ id, setId, open, setOpen }}>
      {children}
    </KanbanContext.Provider>
  );
};

export const useKanbanContext = () => {
  const context = useContext(KanbanContext);
  if (!context)
    throw new Error("useKanbanContext must be used within KanbanProvider");
  return context;
};

export const KanbanWrapper = () => {
  const { open } = useKanbanContext();
  return (
    open && (
      <div className="bg-background fixed inset-0 z-50">
        <div className="h-full w-full">
          <KanbanRender />
        </div>
      </div>
    )
  );
};
