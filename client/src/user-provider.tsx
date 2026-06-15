import { useUser } from "@/hooks/use-user";
import { createContext, useContext, type ReactNode } from "react";
import type { UserLang } from "@/lib/model";
import type { User } from "@/hooks/use-user";

export { UserProviderV2, useUserContextV2 } from "@only/app-context";

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
    throw new Error("useUserContext must be used within UserProvider");
  return context;
};
