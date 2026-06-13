import * as React from "react";
import { Editor, EditorContent, EditorContext, useEditor } from "@tiptap/react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";

// --- @only/editor ---
import {
  EditorProvider,
  CachedImage,
  HorizontalRule,
  EmojiExtension,
  VideoExtension,
  DiffExtension,
  TOCExtension,
  ImageUploadNode,
  Button,
  Spacer,
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
  HeadingDropdownMenu,
  ImageUploadButton,
  VideoUploadButton,
  ListDropdownMenu,
  BlockquoteButton,
  CodeBlockButton,
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
  LinkPopover,
  LinkContent,
  LinkButton,
  MarkButton,
  TextAlignButton,
  UndoRedoButton,
  EmojiPopover,
  ArrowLeftIcon,
  HighlighterIcon,
  LinkIcon,
  useTiptapEditor,
} from "@only/editor";

// --- Hooks ---
import { useIsMobile } from "@/hooks/use-mobile";

// --- Components ---
import { HistoryPopover } from "@/components/tiptap-editor/history-popover";

// --- Lib ---
import { handleImageUpload, handleVideoUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import { formatMediaUrl } from "@/lib/utils";

// --- Styles ---
import "@/components/tiptap-editor/simple-editor.scss";

import { useEffect, useCallback } from "react";
import { Eraser, Minimize2, Save } from "lucide-react";
import { toast } from "sonner";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";
import { useEditorState } from "@/hooks/use-editor-state";

type ListHistoryFn = () => Promise<number[]>;
type GetHistoryFn = (ts: number) => Promise<unknown>;
type RestoreHistoryFn = (ts: number) => Promise<unknown>;

const MainToolbarContent = React.memo(
  ({
    allowMinimize,
    editor,
    onHighlighterClick,
    onLinkClick,
    isMobile,
    onSave,
    dropChange,
    listHistory,
    getHistory,
    restoreHistory,
  }: {
    allowMinimize: boolean;
    editor: Editor;
    onHighlighterClick: () => void;
    onLinkClick: () => void;
    isMobile: boolean;
    onSave: () => void;
    dropChange: () => void;
    listHistory: ListHistoryFn;
    getHistory: GetHistoryFn;
    restoreHistory: RestoreHistoryFn;
  }) => {
    const { language } = useUserContextV2();
    const { hideTabs } = useEditorState();
    return (
      <>
        <ToolbarGroup>
          <Button
            data-style="ghost"
            tooltip={i18nText[language].save}
            onClick={onSave}
          >
            <Save className="size-4" />
          </Button>
        </ToolbarGroup>

        <Spacer />

        <ToolbarGroup>
          <UndoRedoButton action="undo" />
          <UndoRedoButton action="redo" />
        </ToolbarGroup>

        {isMobile && allowMinimize && (
          <Button
            data-style="ghost"
            tooltip={i18nText[language].minimize}
            onClick={hideTabs}
          >
            <Minimize2 className="size-4" />
          </Button>
        )}

        <ToolbarSeparator />

        {isMobile && (
          <ToolbarGroup>
            <ImageUploadButton />
            <VideoUploadButton upload={handleVideoUpload} />
            <EmojiPopover />
          </ToolbarGroup>
        )}

        <ToolbarGroup>
          <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
          <ListDropdownMenu
            types={["bulletList", "orderedList", "taskList"]}
            portal={isMobile}
          />
          <BlockquoteButton />
          <CodeBlockButton />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <MarkButton type="bold" />
          <MarkButton type="italic" />
          <MarkButton type="strike" />
          <MarkButton type="code" />
          <MarkButton type="underline" />
          {!isMobile ? (
            <ColorHighlightPopover />
          ) : (
            <ColorHighlightPopoverButton onClick={onHighlighterClick} />
          )}
          {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
          {!isMobile && <EmojiPopover />}
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <MarkButton type="superscript" />
          <MarkButton type="subscript" />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <TextAlignButton align="left" />
          <TextAlignButton align="center" />
          <TextAlignButton align="right" />
          <TextAlignButton align="justify" />
        </ToolbarGroup>

        <ToolbarSeparator />

        {!isMobile && (
          <>
            <ToolbarGroup>
              <ImageUploadButton />
              <VideoUploadButton upload={handleVideoUpload} />
            </ToolbarGroup>

            <Spacer />
          </>
        )}

        {isMobile && <ToolbarSeparator />}

        <ToolbarGroup>
          <Button
            data-style="ghost"
            tooltip={i18nText[language].drop}
            onClick={dropChange}
          >
            <Eraser className="size-4" />
          </Button>
          <HistoryPopover
            editor={editor}
            listHistory={listHistory}
            getHistory={getHistory}
            restoreHistory={restoreHistory}
          />
          {/* <ThemeToggle /> */}
          {!isMobile && allowMinimize && (
            <Button
              data-style="ghost"
              tooltip={i18nText[language].minimize}
              onClick={hideTabs}
            >
              <Minimize2 className="size-4" />
            </Button>
          )}
        </ToolbarGroup>
      </>
    );
  },
);

const MobileToolbarContent = React.memo(
  ({ type, onBack }: { type: "highlighter" | "link"; onBack: () => void }) => (
    <>
      <ToolbarGroup>
        <Button data-style="ghost" onClick={onBack}>
          <ArrowLeftIcon className="tiptap-button-icon" />
          {type === "highlighter" ? (
            <HighlighterIcon className="tiptap-button-icon" />
          ) : (
            <LinkIcon className="tiptap-button-icon" />
          )}
        </Button>
      </ToolbarGroup>

      <ToolbarSeparator />

      {type === "highlighter" ? (
        <ColorHighlightPopoverContent />
      ) : (
        <LinkContent />
      )}
    </>
  ),
);

export const useSimpleEditor = (
  onUpdate?: (props: { editor: Editor }) => void,
) => {
  const { language } = useUserContextV2();
  return useEditor({
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      ...extensionSetup,
      TOCExtension.configure({
        levels: [2, 3, 4],
        scrollBehavior: "smooth",
      }),
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 9,
        upload: handleImageUpload,
        onError: (error) =>
          toast.error(i18nText[language].uploadFailed, {
            description: error.message,
          }),
      }),
    ],
    onUpdate: onUpdate,
  });
};

export function EditorToolbar({
  allowMinimize = false,
  onClose,
  onSave,
  onDrop,
  listHistory,
  getHistory,
  restoreHistory,
}: {
  allowMinimize?: boolean;
  onClose?: (e: Editor, changed: boolean) => void;
  onSave: (e: Editor) => Promise<unknown>;
  onDrop: (e: Editor) => Promise<unknown>;
  listHistory: ListHistoryFn;
  getHistory: GetHistoryFn;
  restoreHistory: RestoreHistoryFn;
}) {
  const { editor } = useTiptapEditor();
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main");

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  const handleSave = useCallback(() => {
    if (editor) {
      onSave(editor).then(() => {
        onClose?.(editor, true);
      });
    }
  }, [editor, onSave, onClose]);

  const handleDrop = useCallback(async () => {
    if (editor) {
      onDrop(editor).then(() => {
        onClose?.(editor, false);
      });
    }
  }, [editor, onDrop, onClose]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [handleSave]);

  if (!editor) return null;

  return (
    <Toolbar className="!relative">
      {mobileView === "main" ? (
        <MainToolbarContent
          allowMinimize={allowMinimize}
          editor={editor}
          onHighlighterClick={() => setMobileView("highlighter")}
          onLinkClick={() => setMobileView("link")}
          isMobile={isMobile}
          onSave={handleSave}
          dropChange={handleDrop}
          listHistory={listHistory}
          getHistory={getHistory}
          restoreHistory={restoreHistory}
        />
      ) : (
        <MobileToolbarContent
          type={mobileView === "highlighter" ? "highlighter" : "link"}
          onBack={() => setMobileView("main")}
        />
      )}
    </Toolbar>
  );
}

export function SimpleEditor() {
  const { editor } = useTiptapEditor();

  if (!editor) return null;

  return (
    <div className="dashboard-editor h-full w-full overflow-auto">
      <div className="simple-editor-wrapper">
        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </div>
    </div>
  );
}

export const extensionSetup = [
  StarterKit.configure({
    horizontalRule: false,
    link: {
      openOnClick: false,
      enableClickSelection: true,
    },
  }),
  HorizontalRule,
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight.configure({ multicolor: true }),
  CachedImage.configure({ formatUrl: formatMediaUrl }),
  Typography,
  Superscript,
  Subscript,
  EmojiExtension,
  VideoExtension.configure({ formatUrl: formatMediaUrl }),
  Selection,
];

export function ReadOnlyTiptap({
  draft,
  style = "",
  diffView = false,
}: {
  draft: any;
  style?: string;
  diffView?: boolean;
}) {
  const { language } = useUserContextV2();
  const editor = useEditor({
    editable: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: `simple-editor ${style === "" ? "read-only-tiptap" : ""}`,
        style: style,
      },
    },
    extensions: diffView ? [...extensionSetup, DiffExtension] : extensionSetup,
    content: draft,
  });
  return (
    <EditorProvider language={language}>
      <div className="simple-editor-wrapper">
        <EditorContext.Provider value={{ editor }}>
          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-content"
          />
        </EditorContext.Provider>
      </div>
    </EditorProvider>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    save: "保存",
    minimize: "最小化",
    drop: "取消更改",
    outOfSync: "🔄 文档内容有更新！",
    uploadFailed: "上传失败",
    success: "文档保存成功",
    dropSuccess: "文档已还原",
  },
  [UserLangEnum.ENUS]: {
    save: "Save",
    minimize: "Minimize",
    drop: "Drop",
    outOfSync: "🔄 Draft content is out of sync!",
    uploadFailed: "Upload failed",
    success: "Draft saved successfully",
    dropSuccess: "Draft dropped successfully",
  },
};
