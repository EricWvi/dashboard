import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRequest, postRequest, queryClient } from "@/lib/queryClient";

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
  session: string;
};

export type I18nText = {
  [UserLangEnum.ENUS]: string;
  [UserLangEnum.ZHCN]: string;
};

const keyUser = () => ["/meta/user"];
const keyRSSCount = () => ["/api/rss/count"];
const keyMailCount = () => ["/api/mail/count"];

export const UserQueryOptions = {
  queryKey: keyUser(),
  queryFn: async () => {
    try {
      const response = await getRequest(
        "/api/user?Action=GetUser",
        localStorage.getItem("onlyTokenString") || crypto.randomUUID(),
      );
      const data = await response.json();
      localStorage.setItem("onlyTokenString", data.message.session);
      return data.message as User;
    } catch {
      window.open("https://auth.onlyquant.top/", "_blank");
      throw new Error("Failed to fetch user info");
    }
  },
};

export function useUser() {
  return useQuery<User>(UserQueryOptions);
}

export function useRSSCount() {
  return useQuery<number>({
    queryKey: keyRSSCount(),
    queryFn: async () => {
      const response = await getRequest("/api/user?Action=GetRSSCount");
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
      const response = await getRequest(
        "/api/user?Action=GetQQMailCount",
        "",
        3,
        4000,
        5000,
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
      const response = await postRequest("/api/user?Action=UpdateUser", data);
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
    mutationFn: async (data: {
      avatar: string;
      username: string;
      language: UserLang;
    }) => {
      const response = await postRequest("/api/user?Action=UpdateUser", data);
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
      const response = await postRequest(
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
      const response = await postRequest(
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

export function useUpdateLanguage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { language: UserLang }) => {
      const response = await postRequest("/api/user?Action=UpdateUser", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keyUser() });
    },
  });
}

export async function getSessionStatus() {
  return getRequest("/api/user?Action=GetSessionStatus");
}

export async function syncSessionStatus() {
  getRequest("/api/user?Action=SyncSessionStatus");
  queryClient.removeQueries({
    predicate: (query) => !(query.queryKey[0] as string).startsWith("/meta"),
  });
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] !== "/meta/user",
  });
}
