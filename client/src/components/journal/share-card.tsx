import { ContentHTML } from "@/components/tiptap-templates/simple/simple-editor";
import { useEffect, useRef, useState } from "react";
import { useUserContext } from "@/user-provider";
import { UserLangEnum } from "@/hooks/use-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toPng } from "html-to-image";
import type { EntryMeta } from "@/hooks/use-entries";

function download(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = dataUrl;
  link.click();
}

export default function ShareCard({
  meta,
  onClose,
}: {
  meta: EntryMeta;
  onClose: () => void;
}) {
  const { user } = useUserContext();
  const entryCardRef = useRef<HTMLDivElement | null>(null);
  const avatarImageRef = useRef<HTMLImageElement | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  useEffect(() => {
    // Auto-generate PNG when component mounts and avatar is loaded
    if (entryCardRef.current && !isGenerating && avatarLoaded) {
      setIsGenerating(true);
      // Wait a bit for all images to load
      setTimeout(() => {
        toPng(entryCardRef.current as HTMLElement, {
          cacheBust: true,
          quality: 1,
          pixelRatio: 3,
          filter: (node) => {
            // Filter out ProseMirror separator and trailing break elements
            if (
              node instanceof HTMLImageElement &&
              node.classList.contains("ProseMirror-separator")
            ) {
              return false;
            }
            return true;
          },
        })
          .then((dataUrl) => {
            download(dataUrl, "journal-" + meta.id);
            // Close dialog after download
            setTimeout(() => onClose(), 300);
          })
          .catch((err) => {
            console.error("saveCardPng went wrong!", err);
            setIsGenerating(false);
          });
      }, 200);
    }
  }, [meta.id, isGenerating, avatarLoaded]);

  return (
    <div className="fixed top-0 left-[-9999px]">
      <div
        ref={entryCardRef}
        className="relative w-[480px] overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 px-8 pt-8 pb-16"
      >
        {/* Decorative elements */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-gradient-to-tr from-rose-100 to-pink-100 blur-3xl" />
        </div>

        {/* Main content card */}
        <div className="relative rounded-2xl bg-white/90 p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-5">
            <Avatar className="size-16 border-2 border-white shadow-lg">
              <AvatarImage
                ref={avatarImageRef}
                src={user.avatar}
                onLoad={() => setAvatarLoaded(true)}
                onError={() => setAvatarLoaded(true)}
              />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-rose-400 text-white" />
            </Avatar>

            <div className="flex flex-col gap-1">
              <div className="text-2xl font-semibold text-gray-900">
                {user.username}
              </div>
              <div className="text-base text-gray-600">
                {new Date(
                  meta.year,
                  meta.month - 1,
                  meta.day,
                ).toLocaleDateString(UserLangEnum.ZHCN, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>

          <div className="mt-8 text-lg leading-relaxed text-gray-900">
            <ContentHTML id={meta.draft} removeCache={false} />
          </div>
        </div>

        {/* journal badge */}
        <div className="absolute right-8 bottom-5">
          <div className="mt-6 w-fit rounded-4xl bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-1 text-sm font-bold text-white shadow-lg">
            Journal
          </div>
        </div>
      </div>
    </div>
  );
}
