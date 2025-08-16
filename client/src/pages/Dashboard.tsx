import QuickNoteList from "@/components/quick-note";
import { TodayTodoList } from "@/components/todo/todo-list";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Dashboard() {
  const isMobile = useIsMobile();

  return (
    <div
      className={`flex size-full flex-col gap-4 ${isMobile ? "pt-6" : "p-8"}`}
    >
      <div>
        <h1 className={`text-3xl font-bold ${isMobile ? "px-6" : "mb-6"}`}>
          Dashboard
        </h1>
      </div>

      <div
        className={`${isMobile ? "min-h-0 flex-1 overflow-scroll pb-10" : ""}`}
      >
        <div
          className={`grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:mx-48 xl:gap-12 ${isMobile ? "mx-6" : ""}`}
        >
          {!isMobile && (
            <Sheet>
              <SheetTrigger>Journal</SheetTrigger>
              <SheetContent
                side="left"
                style={{
                  maxWidth: "1000px",
                  width: window.innerHeight * (390 / 844) + "px",
                }}
              >
                <div
                  style={{ width: "100%", height: "100%", overflow: "hidden" }}
                >
                  <iframe
                    src={"https://journal.onlyquant.top/"}
                    title={"Journal"}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                    }}
                    allowFullScreen
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
          <TodayTodoList />
          <QuickNoteList />
        </div>
      </div>
    </div>
  );
}
