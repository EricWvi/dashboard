import { UserLangEnum } from "@/hooks/use-user";
import { Icon, Search, More } from "./icon";
import Stats from "./stats";
import { useEffect, useState } from "react";
import { useUserContext } from "@/user-provider";

interface HeaderProps {
  onSearchToggle: () => void;
  onCalendarToggle: () => void;
}

export default function Header(props: HeaderProps) {
  const { language } = useUserContext();
  return (
    <header>
      <Toolbar {...props} />
      <div className="mx-auto max-w-7xl space-y-2 px-4 sm:px-6 lg:px-8">
        <div className="mt-10 flex h-12 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-foreground text-3xl font-bold">
              {i18nText[language].journal}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-search-icon flex h-8 w-8 items-center justify-center rounded-full">
              <Icon className="h-5 w-5" onClick={props.onSearchToggle}>
                <Search />
              </Icon>
            </div>
            <div className="bg-search-icon flex h-8 w-8 items-center justify-center rounded-full">
              <Icon className="h-5 w-5">
                <More />
              </Icon>
            </div>
          </div>
        </div>

        <Stats />
      </div>
    </header>
  );
}

function Toolbar({ onSearchToggle }: HeaderProps) {
  const { language } = useUserContext();
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const container = document.querySelector("#scrollableDiv");
    if (!container) return;

    const handleScroll = () => {
      const scrollY = (container as HTMLElement).scrollTop;
      if (scrollY <= 80) {
        setOpacity(0);
      } else if (scrollY >= 100) {
        setOpacity(1);
      } else {
        const ratio = (scrollY - 80) / (100 - 80);
        setOpacity(ratio);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className={`toolbar-after apple-backdrop bg-tool-bar fixed top-0 z-50 h-auto w-full shrink-0 transition-opacity duration-300 ${opacity > 0.6 ? "" : "pointer-events-none"}`}
      style={{ opacity }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-10 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-foreground text-lg font-semibold">
              {i18nText[language].journal}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-toolbar-icon flex h-7 w-7 items-center justify-center rounded-full">
              <Icon className="h-4 w-4" onClick={onSearchToggle}>
                <Search />
              </Icon>
            </div>
            <div className="bg-toolbar-icon flex h-7 w-7 items-center justify-center rounded-full">
              <Icon className="h-4 w-4">
                <More />
              </Icon>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    journal: "手记",
  },
  [UserLangEnum.ENUS]: {
    journal: "Journal",
  },
};
