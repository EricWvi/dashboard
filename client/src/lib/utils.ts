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
  }
  return today_default;
};

export const isSetDate = (date: Date | string | null | undefined) => {
  if (!date) return false;
  const today = new Date();
  const inputDate = new Date(date);
  return (
    inputDate.getFullYear() > today.getFullYear() ||
    (inputDate.getFullYear() === today.getFullYear() &&
      inputDate.getMonth() > today.getMonth()) ||
    (inputDate.getFullYear() === today.getFullYear() &&
      inputDate.getMonth() === today.getMonth() &&
      inputDate.getDate() >= today.getDate())
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

export function msUntilMidnight() {
  const now = new Date();
  // Next midnight
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0); // sets to next midnight
  return midnight.getTime() - now.getTime();
}
