import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSignUp } from "@/hooks/use-user";
import { fileUpload } from "@/lib/file-upload";
import { formatMediaUrl } from "@/lib/utils";
import { ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export default function SignUp() {
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatar, setAvatar] = useState("");
  const signUpMutation = useSignUp();

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

  useEffect(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  return (
    <div className="flex size-full flex-col">
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
              <span className="mr-1 whitespace-nowrap">You are</span>
              <span
                ref={inputRef}
                contentEditable
                className="min-w-2 border-none whitespace-nowrap [caret-color:var(--tt-cursor-color)] outline-none"
              ></span>
              .
            </div>
          </div>
          <Button
            variant="link"
            className="text-xl font-medium underline"
            onClick={signUp}
          >
            Got you!
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1/3"></div>
    </div>
  );
}
