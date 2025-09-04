import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  UserLangEnum,
  useSignUp,
  useUpdateLanguage,
  type UserLang,
} from "@/hooks/use-user";
import { fileUpload } from "@/lib/file-upload";
import { formatMediaUrl } from "@/lib/utils";
import { useUserContext } from "@/user-provider";
import { ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LanguageSwitch } from "@/components/language-switch";

export default function SignUp() {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState("");
  const signUpMutation = useSignUp();
  const changeLangMutation = useUpdateLanguage();

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    fileUpload({
      event,
      onProgress: () => {},
      onSuccess: (response) => {
        setAvatar(formatMediaUrl(JSON.parse(response).photos[0]));
      },
    });
  };

  const signUp = async () => {
    if (!inputRef.current?.textContent) {
      toast.error("Please enter a username");
    } else {
      signUpMutation.mutateAsync({
        avatar,
        username: inputRef.current?.textContent,
      });
    }
  };

  const changeLang = (language: UserLang) => {
    changeLangMutation.mutateAsync({ language });
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <div className="flex size-full flex-col">
      <div className="fixed top-4 right-4">
        <LanguageSwitch
          defaultLanguage={language}
          onLanguageChange={changeLang}
        />
      </div>

      <div
        className={`flex min-h-0 flex-1/1 items-center justify-center ${isMobile ? "flex-col gap-4" : "flex-row gap-16"}`}
      >
        <Avatar
          className={`${isMobile ? "size-26" : "size-36"}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <AvatarImage src={avatar} />
          <AvatarFallback>
            <ImagePlus className="text-muted-foreground size-12" />
          </AvatarFallback>
          <input
            id="sign-up-avatar-img"
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
        </Avatar>
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="relative pr-20 pb-10 text-5xl font-medium">
            <span
              className="mr-4 font-semibold"
              style={{ fontFamily: "Allura" }}
            >
              Hey,
            </span>
            👋
            <div
              className="absolute bottom-0 left-10 flex text-2xl font-semibold"
              style={{ fontFamily: "CormorantGaramond" }}
            >
              <span className="mr-1 whitespace-nowrap">
                {i18nText[language].youAre}
              </span>
              <span
                ref={inputRef}
                contentEditable
                className="min-w-2 border-none whitespace-nowrap [caret-color:var(--tt-cursor-color)] outline-none"
              ></span>
              {i18nText[language].period}
            </div>
          </div>
          <Button
            variant="link"
            className="text-xl font-medium underline"
            onClick={signUp}
          >
            {i18nText[language].gotYou}
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1/3"></div>
    </div>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    youAre: "你是",
    period: "。",
    gotYou: "开始同步!",
  },
  [UserLangEnum.ENUS]: {
    youAre: "You are",
    period: ".",
    gotYou: "Got you!",
  },
};
