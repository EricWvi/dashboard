import { useAppState } from "@/hooks/flomo/use-app-state";
import { CardHeader } from "./card-header";

export function CardContent() {
  const { currentFolderId } = useAppState();
  if (currentFolderId === undefined) {
    return null;
  }

  return (
    <>
      <CardHeader currentFolderId={currentFolderId} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="grid auto-rows-min gap-4 md:grid-cols-3">
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
          <div className="bg-muted/50 aspect-video rounded-xl" />
        </div>
        <div className="bg-muted/50 min-h-[100vh] flex-1 rounded-xl md:min-h-min" />
      </div>
    </>
  );
}
