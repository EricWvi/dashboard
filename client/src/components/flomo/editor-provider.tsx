import { useAppState } from "@/hooks/flomo/use-app-state";
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
    getCurrentInstance,
    saveInstance,
    instanceMap,
    setInitialContent,
  } = useAppState();

  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);

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
      setInitialContent(draftId, contentJSON);
    } finally {
      setLoadingDraftId(null);
    }
  };

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

  return null;
};
