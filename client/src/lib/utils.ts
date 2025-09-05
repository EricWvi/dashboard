import { UserLangEnum, type UserLang } from "@/hooks/use-user";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMediaUrl(url: string): string {
  if (url.startsWith("/api/m/")) {
    return url;
  }
  return `/api/m/${url}`;
}

export function dateString(
  date: Date | string | null | undefined,
  sep: string = "/",
): string {
  if (!date) return "";
  const d = new Date(date);
  const formatted =
    d.getFullYear() +
    sep +
    String(d.getMonth() + 1).padStart(2, "0") +
    sep +
    String(d.getDate()).padStart(2, "0");
  return formatted;
}

export function fullDateString(
  date: Date | string | null | undefined,
  lang: UserLang = UserLangEnum.ENUS,
): string {
  if (!date) return "";
  const d = new Date(date);
  if (lang === UserLangEnum.ENUS) {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } else if (lang === UserLangEnum.ZHCN) {
    return d.toLocaleDateString("zh-CN", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return d.toDateString();
}

export function getDecadePair(date = new Date()) {
  const year = date.getFullYear();
  const start = year - (year % 10) + 1;
  const end = start + 9;
  return { start, end };
}

export function getWeekYearPair(date = new Date()) {
  // Copy input date so we don't mutate it
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Find the first Monday of the year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const startDay = yearStart.getDay() || 7; // Sunday = 0 → 7
  const firstMonday = new Date(yearStart);
  firstMonday.setDate(yearStart.getDate() + ((8 - startDay) % 7));

  // If before the first Monday → the last week in the past year
  if (d < firstMonday)
    return getWeekYearPair(new Date(d.getFullYear() - 1, 11, 31));

  // Difference in days between the date and the first Monday
  const diffDays = Math.floor((d.getTime() - firstMonday.getTime()) / 86400000);

  // Compute week number (1-based)
  return { week: Math.floor(diffDays / 7) + 1, year: d.getFullYear() };
}

export function getWeekRange(year: number, weekNumber: number) {
  // Find the first Monday of the year
  const yearStart = new Date(year, 0, 1);
  const startDay = yearStart.getDay() || 7; // Sunday = 0 → 7
  const firstMonday = new Date(yearStart);
  firstMonday.setDate(yearStart.getDate() + ((8 - startDay) % 7));

  if (weekNumber === 0) {
    // Week 0 = days before first Monday
    return {
      start: new Date(year, 0, 1),
      end: new Date(firstMonday.getTime() - 86400000), // day before first Monday
    };
  }

  // Start = first Monday + (weekNumber - 1) * 7 days
  const start = new Date(firstMonday);
  start.setDate(firstMonday.getDate() + (weekNumber - 1) * 7);

  // End = start + 6 days (Sunday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return { start, end };
}

export function stripeColor(difficulty: number): string {
  return difficulty === 4
    ? "bg-red-400 dark:bg-red-600"
    : difficulty === 1
      ? "bg-green-400 dark:bg-green-600"
      : difficulty === 2
        ? "bg-yellow-400 dark:bg-yellow-600"
        : difficulty === 3
          ? "bg-orange-400 dark:bg-orange-600"
          : "bg-gray-200 dark:bg-gray-700";
}

export function underlineColor(difficulty: number): string {
  return difficulty === 4
    ? "underline decoration-2 decoration-red-400 dark:decoration-red-600"
    : difficulty === 1
      ? "underline decoration-2 decoration-green-400 dark:decoration-green-600"
      : difficulty === 2
        ? "underline decoration-2 decoration-yellow-400 dark:decoration-yellow-600"
        : difficulty === 3
          ? "underline decoration-2 decoration-orange-400 dark:decoration-orange-600"
          : "underline decoration-2 decoration-gray-200 dark:decoration-gray-700";
}

export function dotColor(level: number, difficulty: number): string {
  return level <= difficulty
    ? difficulty === 1
      ? "bg-green-400 dark:bg-green-600"
      : difficulty === 2
        ? "bg-yellow-400 dark:bg-yellow-600"
        : difficulty === 3
          ? "bg-orange-400 dark:bg-orange-600"
          : "bg-red-400 dark:bg-red-600"
    : "bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600";
}

export const formatDate = (
  date: Date | string | null | undefined,
  done: boolean,
): { label: string; color: string } => {
  const today_default = {
    label: "Today",
    color:
      "opacity-0 group-hover:opacity-50 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  };
  if (!date) {
    return today_default;
  }
  const inDate = new Date(date);
  if (isSetToday(inDate)) {
    return {
      label: "Today",
      color: done
        ? "opacity-100 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
        : "opacity-100 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
    };
  } else if (isSetDate(inDate)) {
    const today = new Date();
    const diffDays = Math.ceil(
      (inDate.getTime() - today.getTime()) / (1000 * 3600 * 24),
    );
    if (diffDays === 1) {
      return {
        label: "Tomorrow",
        color:
          "opacity-100 border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
      };
    } else if (diffDays <= 6) {
      return {
        label: `In ${diffDays} days`,
        color:
          "opacity-100 border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
      };
    } else {
      const t = inDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return { label: t, color: "opacity-100" };
    }
  } else if (isDisabledPlan(inDate)) {
    return { label: "No Plan", color: "opacity-100" };
  }
  return today_default;
};

export const isSetDate = (date: Date | string | null | undefined) => {
  if (!date) return false;
  const today = new Date();
  const inputDate = new Date(date);
  return (
    !isDisabledPlan(inputDate) &&
    (inputDate.getFullYear() > today.getFullYear() ||
      (inputDate.getFullYear() === today.getFullYear() &&
        inputDate.getMonth() > today.getMonth()) ||
      (inputDate.getFullYear() === today.getFullYear() &&
        inputDate.getMonth() === today.getMonth() &&
        inputDate.getDate() >= today.getDate()))
  );
};

export const isSetToday = (date: Date | string | null | undefined) => {
  if (!date) return false;
  const today = new Date();
  const inputDate = new Date(date);
  return (
    inputDate.getFullYear() === today.getFullYear() &&
    inputDate.getMonth() === today.getMonth() &&
    inputDate.getDate() === today.getDate()
  );
};

export const isDisabledPlan = (date: Date | string | null | undefined) => {
  if (!date) return false;
  const inputDate = new Date(date);
  return inputDate.getTime() === noPlanStart().getTime();
};

export const todayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const tomorrowStart = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
};

export const noPlanStart = () => {
  // Tue Oct 02 2096 15:06:40 GMT+0800
  const noPlan = new Date(4000000000000);
  return noPlan;
};

export function refinedGreeting() {
  const hour = new Date().getHours();
  const now = Date.now();
  const msPerDay = 1000 * 60 * 60 * 24;
  const index = Math.floor(now / msPerDay);

  if (hour >= 5 && hour < 12) {
    const morningGreetings = [
      {
        [UserLangEnum.ENUS]: "A splendid morning to you.",
        [UserLangEnum.ZHCN]: "愿你迎来灿烂美好的清晨",
      },
      {
        [UserLangEnum.ENUS]: "May your day begin with brightness.",
        [UserLangEnum.ZHCN]: "愿你的一天始于明媚晨光",
      },
      {
        [UserLangEnum.ENUS]: "Wishing you a serene morning.",
        [UserLangEnum.ZHCN]: "祝你有个宁静祥和的早晨",
      },
      {
        [UserLangEnum.ENUS]: "A refreshing morning to greet your endeavors.",
        [UserLangEnum.ZHCN]: "清新晨光相伴，愿你从容启程",
      },
      {
        [UserLangEnum.ENUS]: "May your morning be filled with promise.",
        [UserLangEnum.ZHCN]: "愿这个清晨充满希望与期许",
      },
      {
        [UserLangEnum.ENUS]: "Wishing you clarity and cheer this morning.",
        [UserLangEnum.ZHCN]: "祝你今晨心境澄明，满怀欢欣",
      },
      {
        [UserLangEnum.ENUS]:
          "A fine morning, may it set the tone for your day.",
        [UserLangEnum.ZHCN]: "愿美好清晨为你的一天定下优雅基调",
      },
      {
        [UserLangEnum.ENUS]: "Grace and calm be with you this morning.",
        [UserLangEnum.ZHCN]: "愿优雅与平静伴你度过今晨",
      },
      {
        [UserLangEnum.ENUS]: "May the dawn bring you renewed energy.",
        [UserLangEnum.ZHCN]: "愿破晓晨光给你焕发活力",
      },
      {
        [UserLangEnum.ENUS]: "A radiant morning to accompany your path.",
        [UserLangEnum.ZHCN]: "璀璨晨辉相伴，愿你前路光明",
      },
    ];
    return morningGreetings[index % morningGreetings.length];
  } else if (hour >= 12 && hour < 17) {
    const afternoonGreetings = [
      {
        [UserLangEnum.ENUS]: "A gracious afternoon to you.",
        [UserLangEnum.ZHCN]: "沐浴在温雅午后时光",
      },
      {
        [UserLangEnum.ENUS]: "I trust your day is unfolding well.",
        [UserLangEnum.ZHCN]: "从容漫步于今日的美好轨迹",
      },
      {
        [UserLangEnum.ENUS]: "Wishing you a delightful afternoon.",
        [UserLangEnum.ZHCN]: "祝你享受这令人心旷神怡的午后",
      },
      {
        [UserLangEnum.ENUS]: "May your afternoon be filled with lightness.",
        [UserLangEnum.ZHCN]: "愿清风为时光注入轻盈惬意",
      },
      {
        [UserLangEnum.ENUS]: "A warm afternoon greeting to you.",
        [UserLangEnum.ZHCN]: "诚挚的午后问候，愿温暖与你相伴",
      },
      {
        [UserLangEnum.ENUS]: "I hope your afternoon is as pleasant as you are.",
        [UserLangEnum.ZHCN]: "愿午后温润，如沐春风",
      },
      {
        [UserLangEnum.ENUS]: "May your afternoon be calm and fulfilling.",
        [UserLangEnum.ZHCN]: "祈愿你的午后宁静丰盈，自有圆满生发",
      },
      {
        [UserLangEnum.ENUS]:
          "A bright afternoon, wishing you continued success.",
        [UserLangEnum.ZHCN]: "愿你前行的脚步始终缀满硕果",
      },
      {
        [UserLangEnum.ENUS]: "I trust the day has been kind thus far.",
        [UserLangEnum.ZHCN]: "相信今日始终对你温柔相待",
      },
      {
        [UserLangEnum.ENUS]: "Wishing you harmony this afternoon.",
        [UserLangEnum.ZHCN]: "愿午后时分为你奏响和谐的生命韵律",
      },
    ];
    return afternoonGreetings[index % afternoonGreetings.length];
  } else if (hour >= 17 && hour < 21) {
    const eveningGreetings = [
      {
        [UserLangEnum.ENUS]: "A pleasant evening to you.",
        [UserLangEnum.ZHCN]: "恬谧安详的暮色时分",
      },
      {
        [UserLangEnum.ENUS]: "May your evening be tranquil.",
        [UserLangEnum.ZHCN]: "夜晚如幽潭映月般宁静致远",
      },
      {
        [UserLangEnum.ENUS]: "Wishing you a graceful evening.",
        [UserLangEnum.ZHCN]: "邂逅盈满雅韵的黄昏时光",
      },
      {
        [UserLangEnum.ENUS]: "A serene evening filled with comfort.",
        [UserLangEnum.ZHCN]: "暮色温柔裹挟慰藉，沉静安然",
      },
      {
        [UserLangEnum.ENUS]: "May the twilight bring you peace.",
        [UserLangEnum.ZHCN]: "愿渐染的霞晖为你织就宁和心境",
      },
      {
        [UserLangEnum.ENUS]: "Wishing you calm as the day concludes.",
        [UserLangEnum.ZHCN]: "愿安宁伴你步入星夜",
      },
      {
        [UserLangEnum.ENUS]: "A gentle evening to ease your spirit.",
        [UserLangEnum.ZHCN]: "暮色如水，抚平眉间所有倦意",
      },
      {
        [UserLangEnum.ENUS]: "May your evening glow with contentment.",
        [UserLangEnum.ZHCN]: "满足如萤光在你的夜色中轻盈流转",
      },
      {
        [UserLangEnum.ENUS]: "A peaceful evening to accompany your thoughts.",
        [UserLangEnum.ZHCN]: "静谧夜晚是你思绪的忠实旅伴",
      },
      {
        [UserLangEnum.ENUS]: "Wishing you ease and warmth this evening.",
        [UserLangEnum.ZHCN]: "愿今夜暖意环绕，云卷云舒",
      },
    ];
    return eveningGreetings[index % eveningGreetings.length];
  } else {
    const nightGreetings = [
      {
        [UserLangEnum.ENUS]: "A restful night to you.",
        [UserLangEnum.ZHCN]: "漫漫长夜，酣然安眠",
      },
      {
        [UserLangEnum.ENUS]: "May your night be peaceful.",
        [UserLangEnum.ZHCN]: "今夜宁谧如深海，抚平所有波澜",
      },
      {
        [UserLangEnum.ENUS]: "Wishing you a serene night’s rest.",
        [UserLangEnum.ZHCN]: "在静夜怀抱中获得至臻安宁",
      },
      {
        [UserLangEnum.ENUS]: "May your slumber be deep and kind.",
        [UserLangEnum.ZHCN]: "深沉甜美的梦境，温柔相待",
      },
      {
        [UserLangEnum.ENUS]: "A tranquil night to calm your soul.",
        [UserLangEnum.ZHCN]: "静谧之夜，轻轻包裹疲惫的灵魂",
      },
      {
        [UserLangEnum.ENUS]: "Rest well under the quiet of night.",
        [UserLangEnum.ZHCN]: "万籁俱寂，沉入无扰的休憩之海",
      },
      {
        [UserLangEnum.ENUS]: "Wishing you gentle dreams and ease.",
        [UserLangEnum.ZHCN]: "轻盈美梦携熨帖暖意",
      },
      {
        [UserLangEnum.ENUS]: "May the stars keep you company tonight.",
        [UserLangEnum.ZHCN]: "今夜繁星，低语守候",
      },
      {
        [UserLangEnum.ENUS]: "A peaceful night to restore your strength.",
        [UserLangEnum.ZHCN]: "愿安宁夜晚重整生命的脉络与力量",
      },
      {
        [UserLangEnum.ENUS]: "May sleep embrace you with serenity.",
        [UserLangEnum.ZHCN]: "愿一夜睡梦，澄明静好",
      },
    ];
    return nightGreetings[index % nightGreetings.length];
  }
}
