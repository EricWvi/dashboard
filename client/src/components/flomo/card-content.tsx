import { useAppState } from "@/hooks/flomo/use-app-state";

export function CardContent() {
  return (
    <div className="transform-gpu">
      <div className="min-h-[100vh] shrink-0 rounded-xl bg-red-200" />
      <div className="min-h-[100vh] shrink-0 rounded-xl bg-blue-200" />
      <div className="min-h-[100vh] shrink-0 rounded-xl bg-green-200" />
    </div>
  );
}
