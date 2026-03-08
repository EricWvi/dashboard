import * as React from "react";
import { Editor, EditorContent, EditorContext, useEditor } from "@tiptap/react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import { EmojiExtension } from "@/components/tiptap-node/emoji-node";
import { VideoExtension } from "@/components/tiptap-node/video-node";
import { DiffExtension } from "@/components/tiptap-node/diff-node";
import { TOCExtensionV2 } from "@/components/tiptap-node/toc-node";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";
import "@/components/tiptap-node/video-node/video-node.scss";
import "@/components/tiptap-node/diff-node/diff.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { VideoUploadButton } from "@/components/tiptap-ui/video-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";
import { EmojiPopover } from "@/components/tiptap-ui/emoji-popover/emoji-popover";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";

// --- Hooks ---
import { useIsMobile } from "@/hooks/use-mobile";

// --- Components ---
import { HistoryPopover } from "@/components/tiptap-editor/history-popover";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-editor/simple-editor.scss";

import { useEffect, useRef, useCallback } from "react";
import { Eraser, Save } from "lucide-react";
import { toast } from "sonner";
import { UserLangEnum } from "@/lib/model";
import { useUserContextV2 } from "@/user-provider";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";

type ListHistoryFn = () => Promise<number[]>;
type GetHistoryFn = (ts: number) => Promise<unknown>;
type RestoreHistoryFn = (ts: number) => Promise<unknown>;

const MainToolbarContent = React.memo(
  ({
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

        <ToolbarSeparator />

        {isMobile && (
          <ToolbarGroup>
            <ImageUploadButton />
            <VideoUploadButton />
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
              <VideoUploadButton />
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
      TOCExtensionV2.configure({
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
  onClose,
  onSave,
  onDrop,
  listHistory,
  getHistory,
  restoreHistory,
}: {
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
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!editor) return null;

  return (
    <div
      ref={scrollRef}
      className="dashboard-editor h-full w-full overflow-auto"
    >
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
  Image,
  Typography,
  Superscript,
  Subscript,
  EmojiExtension,
  VideoExtension,
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
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    save: "保存",
    drop: "取消更改",
    outOfSync: "🔄 文档内容有更新！",
    uploadFailed: "上传失败",
    success: "文档保存成功",
    dropSuccess: "文档已还原",
  },
  [UserLangEnum.ENUS]: {
    save: "Save",
    drop: "Drop",
    outOfSync: "🔄 Draft content is out of sync!",
    uploadFailed: "Upload failed",
    success: "Draft saved successfully",
    dropSuccess: "Draft dropped successfully",
  },
};
