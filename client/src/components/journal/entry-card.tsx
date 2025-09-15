import { EntryMeta, useEntry } from "@/hooks/use-entries";
import { ImageList } from "@/components/journal/image-list";
import { useEffect, useRef, useState } from "react";
import { Icon, More, MoreArrow } from "@/components/journal/icon";
import { useDraft } from "@/hooks/use-draft";
import { Editor, generateHTML, type JSONContent } from "@tiptap/react";
import { countWords } from "alfaaz";
import { extensionSetup } from "@/components/tiptap-templates/simple/simple-editor";
import { UserLangEnum, type UserLang } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";
import { useTTContext } from "@/components/editor";
import { useCloseActionContext } from "@/close-action-provider";

const filterText = (doc: JSONContent) => {
  return {
    ...doc,
    content: doc.content?.filter((node) => node.type !== "image"),
  };
};

const monthToText = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const formatTime = (date: Date | string) => {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  });
};

const formatDate = (date: Date | string, language: UserLang) => {
  if (language === UserLangEnum.ENUS) {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
  return new Date(date)
    .toLocaleDateString("zh-CN", {
      weekday: "long",
      month: "short",
      day: "numeric",
    })
    .replace("星期", " 星期");
};

interface EntryCardProps {
  meta: EntryMeta;
  showYear: boolean;
  showMonth: boolean;
  showToday: boolean;
  showYesterday: boolean;
}

export default function EntryCard({
  meta,
  showYear,
  showMonth,
  showToday,
  showYesterday,
}: EntryCardProps) {
  const { language } = useUserContext();
  const { data: entry } = useEntry(meta.id);
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { data: draft } = useDraft(meta.draft);
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const { setOnClose } = useCloseActionContext();

  const handleEditEntry = (draft: number) => {
    setEditorId(draft);
    setEditorDialogOpen(true);
    setOnClose(() => (e: Editor) => {
      const count = countWords(e.getText());
      setOnClose(() => () => {});
    });
  };

  const collapseHeight = 144; // Default height when collapsed

  useEffect(() => {
    if (entry && cardRef.current) {
      if (cardRef.current.scrollHeight > collapseHeight) {
        setHasMore(true);
      } else {
        setHasMore(false);
      }
    }
  }, [entry]);

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.maxHeight = expanded
        ? cardRef.current.scrollHeight + "px"
        : collapseHeight + "px";
    }
  }, [expanded]);

  if (!entry || !draft) return null;

  return (
    <>
      {showMonth && (
        <h3 className="text-foreground mt-6 mb-2 ml-1 text-xl leading-none font-semibold">
          {monthToText[meta.month - 1]}
          {showYear && ", " + meta.year}
        </h3>
      )}
      {showToday && (
        <h3 className="text-foreground mt-6 mb-2 ml-1 text-xl leading-none font-semibold">
          Today
        </h3>
      )}
      {showYesterday && (
        <h3 className="text-foreground mt-6 mb-2 ml-1 text-xl leading-none font-semibold">
          Yesterday
        </h3>
      )}

      {/* entry card */}
      <div className="entry-card-shadow bg-entry-card mb-4 flex flex-col overflow-hidden rounded-lg transition-shadow hover:shadow-md">
        {/* TODO picture loading css animation */}
        <div className="my-1 px-1">
          <ImageList
            imgSrc={
              (draft.content as JSONContent).content
                ?.filter((node) => node.type === "image")
                .map((node) => node.attrs?.src as string) ?? []
            }
          />
        </div>

        {/* text content */}
        <div
          ref={cardRef}
          className={`relative mx-4 my-3 overflow-hidden transition-all duration-500 ease-in-out`}
          onClick={() => setExpanded(!expanded)}
        >
          <div
            className={`${hasMore && !expanded ? "opacity-100 delay-500" : "opacity-0"} absolute right-0 bottom-[1px] flex h-5 w-5 items-center justify-center transition-opacity duration-100`}
          >
            <div className="more-arrow-blur relative">
              <Icon className="relative z-10 h-[14px] w-[14px]">
                <MoreArrow />
              </Icon>
            </div>
          </div>
          <div
            className="text-foreground leading-6 font-normal"
            dangerouslySetInnerHTML={{
              __html: generateHTML(filterText(draft.content), extensionSetup),
            }}
          ></div>
        </div>

        {/* footer */}
        <div className="border-border mx-1 flex items-center justify-between border-t px-3 py-1">
          <div className="flex-1">
            <div className="text-more-arrow flex items-center space-x-1 text-xs">
              <span>{formatDate(entry.createdAt, language)}</span>
              <span>· {formatTime(entry.createdAt)}</span>
            </div>
          </div>
          <div onClick={() => handleEditEntry(meta.draft)}>
            <Icon className="h-5 w-5">
              <More className="fill-more-arrow" />
            </Icon>
          </div>
        </div>
      </div>
    </>
  );
}
