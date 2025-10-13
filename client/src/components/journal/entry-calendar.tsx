import { ActivityCalendar } from "react-activity-calendar";
import { useGetCurrentYear } from "@/hooks/use-entries";
import { UserLangEnum, type UserLang } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useEffect, useRef } from "react";

const labels = {
  [UserLangEnum.ENUS]: {
    months: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ],
    weekdays: [
      "Sun", // Sunday first!
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ],
    tooltip: (count: number, date: string) => `${count} entries on ${date}`,
  },
  [UserLangEnum.ZHCN]: {
    months: [
      "一月",
      "二月",
      "三月",
      "四月",
      "五月",
      "六月",
      "七月",
      "八月",
      "九月",
      "十月",
      "十一月",
      "十二月",
    ],
    weekdays: [
      "日", // Sunday first!
      "一",
      "二",
      "三",
      "四",
      "五",
      "六",
    ],
    tooltip: (count: number, date: string) => `${date} 有 ${count} 篇手记`,
  },
};

// Helper function to get i18n tooltip text
const getTooltipText = (language: UserLang, count: number, date: string) => {
  return labels[language].tooltip(count, date);
};

export default function EntryCalendar() {
  const { language } = useUserContext();
  const { data: currentYearData } = useGetCurrentYear();
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = calendarRef.current;
    if (el && el.firstElementChild) {
      el.firstElementChild.scrollLeft =
        el.firstElementChild.scrollWidth - el.clientWidth; // scroll to the right end
    }
  }, []);

  // Default data with current year start and today
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const yearStartStr = `${currentYear}-01-01`;

  const defaultData = [
    {
      date: yearStartStr, // start of current year
      count: 0,
      level: 0,
    },
    {
      date: todayStr, // today
      count: 0,
      level: 0,
    },
  ];

  return (
    <div className="text-foreground">
      <ActivityCalendar
        ref={calendarRef}
        hideColorLegend
        hideTotalCount
        labels={labels[language]}
        data={currentYearData?.activity || defaultData}
        theme={{
          light: ["hsl(0, 0%, 92%)", "rebeccapurple"],
          dark: ["hsl(0, 0%, 12%)", "rebeccapurple"],
        }}
        eventHandlers={{
          onClick: () => (activity) => {
            alert(JSON.stringify(activity));
          },
        }}
        renderBlock={(block, activity) => (
          <Tooltip delayDuration={500}>
            <TooltipTrigger asChild>{block}</TooltipTrigger>
            <TooltipContent>
              <p>{getTooltipText(language, activity.count, activity.date)}</p>
            </TooltipContent>
          </Tooltip>
        )}
      />
    </div>
  );
}
