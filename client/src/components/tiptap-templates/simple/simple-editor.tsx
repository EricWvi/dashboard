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
import {
  TOCExtension,
  TableOfContents,
} from "@/components/tiptap-node/toc-node";
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
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle";
import { HistoryPopover } from "@/components/tiptap-templates/simple/history-popover";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";

// --- Context ---
import { useTTContext } from "@/components/editor";
import {
  syncDraft,
  invalidateDraftQuery,
  removeDraftQuery,
  useDraft,
} from "@/hooks/use-draft";
import { useEffect, useRef } from "react";
import { Eraser, Save } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

const MainToolbarContent = ({
  editor,
  onHighlighterClick,
  onLinkClick,
  isMobile,
  onSave,
  dropChange,
  id,
}: {
  editor: Editor;
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
  onSave: () => void;
  dropChange: () => void;
  id: number;
}) => {
  const { language } = useUserContext();
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
        <HistoryPopover id={id} editor={editor} />
        <ThemeToggle />
      </ToolbarGroup>
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
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
);

export function SimpleEditor({
  draft,
  ts,
  showToast,
  removeCache,
  onClose,
}: {
  draft: any;
  ts: number;
  showToast: boolean;
  removeCache: boolean;
  onClose: (e: Editor, changed: boolean) => void;
}) {
  const { language } = useUserContext();
  const { id, setId, setOpen } = useTTContext();
  const isChanged = useRef(false);
  const isDirtyRef = useRef(false);
  const prevTs = useRef(ts);

  const handleOutOfSync = () => {
    isDirtyRef.current = false;
    invalidateDraftQuery(id);
    alert(i18nText[language].outOfSync);
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main");
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
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
    content: draft,
    onUpdate: () => {
      isDirtyRef.current = true;
      isChanged.current = true;
    },
  });

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  useEffect(() => {
    if (editor) {
      // sync every 5 seconds
      const interval = setInterval(() => {
        if (isDirtyRef.current) {
          const currTs = Date.now();
          syncDraft({
            id,
            content: editor.getJSON(),
            prev: prevTs.current,
            curr: currTs,
          })
            .then(() => {
              isDirtyRef.current = false;
              prevTs.current = currTs;
            })
            .catch(handleOutOfSync);
        }
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [editor]);

  // warning before reload or leave page
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      // Cancel the event as permitted by the standard
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [editor]);

  const handleSave = async () => {
    if (editor) {
      isDirtyRef.current = false;
      if (isChanged.current) {
        syncDraft({
          id,
          content: editor.getJSON(),
          prev: -1,
          curr: Date.now(),
        }).then(() => {
          if (showToast) toast.success(i18nText[language].success);
          setId(0);
          setOpen(false);
          if (removeCache) {
            removeDraftQuery(id);
          } else {
            invalidateDraftQuery(id);
          }
          onClose(editor, true);
        });
      } else {
        setId(0);
        setOpen(false);
        if (removeCache) {
          removeDraftQuery(id);
        }
        onClose(editor, false);
      }
    }
  };

  const handleDrop = async () => {
    if (editor) {
      isDirtyRef.current = false;
      syncDraft({
        id,
        content: draft,
        prev: -1,
        curr: Date.now(),
      }).then(() => {
        if (showToast) toast.success(i18nText[language].dropSuccess);
        setId(0);
        setOpen(false);
        if (removeCache) {
          removeDraftQuery(id);
        } else {
          invalidateDraftQuery(id);
        }
        onClose(editor, false);
      });
    }
  };

  return (
    editor && (
      <div
        ref={scrollRef}
        className="dashboard-editor h-full w-full overflow-auto"
      >
        <div className="simple-editor-wrapper">
          <EditorContext.Provider value={{ editor }}>
            <Toolbar ref={toolbarRef}>
              {mobileView === "main" ? (
                <MainToolbarContent
                  editor={editor}
                  onHighlighterClick={() => setMobileView("highlighter")}
                  onLinkClick={() => setMobileView("link")}
                  isMobile={isMobile}
                  onSave={handleSave}
                  dropChange={handleDrop}
                  id={id}
                />
              ) : (
                <MobileToolbarContent
                  type={mobileView === "highlighter" ? "highlighter" : "link"}
                  onBack={() => setMobileView("main")}
                />
              )}
            </Toolbar>

            <EditorContent
              editor={editor}
              role="presentation"
              className="simple-editor-content"
            />

            {/* Table of Contents - only show on desktop */}
            <div className="hidden xl:block">
              <TableOfContents editor={editor} scrollRef={scrollRef} />
            </div>
          </EditorContext.Provider>
        </div>
      </div>
    )
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
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
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
      <div className="hidden">
        {/* tiptap dark mode style depends on explicit `dark` class */}
        <ThemeToggle />
      </div>
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

export function ContentRender({ id }: { id: number }) {
  const isMobile = useIsMobile();
  const { data: draft, isFetching } = useDraft(id);
  const [showLoading, setShowLoading] = React.useState(true);
  useEffect(() => {
    if (!isFetching) {
      setTimeout(() => {
        setShowLoading(false);
      }, 200);
    } else {
      setShowLoading(true);
    }
  }, [isFetching]);

  // do not keep draft in cache
  useEffect(() => {
    return () => {
      removeDraftQuery(id);
    };
  }, []);

  return (
    <div
      className={`overflow-scroll ${isMobile ? "h-[70vh] max-h-[70vh]" : "h-[80vh] max-h-[80vh] w-full px-4"}`}
    >
      {showLoading ? (
        <div className="mx-auto mt-6 max-w-[870px] space-y-4">
          <Skeleton className="h-8 w-40 rounded-sm" />
          <Skeleton className="h-[30vh] rounded-sm" />
          <Skeleton className="h-8 w-30 rounded-sm" />
          <Skeleton className="h-[30vh] rounded-sm" />
        </div>
      ) : (
        <ReadOnlyTiptap draft={draft?.content} />
      )}
    </div>
  );
}

export function ContentHTML({
  id,
  removeCache = true,
}: {
  id: number;
  removeCache?: boolean;
}) {
  const { data: draft, isFetching } = useDraft(id);

  // do not keep draft in cache
  useEffect(() => {
    return () => {
      if (removeCache) removeDraftQuery(id);
    };
  }, []);

  if (isFetching) return null;
  return (
    <div className="w-full">
      <ReadOnlyTiptap draft={draft?.content} style="padding: 0 0 12px" />
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
