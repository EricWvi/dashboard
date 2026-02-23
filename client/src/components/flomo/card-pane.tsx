import { useAppState } from "@/hooks/flomo/use-app-state";
import { CardHeader } from "./card-header";
import { CardContent } from "./card-content";

export function CardPane() {
  const { currentFolderId } = useAppState();
  if (currentFolderId === undefined) {
    return null;
  }

  return (
    <>
      <CardHeader currentFolderId={currentFolderId} />
      <div className="flex-1 overflow-y-auto">
        <CardContent />
      </div>
    </>
  );
}
