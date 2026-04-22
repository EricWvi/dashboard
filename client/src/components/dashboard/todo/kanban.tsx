import KanbanRender from "@/components/dashboard/todo/kanban-render";
import { useKanban } from "@/hooks/dashboard/use-kanbanv2";
import { ZERO_UUID } from "@/lib/utils";
import { createContext, useContext, useState, type ReactNode } from "react";

type KanbanContext = {
  open: boolean;
  setOpen: (open: boolean) => void;
  id: string;
  setId: (n: string) => void;
};

const KanbanContext = createContext<KanbanContext | undefined>(undefined);

export const KanbanProvider = ({ children }: { children: ReactNode }) => {
  const [id, setId] = useState<string>(ZERO_UUID);
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
  const { open, id } = useKanbanContext();
  const { data: kanban } = useKanban(id);
  return (
    open &&
    kanban && (
      <div className="bg-background fixed inset-0 z-50">
        <div className="h-full w-full">
          <KanbanRender key={kanban.id} data={kanban} />
        </div>
      </div>
    )
  );
};
