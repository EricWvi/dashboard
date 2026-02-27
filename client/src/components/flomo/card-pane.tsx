import { CardHeader } from "./card-header";
import { CardContent } from "./card-content";
import { TiptapProvider } from "./editor-provider";

export function CardPane() {
  return (
    <TiptapProvider>
      <CardHeader />
      <div className="flex-1 overflow-y-auto">
        <CardContent />
      </div>
    </TiptapProvider>
  );
}
