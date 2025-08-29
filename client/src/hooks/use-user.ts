import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type UserLang = "zh-CN" | "en-US";
export const UserLangEnum: {
  ZHCN: UserLang;
  ENUS: UserLang;
} = {
  ZHCN: "zh-CN",
  ENUS: "en-US",
};

export type User = {
  avatar: string;
  username: string;
  emailFeed: string;
  hasRssToken: boolean;
  hasEmailToken: boolean;
  language: UserLang;
};

const keyUser = () => ["/api/user"];
const keyRSSCount = () => ["/api/rss/count"];
const keyMailCount = () => ["/api/mail/count"];

export function useUser() {
  return useQuery<User>({
    queryKey: keyUser(),
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/user?Action=GetUser", {});
      const data = await response.json();
      return data.message as User;
    },
  });
}

export function useRSSCount() {
  return useQuery<number>({
    queryKey: keyRSSCount(),
    queryFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/user?Action=GetRSSCount",
        {},
      );
      const data = await response.json();
      return data.message.count as number;
    },
  });
}

export function invalidRSSCount() {
  queryClient.invalidateQueries({ queryKey: keyRSSCount() });
}

export function useMailCount() {
  return useQuery<number>({
    queryKey: keyMailCount(),
    queryFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/user?Action=GetQQMailCount",
        {},
      );
      const data = await response.json();
      return data.message.count as number;
    },
  });
}

export function invalidMailCount() {
  queryClient.invalidateQueries({ queryKey: keyMailCount() });
}

export function useSignUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { avatar: string; username: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/user?Action=SignUp",
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyUser() });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { avatar: string; username: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/user?Action=SignUp",
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyUser() });
    },
  });
}

export function useUpdateEmailToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { emailToken: string; emailFeed: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/user?Action=UpdateEmailToken",
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyUser() });
    },
  });
}

export function useUpdateRssToken() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { rssToken: string }) => {
      const response = await apiRequest(
        "POST",
        "/api/user?Action=UpdateRssToken",
        data,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyUser() });
    },
  });
}
