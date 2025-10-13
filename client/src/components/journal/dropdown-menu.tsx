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
  type EntryMeta,
} from "@/hooks/use-entries";
import { EditPen, Bookmark, Unbookmark, Share, Delete } from "./icon";

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

export function DropdownMenu({
  meta,
  position,
  onClose,
}: {
  meta: EntryMeta;
  position: { top: number; left: number };
  onClose: () => void;
}) {
  const { language } = useUserContext();
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const { setOnClose } = useCloseActionContext();
  const updateEntryMutation = useUpdateEntry();

  const handleClick = (action: string) => {
    if (action === "edit") {
      handleEditEntry(meta.id, meta.draft);
    }
    onClose();
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
      <div className="dropdown-menu-overlay" onClick={onClose} />
      <div
        className="dropdown-menu"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {entryCardMenuItems.map((item, index) => {
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
                className={`dropdown-menu-item ${item.label === "delete" ? "text-destructive" : "text-foreground"}`}
                onClick={() => handleClick(item.label!)}
              >
                <span>
                  {
                    i18nText[language][
                      item.label as keyof (typeof i18nText)[typeof language]
                    ]
                  }
                </span>
                <span className="icon">
                  {item.label === "bookmark" ? (
                    <div className="h-4 w-5">
                      <Unbookmark />
                    </div>
                  ) : (
                    item.icon
                  )}
                </span>
              </div>
            );
          }
          return null;
        })}
      </div>
    </>
  );
}

const toolbarMenuItems = [
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

export const ToolbarMenuHeight = toolbarMenuItems.reduce(
  (acc, item) => acc + item.height,
  0,
);

export function ToolbarMenu({
  position,
  onClose,
}: {
  position: { top: number; left: number };
  onClose: () => void;
}) {
  const { language } = useUserContext();

  return (
    <>
      <div className="dropdown-menu-overlay" onClick={onClose} />
      <div
        className="dropdown-menu"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
      >
        {toolbarMenuItems.map((item, index) => {
          if (item.type === "divider") {
            return <div key={index} className="dropdown-menu-divider"></div>;
          } else if (item.type === "full-divider") {
            return (
              <div key={index} className="dropdown-menu-full-divider"></div>
            );
          } else if (item.type === "item") {
            return (
              <div key={index} className="dropdown-menu-item text-foreground">
                <span>
                  {
                    i18nText[language][
                      item.label as keyof (typeof i18nText)[typeof language]
                    ]
                  }
                </span>
                <span className="icon">
                  {item.label === "bookmark" ? (
                    <div className="h-4 w-5">
                      <Unbookmark />
                    </div>
                  ) : (
                    item.icon
                  )}
                </span>
              </div>
            );
          }
          return null;
        })}
      </div>
    </>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    edit: "编辑",
    bookmark: "书签",
    unbookmark: "移除书签",
    share: "分享",
    delete: "删除",
  },
  [UserLangEnum.ENUS]: {
    edit: "Edit",
    bookmark: "Bookmark",
    unbookmark: "Unbookmark",
    share: "Share",
    delete: "Delete",
  },
};
