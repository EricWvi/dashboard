import { useEditorState } from "@/hooks/use-editor-state";
import { Editor, EditorContext } from "@tiptap/react";
import { useSimpleEditor } from "@/components/tiptap-editor/simple-editor";
import { useEffect, useMemo, useRef, useState } from "react";
import { debounce, type DebouncedFunc } from "lodash";
import { EditorState as ProseMirrorState } from "prosemirror-state";
import type { TiptapV2 } from "@/lib/model";

export interface TiptapPersistence {
  syncDraft: (params: {
    id: string;
    content: Record<string, unknown>;
  }) => Promise<void>;
  getContent: (id: string) => Promise<TiptapV2 | undefined>;
}

interface TiptapProviderProps {
  children: React.ReactNode;
  persistence: TiptapPersistence;
}

export function TiptapProvider({ children, persistence }: TiptapProviderProps) {
  const draftIdRef = useRef<string | null>(null);

  const debouncedSync = useMemo(
    () =>
      // since we will call flush on tab switch, we can use a debounced function that accpets `id`,
      // and it will not cause problems that newer calls with different id will override the previous ones
      debounce((id: string, editorInstance: Editor) => {
        const content = editorInstance.getJSON();
        persistence.syncDraft({ id, content });
      }, 500),
    [persistence],
  );

  useEffect(() => {
    return () => {
      debouncedSync.cancel();
    };
  }, [debouncedSync]);

  const editor = useSimpleEditor(({ editor }) => {
    if (draftIdRef.current) {
      debouncedSync(draftIdRef.current, editor);
    }
  });

  return (
    <>
      <EditorTheme />
      <EditorState
        draftIdRef={draftIdRef}
        editor={editor}
        debouncedSync={debouncedSync}
        persistence={persistence}
      />
      <EditorContext.Provider value={{ editor }}>
        {children}
      </EditorContext.Provider>
    </>
  );
}

const EditorTheme = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => setIsDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const initialDarkMode =
      !!document.querySelector('meta[name="color-scheme"][content="dark"]') ||
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    setIsDarkMode(initialDarkMode);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  return null;
};

const EditorState = ({
  draftIdRef,
  editor,
  debouncedSync,
  persistence,
}: {
  draftIdRef: React.RefObject<string | null>;
  editor: Editor;
  debouncedSync: DebouncedFunc<(id: string, editorInstance: Editor) => void>;
  persistence: TiptapPersistence;
}) => {
  const {
    activeTabId,
    openTabs,
    getTabEditable,
    getCurrentInstance,
    saveInstance,
    instanceMap,
    setInitialContent,
    saveScrollPosition,
    getScrollPosition,
  } = useEditorState();

  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);
  const hasEditableTabsRef = useRef(false);

  const getScrollContainer = () =>
    document.getElementById("only-tt-scroll-container");

  const restoreScrollPosition = (tabId: string) => {
    requestAnimationFrame(() => {
      const el = getScrollContainer();
      if (el) el.scrollTop = getScrollPosition(tabId);
    });
  };

  // Load draft content from IndexedDB
  const loadDraftContent = async (draftId: string) => {
    if (loadingDraftId === draftId) return; // Prevent duplicate loads
    setLoadingDraftId(draftId);
    try {
      const draft = await persistence.getContent(draftId);
      const contentJSON = draft ? draft.content : { type: "doc", content: [] };
      const doc = editor.schema.nodeFromJSON(contentJSON);
      const newState = ProseMirrorState.create({
        schema: editor.schema,
        doc,
        plugins: editor.state.plugins,
      });
      editor.view.updateState(newState);
      // trigger a empty transaction to ensure decorations are updated based on the new state (e.g. for TOC)
      editor.view.dispatch(editor.state.tr);
      editor.setEditable(getTabEditable(draftId), false);
      setInitialContent(draftId, contentJSON);
    } finally {
      setLoadingDraftId(null);
    }
  };

  // warning before reload or leave page
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (hasEditableTabsRef.current) {
        // Cancel the event as permitted by the standard
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, []);

  // Handle tab switching
  useEffect(() => {
    if (draftIdRef.current === activeTabId) return;

    if (draftIdRef.current && draftIdRef.current !== activeTabId) {
      const el = getScrollContainer();
      if (el) saveScrollPosition(draftIdRef.current, el.scrollTop);
      saveInstance(draftIdRef.current, editor.state);
    }
    draftIdRef.current = activeTabId;
    debouncedSync.flush(); // Immediately sync on tab switch to ensure latest content is saved
    if (!activeTabId) return;

    const instance = getCurrentInstance();
    if (instance) {
      // Use cached EditorState, but ensure it's applied after the current render cycle
      setTimeout(() => {
        editor.view.updateState(instance);
        editor.setEditable(getTabEditable(activeTabId), false);
        restoreScrollPosition(activeTabId);
      }, 0);
    } else {
      // No cached instance - load from IndexedDB
      loadDraftContent(activeTabId!).then(() => {
        restoreScrollPosition(activeTabId);
      });
    }
  }, [activeTabId]);

  // Handle active tab sync refresh (immediate update)
  useEffect(() => {
    if (
      activeTabId &&
      draftIdRef.current === activeTabId &&
      !getCurrentInstance()
    ) {
      // Active tab was invalidated - reload content
      loadDraftContent(activeTabId);
    }
  }, [activeTabId, instanceMap]);

  // Handle editable state changes
  useEffect(() => {
    if (activeTabId && draftIdRef.current === activeTabId) {
      if (editor.isEditable !== getTabEditable(activeTabId)) {
        editor.setEditable(getTabEditable(activeTabId), false);
      }
    }
    hasEditableTabsRef.current = openTabs.some((tab) => tab.editable);
  }, [activeTabId, openTabs]);

  return null;
};
