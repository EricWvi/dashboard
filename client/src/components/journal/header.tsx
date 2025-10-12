import { UserLangEnum } from "@/hooks/use-user";
import { Icon, Search, More } from "./icon";
import Stats from "./stats";
import { useEffect, useState } from "react";
import { useUserContext } from "@/user-provider";

interface HeaderProps {
  onSearch: (query: string) => void;
}

export default function Header(props: HeaderProps) {
  const { language } = useUserContext();
  const [showSearchInput, setShowSearchInput] = useState(false);

  const onSearchToggle = () => {
    setShowSearchInput(true);
  };

  const onSearch = (query: string) => {
    props.onSearch(query);
    setShowSearchInput(false);
  };

  const onCancel = () => {
    setShowSearchInput(false);
  };

  return (
    <header>
      <Toolbar onSearchToggle={onSearchToggle} />
      <div className="mx-auto max-w-7xl space-y-2 px-4 sm:px-6 lg:px-8">
        <div className="mt-10 flex h-12 items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-foreground text-3xl font-bold">
              {i18nText[language].journal}
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-search-icon flex h-8 w-8 items-center justify-center rounded-full">
              <Icon className="h-5 w-5" onClick={onSearchToggle}>
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

      {showSearchInput && (
        <SearchInput onSearch={onSearch} onCancel={onCancel} />
      )}
    </header>
  );
}

function Toolbar({ onSearchToggle }: { onSearchToggle: () => void }) {
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

export function SearchInput({
  onSearch,
  onCancel,
}: {
  onSearch: (query: string) => void;
  onCancel: () => void;
}) {
  const { language } = useUserContext();
  const [query, setQuery] = useState("");
  const [isComposing, setIsComposing] = useState(false);

  return (
    <div className="journal-bg fixed inset-0 z-1000">
      <div className="mt-4 flex items-center gap-3 px-2 py-2">
        <div className="relative flex flex-1 items-center">
          <div className="absolute left-3 flex items-center opacity-40">
            <div className="h-4 w-4">
              <Search />
            </div>
          </div>
          <input
            id="journal-search-input"
            type="text"
            className="text-foreground w-full rounded-lg bg-gray-200 px-10 py-2 text-base placeholder:text-gray-400 focus:ring-0 focus:outline-none dark:bg-gray-800"
            placeholder={i18nText[language].searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isComposing) {
                onSearch(query);
              }
            }}
            autoFocus
          />
        </div>

        <button
          className="text-search-button-text shrink-0 px-3 py-2 font-medium"
          onClick={onCancel}
        >
          {i18nText[language].cancel}
        </button>
      </div>
    </div>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    journal: "手记",
    searchPlaceholder: "搜索手记内容",
    cancel: "取消",
  },
  [UserLangEnum.ENUS]: {
    journal: "Journal",
    searchPlaceholder: "Search journal entries",
    cancel: "Cancel",
  },
};
