import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";
import type { UserView } from "@only/contracts";
import { toUserLang, type UserLang } from "./lang.js";

type UserContextV2 = {
  user: UserView;
  language: UserLang;
};

const UserContextV2 = createContext<UserContextV2 | undefined>(undefined);

const defaultUser: UserView = {
  username: "",
  email: "",
  avatar: "",
  language: "zh-CN",
  updatedAt: BigInt(0),
};

/// Provides user profile data fetched via the supplied async function.
///
/// Renders nothing until the first successful response so consumers always
/// receive a defined user.
export function UserProviderV2({
  children,
  getUserFn,
}: {
  children: ReactNode;
  getUserFn: () => Promise<UserView | undefined>;
}) {
  const { data: userInfo } = useQuery<UserView>({
    queryKey: ["user"],
    queryFn: async () => (await getUserFn()) ?? defaultUser,
    staleTime: Infinity,
    placeholderData: (previousData) => previousData,
  });

  if (!userInfo) return null;

  return (
    <UserContextV2.Provider
      value={{ user: userInfo, language: toUserLang(userInfo.language) }}
    >
      {children}
    </UserContextV2.Provider>
  );
}

export function useUserContextV2(): UserContextV2 {
  const context = useContext(UserContextV2);
  if (!context)
    throw new Error("useUserContextV2 must be used within UserProviderV2");
  return context;
}
