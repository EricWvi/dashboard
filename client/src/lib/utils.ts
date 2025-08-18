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
      "A splendid morning to you.",
      "May your day begin with brightness.",
      "Wishing you a serene morning.",
      "A refreshing morning to greet your endeavors.",
      "May your morning be filled with promise.",
      "Wishing you clarity and cheer this morning.",
      "A fine morning, may it set the tone for your day.",
      "Grace and calm be with you this morning.",
      "May the dawn bring you renewed energy.",
      "A radiant morning to accompany your path.",
    ];
    return morningGreetings[index % morningGreetings.length];
  } else if (hour >= 12 && hour < 17) {
    const afternoonGreetings = [
      "A gracious afternoon to you.",
      "I trust your day is unfolding well.",
      "Wishing you a delightful afternoon.",
      "May your afternoon be filled with lightness.",
      "A warm afternoon greeting to you.",
      "I hope your afternoon is as pleasant as you are.",
      "May your afternoon be calm and fulfilling.",
      "A bright afternoon, wishing you continued success.",
      "I trust the day has been kind thus far.",
      "Wishing you harmony this afternoon.",
    ];
    return afternoonGreetings[index % afternoonGreetings.length];
  } else if (hour >= 17 && hour < 21) {
    const eveningGreetings = [
      "A pleasant evening to you.",
      "May your evening be tranquil.",
      "Wishing you a graceful evening.",
      "A serene evening filled with comfort.",
      "May the twilight bring you peace.",
      "Wishing you calm as the day concludes.",
      "A gentle evening to ease your spirit.",
      "May your evening glow with contentment.",
      "A peaceful evening to accompany your thoughts.",
      "Wishing you ease and warmth this evening.",
    ];
    return eveningGreetings[index % eveningGreetings.length];
  } else {
    const nightGreetings = [
      "A restful night to you.",
      "May your night be peaceful.",
      "Wishing you a serene night’s rest.",
      "May your slumber be deep and kind.",
      "A tranquil night to calm your soul.",
      "Rest well under the quiet of night.",
      "Wishing you gentle dreams and ease.",
      "May the stars keep you company tonight.",
      "A peaceful night to restore your strength.",
      "May sleep embrace you with serenity.",
    ];
    return nightGreetings[index % nightGreetings.length];
  }
}
