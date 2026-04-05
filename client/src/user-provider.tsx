import { useUser, useUserV2, type User } from "@/hooks/use-user";
import { createContext, useContext, type ReactNode } from "react";
import type { UserField, UserLang } from "@/lib/model";

type UserContextType = {
  user: User;
  language: UserLang;
};
const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { data: userInfo } = useUser();
  if (!userInfo) return null;

  return (
    <UserContext.Provider
      value={{ language: userInfo.language, user: userInfo }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useLanguageContext must be used within LanguageProvider");
  return context;
};

type UserContextTypeV2 = {
  user: UserField;
  language: UserLang;
};
const UserContextV2 = createContext<UserContextTypeV2 | undefined>(undefined);

export const UserProviderV2 = ({
  children,
  getUserFn,
}: {
  children: ReactNode;
  getUserFn: () => Promise<UserField | undefined>;
}) => {
  const { data: userInfo } = useUserV2(getUserFn);
  if (!userInfo) return null;

  return (
    <UserContextV2.Provider
      value={{ language: userInfo.language, user: userInfo }}
    >
      {children}
    </UserContextV2.Provider>
  );
};

export const useUserContextV2 = () => {
  const context = useContext(UserContextV2);
  if (!context)
    throw new Error("useLanguageContext must be used within LanguageProvider");
  return context;
};
