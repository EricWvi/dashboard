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

const SearchEngines = [
  {
    name: "Bing",
    logo: <Icon.BingLogo />,
    shortcut: "bi",
    onSelect: (s: string) =>
      window.open("https://www.bing.com/search?q=" + s, "_blank"),
  },
  {
    name: "Google",
    logo: <Icon.GoogleLogo />,
    shortcut: "gg",
    onSelect: (s: string) =>
      window.open("https://www.google.com/search?q=" + s, "_blank"),
  },
  {
    name: "Baidu",
    logo: <Icon.BaiduLogo />,
    shortcut: "bd",
    onSelect: (s: string) =>
      window.open("https://www.baidu.com/s?ie=UTF-8&wd=" + s, "_blank"),
  },
  {
    name: "Translate",
    logo: <Icon.TranslateLogo />,
    shortcut: "tr",
    onSelect: (s: string) =>
      window.open("https://fanyi.baidu.com/#en/zh/" + s, "_blank"),
  },
  {
    name: "GitHub",
    logo: <Icon.GitHubLogo />,
    shortcut: "github",
    onSelect: (s: string) =>
      window.open("https://github.com/search?ref=opensearch&q=" + s, "_blank"),
  },
  {
    name: "XiaoHongShu",
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
    name: "Bilibili",
    logo: <Icon.BilibiliLogo />,
    shortcut: "bl",
    onSelect: (s: string) =>
      window.open(
        "https://search.bilibili.com/all?from_source=web_search&keyword=" + s,
        "_blank",
      ),
  },
  {
    name: "Zhihu",
    logo: <Icon.ZhihuLogo />,
    shortcut: "zh",
    onSelect: (s: string) =>
      window.open("https://www.zhihu.com/search?type=content&q=" + s, "_blank"),
  },
];

export default function SearchCommand() {
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
        placeholder="Type a command or search..."
        value={searchValue}
        onValueChange={setSearchValue}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Search Engines">
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
              <span>{engine.name}</span>
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
