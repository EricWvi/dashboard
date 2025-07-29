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

export const formatDate = (date: Date | string): [string, string] => {
  const inDate = new Date(date);
  if (isSetToday(inDate)) {
    return [
      "Today",
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
    ];
  } else if (isSetDate(inDate)) {
    const today = new Date();
    const diffDays = Math.ceil(
      (inDate.getTime() - today.getTime()) / (1000 * 3600 * 24),
    );
    if (diffDays === 1) {
      return [
        "Tomorrow",
        "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
      ];
    } else if (diffDays <= 6) {
      return [
        `In ${diffDays} days`,
        "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
      ];
    } else {
      const t = inDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return [t, ""];
    }
  }
  return ["", ""];
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
