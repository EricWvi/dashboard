import { useUser, type User, type UserLang } from "@/hooks/use-user";
import { createContext, useContext, type ReactNode } from "react";

type UserContextType = {
  user: User;
  language: UserLang;
};
const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const { data: userInfo } = useUser();
  if (!userInfo) return null;

  return (
    !!userInfo && (
      <UserContext.Provider
        value={{ language: userInfo.language, user: userInfo }}
      >
        {children}
      </UserContext.Provider>
    )
  );
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context)
    throw new Error("useLanguageContext must be used within LanguageProvider");
  return context;
};
