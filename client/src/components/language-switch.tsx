import { UserLangEnum, type UserLang } from "@/hooks/use-user";
import { useState } from "react";

export const LanguageSwitch = ({
  defaultLanguage = UserLangEnum.ZHCN,
  onLanguageChange,
}: {
  defaultLanguage?: UserLang;
  onLanguageChange?: (lang: UserLang) => void;
}) => {
  const [activeLanguage, setActiveLanguage] = useState(defaultLanguage);

  const handleLanguageChange = (lang: UserLang) => {
    setActiveLanguage(lang);
    if (onLanguageChange) {
      onLanguageChange(lang);
    }
  };

  return (
    <div className="inline-flex items-center justify-center rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
      <button
        onClick={() => handleLanguageChange(UserLangEnum.ZHCN)}
        className={`relative inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-gray-300 ${
          activeLanguage === UserLangEnum.ZHCN
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-gray-50"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        } `}
        aria-label="Switch to Chinese"
        aria-pressed={activeLanguage === UserLangEnum.ZHCN}
      >
        中
      </button>
      <button
        onClick={() => handleLanguageChange(UserLangEnum.ENUS)}
        className={`relative inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-gray-300 ${
          activeLanguage === UserLangEnum.ENUS
            ? "bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-gray-50"
            : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
        } `}
        aria-label="Switch to English"
        aria-pressed={activeLanguage === UserLangEnum.ENUS}
      >
        EN
      </button>
    </div>
  );
};
