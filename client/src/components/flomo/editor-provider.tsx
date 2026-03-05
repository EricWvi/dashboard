import { useEditorState } from "@/hooks/use-editor-state";
import { Editor, EditorContext } from "@tiptap/react";
import { useSimpleEditor } from "@/components/tiptap-editor/simple-editor";
import { useEffect, useMemo, useRef, useState } from "react";
import { debounce, type DebouncedFunc } from "lodash";
import { syncDraft, getContent } from "@/hooks/flomo/use-tiptapv2";
import { EditorState as ProseMirrorState } from "prosemirror-state";

export function TiptapProvider({ children }: { children: React.ReactNode }) {
  const draftIdRef = useRef<string | null>(null);

  const debouncedSync = useMemo(
    () =>
      debounce((id: string, editorInstance: Editor) => {
        const content = editorInstance.getJSON();
        syncDraft({ id, content });
      }, 500),
    [],
  );

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
}: {
  draftIdRef: React.RefObject<string | null>;
  editor: Editor;
  debouncedSync: DebouncedFunc<(id: string, editorInstance: Editor) => void>;
}) => {
  const {
    activeTabId,
    openTabs,
    getTabEditable,
    getCurrentInstance,
    saveInstance,
    instanceMap,
    setInitialContent,
  } = useEditorState();

  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);
  const hasEditableTabsRef = useRef(false);

  // Load draft content from IndexedDB
  const loadDraftContent = async (draftId: string) => {
    if (loadingDraftId === draftId) return; // Prevent duplicate loads
    setLoadingDraftId(draftId);
    try {
      const draft = await getContent(draftId);
      const contentJSON = draft ? draft.content : { type: "doc", content: [] };
      const doc = editor.schema.nodeFromJSON(contentJSON);
      const newState = ProseMirrorState.create({
        schema: editor.schema,
        doc,
        plugins: editor.state.plugins,
      });
      editor.view.updateState(newState);
      editor.setEditable(getTabEditable(draftId));
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
    if (!activeTabId || draftIdRef.current === activeTabId) return;

    if (draftIdRef.current && draftIdRef.current !== activeTabId) {
      saveInstance(draftIdRef.current, editor.state);
    }
    draftIdRef.current = activeTabId;
    debouncedSync.flush(); // Immediately sync on tab switch to ensure latest content is saved
    const instance = getCurrentInstance();
    if (instance) {
      // Use cached EditorState, but ensure it's applied after the current render cycle
      setTimeout(() => {
        editor.view.updateState(instance);
        editor.setEditable(getTabEditable(activeTabId));
      }, 0);
    } else {
      // No cached instance - load from IndexedDB
      loadDraftContent(activeTabId!);
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
        editor.setEditable(getTabEditable(activeTabId));
      }
    }
    hasEditableTabsRef.current = openTabs.some((tab) => tab.editable);
  }, [activeTabId, openTabs]);

  return null;
};
