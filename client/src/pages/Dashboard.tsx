import QuickNoteList from "@/components/quick-note";
import { Profile } from "@/components/profile";
import { TodayTodoList } from "@/components/todo/todo-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { refinedGreeting } from "@/lib/utils";
import { useUserContext } from "@/user-provider";

export default function Dashboard() {
  const isMobile = useIsMobile();
  const { user } = useUserContext();
  const [greetingHour, setGreetingHour] = useState(new Date().getHours());
  const [greeting, setGreeting] = useState(refinedGreeting());
  usePageVisibility(() => {
    if (new Date().getHours() !== greetingHour) {
      setGreetingHour(new Date().getHours());
      setGreeting(refinedGreeting());
    }
  });

  return (
    <div
      className={`flex size-full flex-col gap-2 ${isMobile ? "pt-6" : "p-8"}`}
    >
      {isMobile && (
        <div className="px-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <Avatar className="border border-gray-300">
              <AvatarImage src={user.avatar} />
              <AvatarFallback />
            </Avatar>
          </div>
          <p className="text-muted-foreground">{greeting}</p>
        </div>
      )}

      <div
        className={`${isMobile ? "min-h-0 flex-1 overflow-scroll pt-2 pb-10" : "pt-16"}`}
      >
        <div className="mx-6 grid gap-6 md:grid-cols-2 lg:gap-10 xl:mx-24 xl:grid-cols-3 xl:gap-12 2xl:mx-48">
          {!isMobile && (
            <div className="col-span-2 xl:col-span-1">
              <Profile />
            </div>
          )}

          <TodayTodoList />
          <QuickNoteList />
        </div>
      </div>
    </div>
  );
}
