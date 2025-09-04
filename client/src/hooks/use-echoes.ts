import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRequest, postRequest } from "@/lib/queryClient";

export type Echo = {
  id: number;
  type: EchoType;
  year: number;
  sub: number;
  draft: number;
  mark: boolean;
};

export type EchoType = "Week" | "Year" | "Decade";
export const EchoEnum: {
  WEEK: EchoType;
  YEAR: EchoType;
  DECADE: EchoType;
} = {
  WEEK: "Week",
  YEAR: "Year",
  DECADE: "Decade",
};

const keyEchoes = (year: number, type: EchoType) => ["/api/echo", type, year];
const keyEchoesOfQuestion = (sub: number, type: EchoType) => [
  "/api/echo",
  type,
  sub,
];
const keyYearsOfType = (type: EchoType) => ["/api/echo/year", type];

export function useEchoes(
  year: number,
  type: EchoType,
  reverse: boolean = false,
) {
  return useQuery({
    queryKey: keyEchoes(year, type),
    queryFn: async () => {
      const response = await getRequest(
        `/api/echo?Action=ListEchoes&type=${type}&year=${year}`,
      );
      const data = await response.json();
      return (
        reverse ? data.message.echoes.toReversed() : data.message.echoes
      ) as Echo[];
    },
  });
}

export function useEchoesOfQuestion(sub: number, type: EchoType) {
  return useQuery({
    queryKey: keyEchoesOfQuestion(sub, type),
    queryFn: async () => {
      const response = await getRequest(
        `/api/echo?Action=ListEchoes&type=${type}&sub=${sub}`,
      );
      const data = await response.json();
      return data.message.echoes.toReversed() as Echo[];
    },
  });
}

export function useYears(type: EchoType) {
  return useQuery({
    queryKey: keyYearsOfType(type),
    queryFn: async () => {
      const response = await getRequest(
        `/api/echo?Action=ListYears&type=${type}`,
      );
      const data = await response.json();
      return data.message.years as number[];
    },
  });
}

export function useCreateEcho(year: number, type: EchoType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Echo, "id" | "type" | "year" | "mark">) => {
      const response = await postRequest("/api/echo?Action=CreateEcho", {
        ...data,
        type,
        year,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyEchoes(year, type),
      });
    },
  });
}

export function useCreateQuestionEcho(sub: number, type: EchoType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<Echo, "id" | "type" | "sub" | "mark">) => {
      const response = await postRequest("/api/echo?Action=CreateEcho", {
        ...data,
        type,
        sub,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyEchoesOfQuestion(sub, type),
      });
    },
  });
}

export function useToggleEchoMark(year: number, type: EchoType) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { id: number; mark: boolean }) => {
      const response = await postRequest("/api/echo?Action=ToggleEchoMark", {
        id: data.id,
        mark: data.mark,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: keyEchoes(year, type),
      });
    },
  });
}
