import * as React from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import * as Icon from "@/components/ui/icons";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

const SearchEngines = [
  {
    name: {
      [UserLangEnum.ENUS]: "Bing",
      [UserLangEnum.ZHCN]: "必应",
    },
    logo: <Icon.BingLogo />,
    shortcut: "bi",
    onSelect: (s: string) =>
      window.open("https://www.bing.com/search?q=" + s, "_blank"),
  },
  {
    name: {
      [UserLangEnum.ENUS]: "Google",
      [UserLangEnum.ZHCN]: "谷歌",
    },
    logo: <Icon.GoogleLogo />,
    shortcut: "gg",
    onSelect: (s: string) =>
      window.open("https://www.google.com/search?q=" + s, "_blank"),
  },
  {
    name: {
      [UserLangEnum.ENUS]: "Baidu",
      [UserLangEnum.ZHCN]: "百度",
    },
    logo: <Icon.BaiduLogo />,
    shortcut: "bd",
    onSelect: (s: string) =>
      window.open("https://www.baidu.com/s?ie=UTF-8&wd=" + s, "_blank"),
  },
  {
    name: {
      [UserLangEnum.ENUS]: "LDOCE",
      [UserLangEnum.ZHCN]: "朗文当代",
    },
    logo: <Icon.LdoceLogo />,
    shortcut: "ld",
    onSelect: (s: string) =>
      window.open("https://ldoce.onlyquant.top/word/" + s, "_blank"),
  },
  {
    name: {
      [UserLangEnum.ENUS]: "Translate",
      [UserLangEnum.ZHCN]: "翻译",
    },
    logo: <Icon.TranslateLogo />,
    shortcut: "tr",
    onSelect: (s: string) =>
      window.open("https://fanyi.baidu.com/#en/zh/" + s, "_blank"),
  },
  {
    name: {
      [UserLangEnum.ENUS]: "GitHub",
      [UserLangEnum.ZHCN]: "GitHub",
    },
    logo: <Icon.GitHubLogo />,
    shortcut: "github",
    onSelect: (s: string) =>
      window.open("https://github.com/search?ref=opensearch&q=" + s, "_blank"),
  },
  {
    name: {
      [UserLangEnum.ENUS]: "XiaoHongShu",
      [UserLangEnum.ZHCN]: "小红书",
    },
    logo: <Icon.XiaoHongShuLogo />,
    shortcut: "xhs",
    onSelect: (s: string) =>
      window.open(
        "https://www.xiaohongshu.com/search_result?source=web_profile_page&keyword=" +
          s,
        "_blank",
      ),
  },
  {
    name: {
      [UserLangEnum.ENUS]: "Bilibili",
      [UserLangEnum.ZHCN]: "哔哩哔哩",
    },
    logo: <Icon.BilibiliLogo />,
    shortcut: "bl",
    onSelect: (s: string) =>
      window.open(
        "https://search.bilibili.com/all?from_source=web_search&keyword=" + s,
        "_blank",
      ),
  },
  {
    name: {
      [UserLangEnum.ENUS]: "Zhihu",
      [UserLangEnum.ZHCN]: "知乎",
    },
    logo: <Icon.ZhihuLogo />,
    shortcut: "zh",
    onSelect: (s: string) =>
      window.open("https://www.zhihu.com/search?type=content&q=" + s, "_blank"),
  },
  {
    name: {
      [UserLangEnum.ENUS]: "Douban",
      [UserLangEnum.ZHCN]: "豆瓣",
    },
    logo: <Icon.DoubanLogo />,
    shortcut: "db",
    onSelect: (s: string) =>
      window.open("https://www.douban.com/search?q=" + s, "_blank"),
  },
];

export default function SearchCommand() {
  const { language } = useUserContext();
  const [open, setOpen] = React.useState(false);
  const openRef = React.useRef(open);
  React.useEffect(() => {
    openRef.current = open;
  }, [open]);

  const [searchValue, setSearchValue] = React.useState("");
  const [selectedEngine, setSelectedEngine] = React.useState<string>("");
  const searchValueRef = React.useRef(searchValue);
  React.useEffect(() => {
    searchValueRef.current = searchValue.trim();
  }, [searchValue]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!openRef.current) {
          setSearchValue("");
          setSelectedEngine("");
        }
        setOpen((open) => !open);
      }
      if (openRef.current && e.key === "Tab") {
        e.preventDefault(); // stops focus jumping
        setSearchValue("");
        setSelectedEngine(searchValueRef.current);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog shouldFilter={false} open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder={i18nText[language].searchPlaceholder}
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList className="max-h-[500px]">
        <CommandEmpty>{i18nText[language].noResults}</CommandEmpty>
        <CommandGroup
          heading={`${!selectedEngine || SearchEngines.some((s) => s.shortcut === selectedEngine) ? i18nText[language].searchEngines : ""}`}
        >
          {/* <CommandItem value={"bi" + searchValue} onSelect={selectBing}>
            <BingLogo />
            <span>Bing</span>
          </CommandItem> */}

          {SearchEngines.filter(
            (engine) => !selectedEngine || engine.shortcut === selectedEngine,
          ).map((engine) => (
            <CommandItem
              key={engine.shortcut}
              value={engine.shortcut}
              onSelect={() => {
                setOpen(false);
                setTimeout(() => {
                  engine.onSelect(searchValue);
                }, 200);
              }}
            >
              {engine.logo}
              <span>{engine.name[language]}</span>
              {searchValue.trim() === engine.shortcut && (
                <span className="bg-muted text-muted-foreground pointer-events-none inline-flex h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none">
                  Tab
                </span>
              )}
              <CommandShortcut
                className="tracking-normal"
                style={{ fontFamily: "DM Sans" }}
              >
                {engine.shortcut}
              </CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    searchEngines: "搜索引擎",
    noResults: "未找到结果",
    searchPlaceholder: "输入命令或搜索...",
  },
  [UserLangEnum.ENUS]: {
    searchEngines: "Search Engines",
    noResults: "No results found.",
    searchPlaceholder: "Type a command or search...",
  },
};
