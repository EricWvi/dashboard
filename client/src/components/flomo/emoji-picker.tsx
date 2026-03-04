import { useState } from "react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUserContextV2 } from "@/user-provider";
import { UserLangEnum } from "@/lib/model";

interface CardHeaderProps {
  children: React.ReactNode;
  onSelectEmoji: (emoji: string) => Promise<void>;
}

export function EmojiPicker({ children, onSelectEmoji }: CardHeaderProps) {
  const { language } = useUserContextV2();
  const [open, setOpen] = useState(false);

  const handleEmojiSelect = (emojiData: any) => {
    onSelectEmoji(emojiData.native).then(() => {
      setOpen(false);
    });
  };

  return (
    <>
      {/* Overlay to prevent clicks from passing through when picker is open */}
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
          {children}
        </PopoverTrigger>

        {/* 选择器容器：注意 w-auto 确保不被 Popover 默认宽度限制 */}
        <PopoverContent
          className="w-auto border-none p-0 shadow-2xl"
          align="start"
          onClick={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()} // 修复在移动设备上无法滚动的问题
        >
          <Picker
            data={data}
            onEmojiSelect={handleEmojiSelect}
            theme="auto"
            locale={language === UserLangEnum.ZHCN ? "zh" : "en"}
            previewPosition="none"
            skinTonePosition="none"
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
