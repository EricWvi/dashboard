import { UserLangEnum } from "@/hooks/use-user";
import "./dropdown-menu.css";
import { useUserContext } from "@/user-provider";
import { countWords } from "alfaaz";
import { Editor } from "@tiptap/react";
import { useTTContext } from "@/components/editor";
import { useCloseActionContext } from "@/close-action-provider";
import {
  refreshMeta,
  useUpdateEntry,
  useEntry,
  useBookmarkEntry,
  useUnbookmarkEntry,
  type EntryMeta,
} from "@/hooks/use-entries";
import {
  EditPen,
  Bookmark,
  Unbookmark,
  Share,
  Delete,
  NumberSquare,
  ChevronRight,
  Sparkles,
  Calendar31,
  MapPin,
  Tag,
} from "./icon";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGetEntryDate } from "@/hooks/use-entries";
import { Check } from "lucide-react";

const entryCardMenuItems = [
  {
    type: "item",
    label: "edit",
    icon: (
      <div className="h-4 w-5">
        <EditPen />
      </div>
    ),
    height: 44,
  },
  {
    type: "divider",
    height: 1,
  },
  {
    type: "item",
    label: "bookmark",
    icon: (
      <div className="h-4 w-5">
        <Bookmark />
      </div>
    ),
    height: 44,
  },
  {
    type: "divider",
    height: 1,
  },
  {
    type: "item",
    label: "tags",
    icon: (
      <div className="h-[18px] w-[22px]">
        <Tag />
      </div>
    ),
    height: 44,
  },
  {
    type: "divider",
    height: 1,
  },
  {
    type: "item",
    label: "location",
    icon: (
      <div className="size-5">
        <MapPin />
      </div>
    ),
    height: 44,
  },
  {
    type: "divider",
    height: 1,
  },
  {
    type: "item",
    label: "share",
    icon: (
      <div className="size-5">
        <Share />
      </div>
    ),
    height: 44,
  },
  {
    type: "full-divider",
    height: 8,
  },
  {
    type: "item",
    label: "delete",
    icon: (
      <div className="size-5">
        <Delete />
      </div>
    ),
    height: 44,
  },
];

export const EntryCardMenuHeight = entryCardMenuItems.reduce(
  (acc, item) => acc + item.height,
  0,
);

interface DropdownMenuProps {
  meta: EntryMeta;
  onEditTags: () => void;
  onShare: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export function DropdownMenu({
  meta,
  onEditTags,
  onShare,
  onDelete,
  onClose,
}: DropdownMenuProps) {
  const { language } = useUserContext();
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const { setOnClose } = useCloseActionContext();
  const updateEntryMutation = useUpdateEntry();
  const bookmarkEntryMutation = useBookmarkEntry();
  const unbookmarkEntryMutation = useUnbookmarkEntry();
  const { data: entry } = useEntry(meta.id);

  const isBookmarked = entry?.bookmark ?? false;

  const handleClick = (action: string) => {
    if (action === "edit") {
      handleEditEntry(meta.id, meta.draft);
    } else if (action === "bookmark") {
      handleBookmark();
    } else if (action === "share") {
      onShare();
    } else if (action === "delete") {
      onDelete();
    } else if (action === "location" || action === "tags") {
      onEditTags();
    }
    onClose();
  };

  const handleBookmark = () => {
    if (isBookmarked) {
      unbookmarkEntryMutation.mutate(meta.id);
    } else {
      bookmarkEntryMutation.mutate(meta.id);
    }
  };

  const handleEditEntry = (id: number, draft: number) => {
    setEditorId(draft);
    setEditorDialogOpen(true);
    setOnClose(() => (e: Editor, changed: boolean) => {
      if (changed) {
        const str = e.getText();
        updateEntryMutation
          .mutateAsync({
            id,
            wordCount: countWords(str),
            rawText: str.trim().replace(/\s+/g, " "),
          })
          .then(() => {
            refreshMeta();
          });
      }

      setOnClose(() => () => {});
    });
  };

  return (
    <>
      <div className="dropdown-menu">
        {entryCardMenuItems.map((item, index) => {
          if (item.type === "divider") {
            return <div key={index} className="dropdown-menu-divider"></div>;
          } else if (item.type === "full-divider") {
            return (
              <div key={index} className="dropdown-menu-full-divider"></div>
            );
          } else if (item.type === "item") {
            const displayLabel =
              item.label === "bookmark" && isBookmarked
                ? "unbookmark"
                : item.label;
            const displayIcon =
              item.label === "bookmark" && isBookmarked ? (
                <div className="h-4 w-5">
                  <Unbookmark />
                </div>
              ) : (
                item.icon
              );

            return (
              <div
                key={index}
                className={`dropdown-menu-item ${item.label === "delete" ? "text-destructive" : "text-foreground"}`}
                onClick={() => handleClick(item.label!)}
              >
                <div className="flex min-w-0 items-baseline">
                  <div className="whitespace-nowrap">
                    {
                      i18nText[language][
                        displayLabel as keyof (typeof i18nText)[typeof language]
                      ]
                    }
                  </div>
                  {entry?.payload?.location && item.label === "location" && (
                    <div className="text-muted-foreground mx-2 truncate text-sm">
                      {
                        entry.payload.location[
                          entry.payload.location.length - 1
                        ]
                      }
                    </div>
                  )}
                  {entry?.payload?.tags && item.label === "tags" && (
                    <div className="text-muted-foreground mx-2 truncate text-sm">
                      {entry.payload.tags.join(", ")}
                    </div>
                  )}
                </div>

                <span className="icon">{displayIcon}</span>
              </div>
            );
          }
          return null;
        })}
      </div>
    </>
  );
}

const DateRangeHeader = ({
  placeholder,
  onDateRangeFilter,
  expanded = false,
}: {
  placeholder: string;
  onDateRangeFilter?: (date: string) => void;
  expanded?: boolean;
}) => {
  const { language } = useUserContext();
  const [rotated, setRotated] = useState(false);
  useEffect(() => {
    if (expanded) {
      setTimeout(() => {
        setRotated(true);
      }, 50);
    }
  }, []);

  return (
    <div
      className={`dropdown-menu-submenu text-foreground ${expanded ? "submenu-header" : ""}`}
    >
      <div className="relative">
        <div
          className={`absolute top-1/2 left-[-6px] size-3 translate-y-[-50%] transition-transform ${rotated ? "rotate-90" : ""}`}
        >
          <ChevronRight />
        </div>
        <div className="flex flex-col justify-center pl-3">
          <span
            className={`pt-[2px] leading-none ${expanded ? "font-medium" : "font-normal"}`}
          >
            {i18nText[language].dateRange}
          </span>
          <span className="text-muted-foreground text-sm">{placeholder}</span>
        </div>
      </div>

      <span className="icon">
        {expanded ? (
          <div
            className="cursor-pointer font-medium"
            onClick={() => {
              onDateRangeFilter!(placeholder);
            }}
          >
            <Check size={20} strokeWidth={3} />
          </div>
        ) : (
          <div className={"h-4 w-5"}>
            <NumberSquare />
          </div>
        )}
      </span>
    </div>
  );
};

const DateRange = ({
  placeholder,
  onDateRangeFilter,
}: {
  placeholder: number[];
  onDateRangeFilter: (date: string) => void;
}) => {
  const { data: dates } = useGetEntryDate();

  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(
    placeholder[0] || dates?.dates[0]?.year || currentDate.getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    placeholder[1] ||
      dates?.dates[0]?.months[0].month ||
      currentDate.getMonth() + 1,
  );
  const [selectedDay, setSelectedDay] = useState<number>(
    placeholder[2] ||
      dates?.dates[0]?.months[0].days[0] ||
      currentDate.getDate(),
  );
  const [rangeText, setRangeText] = useState(() => {
    const month = selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth;
    const day = selectedDay < 10 ? `0${selectedDay}` : selectedDay;
    return `${selectedYear}-${month}-${day}`;
  });

  const yearRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const monthRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const dayRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    yearRefs.current[selectedYear]?.scrollIntoView({ block: "center" });
    monthRefs.current[selectedMonth]?.scrollIntoView({ block: "center" });
    dayRefs.current[selectedDay]?.scrollIntoView({ block: "center" });
  }, []);

  const handleYearClick = (year: number) => {
    const m = dates!.dates.find((d) => d.year === year)!.months[0].month;
    const d = dates!.dates.find((d) => d.year === year)!.months[0].days[0];
    const month = m < 10 ? `0${m}` : m;
    const day = d < 10 ? `0${d}` : d;
    setSelectedYear(year);
    setSelectedMonth(m);
    setSelectedDay(d);
    setRangeText(`${year}-${month}-${day}`);
  };

  const handleMonthClick = (m: number) => {
    const d = dates!.dates
      .find((d) => d.year === selectedYear)!
      .months.find((month) => month.month === m)!.days[0];
    const month = m < 10 ? `0${m}` : m;
    const day = d < 10 ? `0${d}` : d;
    setSelectedMonth(m);
    setSelectedDay(d);
    setRangeText(`${selectedYear}-${month}-${day}`);
  };

  const handleDayClick = (d: number) => {
    const month = selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth;
    const day = d < 10 ? `0${d}` : d;
    setSelectedDay(d);
    setRangeText(`${selectedYear}-${month}-${day}`);
  };

  if (!dates) return null;

  return (
    <div className="dropdown-menu">
      <DateRangeHeader
        placeholder={rangeText}
        onDateRangeFilter={onDateRangeFilter}
        expanded
      />
      <div className="dropdown-menu-divider"></div>

      {dates.count === 0 ? (
        <div className="text-muted-foreground flex h-60 items-center justify-center text-sm">
          No entries found
        </div>
      ) : (
        <div className="flex h-60">
          {/* Year Column */}
          <div className="date-selector-column year-column">
            {dates.dates.map((date) => (
              <button
                key={date.year}
                ref={(el) => {
                  yearRefs.current[date.year] = el;
                }}
                className={`date-selector-item ${selectedYear === date.year ? "selected" : ""}`}
                onClick={() => handleYearClick(date.year)}
              >
                {date.year}
              </button>
            ))}
          </div>

          {/* Month Column */}
          <div className="date-selector-column month-column">
            {dates.dates
              .find((date) => date.year === Number(selectedYear))
              ?.months.map((date) => (
                <button
                  key={date.month}
                  ref={(el) => {
                    monthRefs.current[date.month] = el;
                  }}
                  className={`date-selector-item ${selectedMonth === date.month ? "selected" : ""}`}
                  onClick={() => handleMonthClick(date.month)}
                >
                  {date.month}
                </button>
              ))}
          </div>

          {/* Day Column */}
          <div className="date-selector-column day-column">
            {dates.dates
              .find((date) => date.year === Number(selectedYear))
              ?.months.find((month) => month.month === Number(selectedMonth))
              ?.days.map((day) => (
                <button
                  key={day}
                  ref={(el) => {
                    dayRefs.current[day] = el;
                  }}
                  className={`date-selector-item ${selectedDay === day ? "selected" : ""}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

const toolbarMenuItems = [
  {
    type: "submenu",
    label: "dateRange",
    icon: (
      <div className="h-4 w-5">
        <NumberSquare />
      </div>
    ),
    height: 56,
  },
  {
    type: "full-divider",
    height: 8,
  },
  {
    type: "item",
    label: "bookmarkFilter",
    icon: (
      <div className="h-4 w-5">
        <Bookmark />
      </div>
    ),
    height: 44,
  },
  {
    type: "divider",
    height: 1,
  },
  {
    type: "item",
    label: "todays",
    icon: (
      <div className="h-4 w-5">
        <Calendar31 />
      </div>
    ),
    height: 44,
  },
  {
    type: "full-divider",
    height: 8,
  },
  {
    type: "item",
    label: "shuffle",
    icon: (
      <div className="size-5">
        <Sparkles />
      </div>
    ),
    height: 44,
  },
];

interface ToolbarMenuProps {
  dateRangeText: () => string[];
  isAnimating: boolean;
  onClose: () => void;
  onBookmarkFilter: () => void;
  onShuffle: () => void;
  onTodays: () => void;
  onDateRangeFilter: (date: string) => void;
}

export function ToolbarMenu({
  dateRangeText,
  isAnimating,
  onClose,
  onBookmarkFilter,
  onShuffle,
  onTodays,
  onDateRangeFilter,
}: ToolbarMenuProps) {
  const { language } = useUserContext();
  const datePair = dateRangeText();
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const submenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [submenuPosition, setSubmenuPosition] = useState({
    top: 0,
    right: 0,
  });

  const dateRangePlaceholder = useCallback(() => {
    if (datePair.length !== 0) {
      const [operator, date] = datePair;
      if (operator === "before") {
        return language === UserLangEnum.ZHCN
          ? date + " 之前"
          : "before " + date;
      } else if (operator === "on") {
        return date;
      }
    }
    return language === UserLangEnum.ZHCN ? "今日" : "Today";
  }, [language]);

  const handleClick = (label: string) => {
    if (label === "bookmarkFilter") {
      onBookmarkFilter();
    } else if (label === "shuffle") {
      onShuffle();
    } else if (label === "todays") {
      onTodays();
    }
    onClose();
  };

  const handleSubmenuToggle = (submenuName: string) => {
    setActiveSubmenu(activeSubmenu === submenuName ? null : submenuName);
    const rect = submenuRefs.current[submenuName]!.getBoundingClientRect();
    setSubmenuPosition({
      top: rect.top + 8,
      right: window.innerWidth - rect.right,
    });
  };

  return (
    <>
      {/* Overlay between menu and submenu - closes submenu but keeps menu open */}
      {activeSubmenu && (
        <div
          className="fixed inset-0 z-1050"
          onClick={() => setActiveSubmenu(null)}
        />
      )}

      <div
        className={`dropdown-menu duration-300 ${activeSubmenu ? "dropdown-menu-inactive delay-100" : ""}`}
      >
        {/* gray overlay for submenu */}
        {activeSubmenu && (
          <div className="absolute inset-0 z-50 bg-white/40 transition-all dark:bg-black/40"></div>
        )}

        {toolbarMenuItems.map((item, index) => {
          if (item.type === "divider") {
            return <div key={index} className="dropdown-menu-divider"></div>;
          } else if (item.type === "full-divider") {
            return (
              <div key={index} className="dropdown-menu-full-divider"></div>
            );
          } else if (item.type === "item") {
            return (
              <div
                key={index}
                className="dropdown-menu-item text-foreground"
                onClick={() => handleClick(item.label!)}
              >
                <span className="pl-3">
                  {
                    i18nText[language][
                      item.label as keyof (typeof i18nText)[typeof language]
                    ]
                  }
                </span>
                <span className="icon">{item.icon}</span>
              </div>
            );
          } else if (item.type === "submenu") {
            if (item.label === "dateRange") {
              return (
                <div
                  key={index}
                  ref={(el) => {
                    submenuRefs.current["dateRange"] = el;
                  }}
                  onClick={() => {
                    if (!isAnimating) handleSubmenuToggle("dateRange");
                  }}
                >
                  <DateRangeHeader placeholder={dateRangePlaceholder()} />
                </div>
              );
            }
          }
          return null;
        })}
      </div>

      {/* Render submenu outside the overflow-hidden container */}
      {activeSubmenu === "dateRange" && (
        <div
          style={{
            top: `${submenuPosition.top}px`,
            right: `${submenuPosition.right}px`,
            transformOrigin: "top center",
          }}
          className="fixed z-1100"
        >
          <DateRange
            placeholder={
              datePair[1] ? datePair[1].split("-").map((v) => Number(v)) : []
            }
            onDateRangeFilter={(date: string) => {
              onDateRangeFilter(date);
              setActiveSubmenu(null);
              onClose();
            }}
          />
        </div>
      )}
    </>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    edit: "编辑",
    bookmark: "书签",
    unbookmark: "移除书签",
    bookmarkFilter: "查看书签",
    dateRange: "日期范围",
    share: "分享",
    delete: "删除",
    shuffle: "随机回顾",
    todays: "历史今天",
    location: "位置",
    tags: "标签",
  },
  [UserLangEnum.ENUS]: {
    edit: "Edit",
    bookmark: "Bookmark",
    unbookmark: "Unbookmark",
    bookmarkFilter: "Show Bookmarks",
    dateRange: "Date Range",
    share: "Share",
    delete: "Delete",
    shuffle: "Shuffle Entries",
    todays: "Today in History",
    location: "Location",
    tags: "Tags",
  },
};
