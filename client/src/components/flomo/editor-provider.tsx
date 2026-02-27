import { useAppState } from "@/hooks/flomo/use-app-state";
import { Editor, EditorContext } from "@tiptap/react";
import { useSimpleEditor } from "@/components/tiptap-editor/simple-editor";
import { useEffect, useRef, useState } from "react";
import { debounce } from "lodash";
import { syncDraft, getContent } from "@/hooks/flomo/use-tiptapv2";

export function TiptapProvider({ children }: { children: React.ReactNode }) {
  const draftIdRef = useRef<string | null>(null);

  const editor = useSimpleEditor(
    debounce((props: { editor: Editor }) => {
      if (draftIdRef.current) {
        syncDraft({
          id: draftIdRef.current,
          content: props.editor.getJSON(),
        });
      }
    }, 500),
  );

  return (
    <>
      <EditorState draftIdRef={draftIdRef} editor={editor} />
      <EditorContext.Provider value={{ editor }}>
        {children}
      </EditorContext.Provider>
    </>
  );
}

const EditorState = ({
  draftIdRef,
  editor,
}: {
  draftIdRef: React.RefObject<string | null>;
  editor: Editor;
}) => {
  const { activeTabId, getCurrentInstance, saveInstance, openTabs } =
    useAppState();
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);

  // Load draft content from IndexedDB
  const loadDraftContent = async (draftId: string) => {
    if (loadingDraftId === draftId) return; // Prevent duplicate loads
    setLoadingDraftId(draftId);
    try {
      const draft = await getContent(draftId);
      if (draft) {
        editor.commands.setContent(draft.content);
      } else {
        editor.commands.setContent({ type: "doc", content: [] });
      }
    } finally {
      setLoadingDraftId(null);
    }
  };

  // Handle tab switching
  useEffect(() => {
    if (draftIdRef.current && draftIdRef.current !== activeTabId) {
      saveInstance(draftIdRef.current, editor.state);
    }
    draftIdRef.current = activeTabId;
    if (activeTabId) {
      const instance = getCurrentInstance();
      if (instance) {
        // Use cached EditorState
        editor.view.updateState(instance);
      } else {
        // No cached instance - load from IndexedDB
        loadDraftContent(activeTabId);
      }
    }
  }, [activeTabId]);

  // Handle active tab sync refresh (immediate update)
  useEffect(() => {
    const tab = openTabs.find((t) => t.draftId === activeTabId);
    if (
      activeTabId &&
      tab &&
      tab.instance === null &&
      draftIdRef.current === activeTabId
    ) {
      // Active tab was invalidated - reload content
      loadDraftContent(activeTabId);
    }
  }, [activeTabId, openTabs]);

  return null;
};
