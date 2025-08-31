export default function WatchCheckpoints({
  checkpoints,
}: {
  checkpoints: [string, number][];
}) {
  return (
    <div className="bg-accent flex aspect-[5/4] rounded-lg pl-2 sm:aspect-[16/9]">
      <div className="overflow-scroll pt-8">
        <div className="flex flex-col">
          {[...checkpoints].reverse().map((checkpoint, idx) => (
            <div key={idx} className="flex gap-13">
              <span className="text-muted-foreground w-22 pt-3 text-right text-sm sm:w-24">
                {checkpoint[0]}
              </span>
              <span className="relative pt-2 pb-6">
                <div className="bg-border absolute top-0 bottom-0 left-[-28px] w-0.5" />
                <div className="bg-muted-foreground absolute top-4 left-[-32px] size-[10px] rounded-full" />

                <span>mark progress {checkpoint[1]}</span>
              </span>
            </div>
          ))}
          <div className="flex gap-13">
            <span className="w-22 pt-3 sm:w-24"></span>
            <span className="relative pt-2 pb-2">
              <div className="bg-border absolute top-0 bottom-0 left-[-28px] w-0.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
