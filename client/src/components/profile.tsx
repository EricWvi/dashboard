import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  invalidMailCount,
  invalidRSSCount,
  useMailCount,
  UserLangEnum,
  useRSSCount,
  useUpdateEmailToken,
  useUpdateProfile,
  useUpdateRssToken,
} from "@/hooks/use-user";
import { useRef, useState } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { Plus, X } from "lucide-react";
import { fileUpload } from "@/lib/file-upload";
import { formatMediaUrl } from "@/lib/utils";
import { useUserContext } from "@/user-provider";
import { LanguageSwitch } from "./language-switch";

export const Profile = () => {
  const { user, language } = useUserContext();
  const [openDropdown, setOpenDropdown] = useState(false);
  // edit rss token
  const [rssTokenDialogOpen, setRssTokenDialogOpen] = useState(false);
  const [rssToken, setRssToken] = useState("");
  const handleRssTokenDialogOpen = () => {
    setRssToken("");
    setRssTokenDialogOpen(true);
  };
  const updateRssTokenMutation = useUpdateRssToken();
  const updateRssToken = () => {
    return updateRssTokenMutation.mutateAsync({ rssToken: rssToken.trim() });
  };
  // edit email token
  const [emailTokenDialogOpen, setEmailTokenDialogOpen] = useState(false);
  const [emailToken, setEmailToken] = useState("");
  const [emailFeed, setEmailFeed] = useState("");
  const handleEmailTokenDialogOpen = () => {
    setEmailFeed(user.emailFeed.split("@")[0]);
    setEmailToken("");
    setEmailTokenDialogOpen(true);
  };
  const updateEmailTokenMutation = useUpdateEmailToken();
  const updateEmailToken = () => {
    return updateEmailTokenMutation.mutateAsync({
      emailToken: emailToken.trim(),
      emailFeed: emailFeed.trim() + "@qq.com",
    });
  };
  // edit profile
  const updateProfileMutation = useUpdateProfile();
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [userLang, setUserLang] = useState(UserLangEnum.ZHCN);
  const [avatar, setAvatar] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
  const handleEditProfileDialogOpen = () => {
    setUsername(user.username);
    setAvatar(user.avatar);
    setUserLang(user.language);
    setEditProfileDialogOpen(true);
  };
  const updateProfile = () => {
    return updateProfileMutation.mutateAsync({
      avatar: avatar.trim(),
      username: username.trim(),
      language: userLang,
    });
  };

  return (
    <div className="size-full space-y-8 pt-10">
      <div className="flex flex-row items-center justify-center gap-10 xl:flex-col xl:gap-4">
        <div className="flex w-full flex-col items-center justify-center">
          {/* avatar */}
          <div className="group relative mx-auto mb-6 aspect-square h-auto w-30 xl:w-1/2">
            <Avatar
              className="border-border size-full border-2 shadow-md"
              onClick={() => {
                setOpenDropdown(true);
                setTimeout(() => {
                  setOpenDropdown(false);
                }, 3000);
              }}
            >
              <AvatarImage src={user.avatar} />
              <AvatarFallback />
            </Avatar>

            <DropdownMenu open={openDropdown} onOpenChange={setOpenDropdown}>
              <DropdownMenuTrigger asChild>
                <div
                  className={`${openDropdown ? "" : "opacity-0"} bg-accent border-border absolute right-[18%] bottom-[18%] size-10 translate-1/2 cursor-pointer rounded-full border group-hover:opacity-100`}
                >
                  <div className="flex size-full items-center justify-center">
                    <div className="mt-[2px] text-2xl leading-none">⚙️</div>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem onClick={handleEditProfileDialogOpen}>
                  {i18nText[language].editProfile}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleRssTokenDialogOpen}>
                  {i18nText[language].minifluxToken}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleEmailTokenDialogOpen}>
                  {i18nText[language].qqMailToken}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <div className="text-muted-foreground">{__APP_VERSION__}</div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* greeting */}
          <div>
            <span
              className="mr-3 text-[44px] font-bold"
              style={{ fontFamily: "Allura" }}
            >
              Hi,
            </span>
            <span
              className="text-4xl font-semibold"
              style={{ fontFamily: "CormorantGaramond" }}
            >
              {user.username}
            </span>
          </div>
        </div>
        <div className="inline-grid grid-cols-4 gap-4">
          <JournalSheet />
          <QQMailSheet
            onClick={(e) => {
              if (!user.hasEmailToken) {
                e.stopPropagation();
                handleEmailTokenDialogOpen();
              }
            }}
          />
          <MinifluxSheet
            onClick={(e) => {
              if (!user.hasRssToken) {
                e.stopPropagation();
                handleRssTokenDialogOpen();
              }
            }}
          />
          <BeaverSheet />
        </div>
      </div>

      {/* update rss token dialog */}
      <Dialog open={rssTokenDialogOpen} onOpenChange={setRssTokenDialogOpen}>
        <DialogContent className="gap-1 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].updateMinifluxToken}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Input
                id="update-miniflux-token"
                type="password"
                placeholder="••••••••••••••••••••"
                value={rssToken}
                disabled={updateRssTokenMutation.isPending}
                onChange={(e) => setRssToken(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setRssTokenDialogOpen(false)}
              >
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  updateRssToken().then(() => setRssTokenDialogOpen(false));
                }}
                disabled={updateRssTokenMutation.isPending}
              >
                {i18nText[language].update}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* update email token dialog */}
      <Dialog
        open={emailTokenDialogOpen}
        onOpenChange={setEmailTokenDialogOpen}
      >
        <DialogContent className="gap-1 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].updateQQMailToken}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="update-qqmail-address">
                {i18nText[language].address}
              </Label>
              <div className="flex">
                <Input
                  id="update-qqmail-address"
                  placeholder="QQ Mail address..."
                  className="rounded-r-none"
                  value={emailFeed}
                  disabled={updateEmailTokenMutation.isPending}
                  onChange={(e) => setEmailFeed(e.target.value)}
                />
                <div className="border-input flex items-center rounded-r-md border border-l-0 px-4">
                  @qq.com
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="update-qqmail-token">
                {i18nText[language].token}
              </Label>
              <Input
                id="update-qqmail-token"
                type="password"
                placeholder="••••••••••••••••••••"
                value={emailToken}
                disabled={updateEmailTokenMutation.isPending}
                onChange={(e) => setEmailToken(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEmailTokenDialogOpen(false)}
              >
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  updateEmailToken().then(() => setEmailTokenDialogOpen(false));
                }}
                disabled={updateEmailTokenMutation.isPending}
              >
                {i18nText[language].update}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* edit profile dialog */}
      <Dialog
        open={editProfileDialogOpen}
        onOpenChange={setEditProfileDialogOpen}
      >
        <DialogContent className="gap-1 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].editProfile}</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <div className="flex items-end justify-between gap-6">
              <div className="mb-[2px] flex flex-1 flex-col gap-2">
                <Label htmlFor="edit-profile-username">
                  {i18nText[language].username}
                </Label>
                <Input
                  id="edit-profile-username"
                  value={username}
                  disabled={updateProfileMutation.isPending}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <LanguageSwitch
                defaultLanguage={userLang}
                onLanguageChange={setUserLang}
              />
            </div>

            <div className="relative aspect-[2/1]">
              {avatar ? (
                <>
                  <img
                    src={avatar}
                    alt={username}
                    className="mx-auto aspect-square h-full rounded-full object-cover"
                  />
                  <Button
                    variant="secondary"
                    className="absolute top-1 right-1"
                    onClick={() => setAvatar("")}
                  >
                    <X />
                  </Button>
                </>
              ) : (
                <div className="flex size-full items-center justify-center">
                  <Button
                    variant="outline"
                    className="aspect-square h-full rounded-full border-2 border-dashed"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                  >
                    <Plus className="text-muted-foreground size-8" />
                    <Input
                      id="update-profile-avatar"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditProfileDialogOpen(false)}
              >
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={() => {
                  updateProfile().then(() => setEditProfileDialogOpen(false));
                }}
                disabled={updateProfileMutation.isPending}
              >
                {i18nText[language].update}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const JournalSheet = () => (
  <Sheet>
    <SheetTrigger>
      <div className="size-12 cursor-pointer">
        <img src="/brands/journal.png"></img>
      </div>
    </SheetTrigger>
    <SheetContent
      side="left"
      style={{
        maxWidth: "1000px",
        width: window.innerHeight * (390 / 844) + "px",
      }}
    >
      <VisuallyHidden>
        <SheetHeader>
          <SheetTitle></SheetTitle>
          <SheetDescription></SheetDescription>
        </SheetHeader>
      </VisuallyHidden>
      <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <iframe
          src={"https://journal.onlyquant.top/"}
          title={"Journal"}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          allowFullScreen
        />
      </div>
    </SheetContent>
  </Sheet>
);

const BeaverSheet = () => (
  <Sheet>
    <SheetTrigger>
      <div className="border-border size-12 cursor-pointer overflow-hidden rounded-lg border shadow-md">
        <img src="/brands/beaver.png" alt="Beaver" />
      </div>
    </SheetTrigger>
    <SheetContent
      side="left"
      style={{
        maxWidth: "1000px",
        width: window.innerHeight * (390 / 844) + "px",
      }}
    >
      <VisuallyHidden>
        <SheetHeader>
          <SheetTitle></SheetTitle>
          <SheetDescription></SheetDescription>
        </SheetHeader>
      </VisuallyHidden>
      <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
        <iframe
          src={"https://beaver.onlyquant.top/"}
          title={"Beaver"}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          allowFullScreen
        />
      </div>
    </SheetContent>
  </Sheet>
);

const MinifluxSheet = (props: React.ComponentProps<"div">) => {
  const { data: rssCount } = useRSSCount();
  const [updateTime, setUpdateTime] = useState(Date.now());
  usePageVisibility(() => {
    if (Date.now() - updateTime > 10 * 60 * 1000) {
      setUpdateTime(Date.now());
      invalidRSSCount();
    }
  });

  return (
    <Sheet
      onOpenChange={(isOpen: boolean) => {
        if (!isOpen) invalidRSSCount();
      }}
    >
      <SheetTrigger className="relative">
        <div className="relative size-12">
          <div
            className="size-full cursor-pointer overflow-hidden rounded-lg border shadow-md"
            {...props}
          >
            <img src="/brands/miniflux.png"></img>
          </div>
          {!!rssCount && (
            <div className="bg-destructive absolute top-0 right-0 z-20 flex size-5 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full text-sm text-white">
              {rssCount}
            </div>
          )}
        </div>
      </SheetTrigger>
      <SheetContent
        side="left"
        style={{
          maxWidth: "1000px",
          width: window.innerHeight * (390 / 844) + "px",
        }}
      >
        <VisuallyHidden>
          <SheetHeader>
            <SheetTitle></SheetTitle>
            <SheetDescription></SheetDescription>
          </SheetHeader>
        </VisuallyHidden>
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <iframe
            src={"https://miniflux.onlyquant.top/"}
            title={"Miniflux"}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
            allowFullScreen
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

const QQMailSheet = (props: React.ComponentProps<"div">) => {
  const { data: mailCount } = useMailCount();
  const [updateTime, setUpdateTime] = useState(Date.now());
  usePageVisibility(() => {
    if (Date.now() - updateTime > 10 * 60 * 1000) {
      setUpdateTime(Date.now());
      invalidMailCount();
    }
  });

  return (
    <div
      className="relative size-12"
      onClick={() => {
        window.open("https://wx.mail.qq.com/", "_blank");
        setUpdateTime(Date.now() - 8 * 60 * 1000);
      }}
    >
      <div className="size-full cursor-pointer" {...props}>
        <img src="/brands/qqmail.png" alt="QQ Mail" />
      </div>
      {!!mailCount && (
        <div className="bg-destructive absolute top-0 right-0 z-20 flex size-5 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full text-sm text-white">
          {mailCount}
        </div>
      )}
    </div>
  );
};

const i18nText = {
  [UserLangEnum.ZHCN]: {
    editProfile: "个人信息",
    minifluxToken: "Miniflux Token",
    updateMinifluxToken: "更新 Miniflux Token",
    updateQQMailToken: "更新 QQ 邮箱 Token",
    address: "地址",
    token: "Token",
    qqMailToken: "QQ 邮箱 Token",
    username: "用户名",
    update: "更新",
    cancel: "取消",
  },
  [UserLangEnum.ENUS]: {
    editProfile: "Edit Profile",
    minifluxToken: "Set Miniflux Token",
    updateMinifluxToken: "Update Miniflux Token",
    updateQQMailToken: "Update QQMail Token",
    qqMailToken: "Set QQMail Token",
    address: "Address",
    token: "Token",
    username: "Username",
    update: "Update",
    cancel: "Cancel",
  },
};
