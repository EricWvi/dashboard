import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (date: Date | string) => {
  const inDate = new Date(date);
  if (isSetToday(inDate)) {
    return "Today";
  }
  if (isSetTomorrow(inDate)) {
    return "Tomorrow";
  }
  const t = inDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return t;
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

export const isSetTomorrow = (date: Date | string | null | undefined) => {
  if (!date) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const inputDate = new Date(date);
  return (
    inputDate.getFullYear() === tomorrow.getFullYear() &&
    inputDate.getMonth() === tomorrow.getMonth() &&
    inputDate.getDate() === tomorrow.getDate()
  );
};

export const todayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};
