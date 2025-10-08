"use client";

import * as React from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { type Editor } from "@tiptap/react";

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { useIsMobile } from "@/hooks/use-mobile";

// --- Lib ---
import { isExtensionAvailable, handleVideoUpload } from "@/lib/tiptap-utils";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

// --- Icons ---
import { VideoIcon } from "lucide-react";
import { toast } from "sonner";

export const VIDEO_UPLOAD_SHORTCUT_KEY = "mod+shift+v";

/**
 * Configuration for the video upload functionality
 */
export interface UseVideoUploadConfig {
  /**
   * The Tiptap editor instance.
   */
  editor?: Editor | null;
  /**
   * Whether the button should hide when insertion is not available.
   * @default false
   */
  hideWhenUnavailable?: boolean;
  /**
   * Callback function called after a successful video insertion.
   */
  onInserted?: () => void;
}

/**
 * Checks if video can be inserted in the current editor state
 */
export function canInsertVideo(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  if (!isExtensionAvailable(editor, "video")) return false;

  return editor.can().insertContent({ type: "video" });
}

/**
 * Checks if video is currently active
 */
export function isVideoActive(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false;
  return editor.isActive("video");
}

/**
 * Handles video file selection and upload
 */
export function insertVideo(
  editor: Editor | null,
  onSuccess?: () => void,
): void {
  if (!editor || !editor.isEditable) return;
  if (!canInsertVideo(editor)) return;

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "video/*";

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const url = await handleVideoUpload(file, (_event) => {
        // You can add progress tracking here if needed
        // console.log(`Upload progress: ${event.progress}%`);
      });

      if (url) {
        editor
          .chain()
          .focus()
          .setVideo({
            src: url,
            controls: true,
          })
          .run();

        onSuccess?.();
      }
    } catch (error) {
      console.error("Video upload failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload video",
      );
    }
  };

  input.click();
}

/**
 * Determines if the video button should be shown
 */
export function shouldShowButton(props: {
  editor: Editor | null;
  hideWhenUnavailable: boolean;
}): boolean {
  const { editor, hideWhenUnavailable } = props;

  if (!editor || !editor.isEditable) return false;
  if (!isExtensionAvailable(editor, "video")) return false;

  if (hideWhenUnavailable && !editor.isActive("code")) {
    return canInsertVideo(editor);
  }

  return true;
}

/**
 * Custom hook that provides video upload functionality for Tiptap editor
 *
 * @example
 * ```tsx
 * // Simple usage - no params needed
 * function MySimpleVideoButton() {
 *   const { isVisible, handleVideo } = useVideoUpload()
 *
 *   if (!isVisible) return null
 *
 *   return <button onClick={handleVideo}>Add Video</button>
 * }
 *
 * // Advanced usage with configuration
 * function MyAdvancedVideoButton() {
 *   const { isVisible, handleVideo, label, isActive } = useVideoUpload({
 *     editor: myEditor,
 *     hideWhenUnavailable: true,
 *     onInserted: () => console.log('Video inserted!')
 *   })
 *
 *   if (!isVisible) return null
 *
 *   return (
 *     <MyButton
 *       onClick={handleVideo}
 *       aria-pressed={isActive}
 *       aria-label={label}
 *     >
 *       Add Video
 *     </MyButton>
 *   )
 * }
 * ```
 */
export function useVideoUpload(config?: UseVideoUploadConfig) {
  const { language } = useUserContext();
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
    onInserted,
  } = config || {};

  const { editor } = useTiptapEditor(providedEditor);
  const isMobile = useIsMobile();
  const [isVisible, setIsVisible] = React.useState<boolean>(true);
  const canInsert = canInsertVideo(editor);
  const isActive = isVideoActive(editor);

  React.useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      setIsVisible(shouldShowButton({ editor, hideWhenUnavailable }));
    };

    handleSelectionUpdate();

    editor.on("selectionUpdate", handleSelectionUpdate);

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, hideWhenUnavailable]);

  const handleVideo = React.useCallback(() => {
    if (!editor) return;
    insertVideo(editor, onInserted);
  }, [editor, onInserted]);

  useHotkeys(
    VIDEO_UPLOAD_SHORTCUT_KEY,
    (event) => {
      event.preventDefault();
      handleVideo();
    },
    {
      enabled: isVisible && canInsert,
      enableOnContentEditable: !isMobile,
      enableOnFormTags: true,
    },
  );

  return {
    isVisible,
    isActive,
    handleVideo,
    canInsert,
    label: i18nText[language].label,
    shortcutKeys: VIDEO_UPLOAD_SHORTCUT_KEY,
    Icon: VideoIcon,
  };
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    label: "添加视频",
  },
  [UserLangEnum.ENUS]: {
    label: "Add video",
  },
};
