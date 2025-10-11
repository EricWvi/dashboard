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

const entryCardMenuItems = [
  {
    type: "item",
    label: "edit",
    height: 44,
  },
  {
    type: "divider",
    height: 1,
  },
  {
    type: "item",
    label: "bookmark",
    height: 44,
  },
  {
    type: "full-divider",
    height: 8,
  },
  {
    type: "item",
    label: "delete",
    height: 44,
  },
];

export const EntryCardMenuHeight = entryCardMenuItems.reduce(
  (acc, item) => acc + item.height,
  0,
);

export function DropdownMenu({ meta }: { meta: EntryMeta }) {
  const { language } = useUserContext();
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();
  const { setOnClose } = useCloseActionContext();
  const updateEntryMutation = useUpdateEntry();

  const handleClick = (action: string) => {
    console.log("Clicked action:", action);
    if (action === "edit") {
      handleEditEntry(meta.id, meta.draft);
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
    <div className="dropdown-menu">
      {entryCardMenuItems.map((item, index) => {
        if (item.type === "divider") {
          return <div key={index} className="dropdown-menu-divider"></div>;
        } else if (item.type === "full-divider") {
          return <div key={index} className="dropdown-menu-full-divider"></div>;
        } else if (item.type === "item") {
          return (
            <div
              key={index}
              className="dropdown-menu-item"
              onClick={() => handleClick(item.label!)}
            >
              <span className="label">
                {
                  i18nText[language][
                    item.label as keyof (typeof i18nText)[typeof language]
                  ]
                }
              </span>
              <span className="icon">
                {item.label === "edit" && "✏️"}
                {item.label === "bookmark" && "❤️"}
                {item.label === "delete" && "🗑️"}
              </span>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    edit: "编辑",
    bookmark: "书签",
    delete: "删除",
  },
  [UserLangEnum.ENUS]: {
    edit: "Edit",
    bookmark: "Bookmark",
    delete: "Delete",
  },
};
