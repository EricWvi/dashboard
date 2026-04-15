import { useMutation, useQuery } from "@tanstack/react-query";
import { dashboardDatabase } from "@/lib/dashboard/db-interface";
import type { Echo, EchoField, EchoType } from "@/lib/dashboard/model";
import keys from "./query-keys";
export { EchoEnum, type EchoType, type Echo } from "@/lib/dashboard/model";

export function useEchoes(
  year: number,
  type: EchoType,
  reverse: boolean = false,
) {
  return useQuery<Echo[]>({
    queryKey: keys.echoes.year(type, year),
    queryFn: async () => {
      const echoes = await dashboardDatabase.getEchoesOfYear(type, year);
      const data = echoes.sort((a, b) => a.sub - b.sub);
      return reverse ? data.reverse() : data;
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useEchoesOfQuestion(sub: number, type: EchoType) {
  return useQuery<Echo[]>({
    queryKey: keys.echoes.question(type, sub),
    queryFn: async () => {
      const echoes = await dashboardDatabase.getEchoesOfQuestion(type, sub);
      return echoes.sort((a, b) => b.sub - a.sub);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useYears(type: EchoType) {
  return useQuery<number[]>({
    queryKey: keys.echoes.years(type),
    queryFn: async () => {
      const years = await dashboardDatabase.getYearsOfEchoType(type);
      return years.sort((a, b) => b - a);
    },
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateEcho(year: number, type: EchoType) {
  return useMutation({
    mutationFn: async (
      data: Omit<EchoField, "type" | "year" | "mark"> & { draft: string | number },
    ) => {
      await dashboardDatabase.addEcho({
        type,
        year,
        sub: data.sub,
        draft: String(data.draft),
        mark: false,
      });
    },
  });
}

export function useCreateQuestionEcho(sub: number, type: EchoType) {
  return useMutation({
    mutationFn: async (
      data: Omit<EchoField, "type" | "sub" | "mark"> & { draft: string | number },
    ) => {
      await dashboardDatabase.addEcho({
        type,
        year: data.year,
        sub,
        draft: String(data.draft),
        mark: false,
      });
    },
  });
}

export function useToggleEchoMark(_year?: number, _type?: EchoType) {
  return useMutation({
    mutationFn: async (data: { id: string | number; mark: boolean }) => {
      await dashboardDatabase.updateEcho(String(data.id), {
        mark: data.mark,
      });
    },
  });
}
