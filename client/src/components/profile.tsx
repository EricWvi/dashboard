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
  useRSSCount,
  useUpdateEmailToken,
  useUpdateProfile,
  useUpdateRssToken,
  useUser,
} from "@/hooks/use-user";
import { useEffect, useRef, useState } from "react";
import { usePageVisibility } from "@/hooks/use-page-visibility";
import { Plus, X } from "lucide-react";
import { fileUpload } from "@/lib/file-upload";
import { formatMediaUrl } from "@/lib/utils";

export const Profile = () => {
  const { data: userInfo } = useUser();
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
    setEmailFeed(userInfo?.emailFeed.split("@")[0] || "");
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
    setUsername(userInfo?.username || "");
    setAvatar(userInfo?.avatar || "");
    setEditProfileDialogOpen(true);
  };
  const updateProfile = () => {
    return updateProfileMutation.mutateAsync({
      avatar: avatar.trim(),
      username: username.trim(),
    });
  };

  return (
    <div className="size-full space-y-8 pt-10">
      <div className="flex flex-row items-center justify-center gap-10 xl:flex-col xl:gap-4">
        <div className="flex w-full flex-col items-center justify-center">
          {/* avatar */}
          <div className="group relative mx-auto mb-6 aspect-square h-auto w-30 xl:w-1/2">
            <Avatar className="border-border size-full border-2 shadow-md">
              <AvatarImage src={userInfo?.avatar} />
              <AvatarFallback />
            </Avatar>
            <div
              className={`${openDropdown ? "" : "opacity-0"} bg-accent border-border absolute right-[18%] bottom-[18%] size-10 translate-1/2 cursor-pointer rounded-full border group-hover:opacity-100`}
            >
              <div
                className="flex size-full items-center justify-center"
                onClick={() => {}}
              >
                <DropdownMenu
                  open={openDropdown}
                  onOpenChange={setOpenDropdown}
                >
                  <DropdownMenuTrigger asChild>
                    <div className="mt-[2px] text-2xl leading-none">⚙️</div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem onClick={handleEditProfileDialogOpen}>
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleRssTokenDialogOpen}>
                      Set Miniflux Token
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleEmailTokenDialogOpen}>
                      Set QQMail Token
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => {}}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
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
              {userInfo?.username}
            </span>
          </div>
        </div>
        <div className="inline-grid grid-cols-4 gap-4">
          <JournalSheet />
          <QQMailSheet
            onClick={(e) => {
              if (!userInfo?.hasEmailToken) {
                e.stopPropagation();
                handleEmailTokenDialogOpen();
              }
            }}
          />
          <MinifluxSheet
            onClick={(e) => {
              if (!userInfo?.hasRssToken) {
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
            <DialogTitle>Update Miniflux Token</DialogTitle>
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
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateRssToken().then(() => setRssTokenDialogOpen(false));
                }}
                disabled={updateRssTokenMutation.isPending}
              >
                Update
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
            <DialogTitle>Update QQMail Token</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="update-qqmail-address">Address</Label>
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
              <Label htmlFor="update-qqmail-token">Token</Label>
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
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateEmailToken().then(() => setEmailTokenDialogOpen(false));
                }}
                disabled={updateEmailTokenMutation.isPending}
              >
                Update
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
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div className="space-y-8">
            <div className="flex flex-col gap-2">
              <Label htmlFor="edit-profile-username">Username</Label>
              <Input
                id="edit-profile-username"
                value={username}
                disabled={updateProfileMutation.isPending}
                onChange={(e) => setUsername(e.target.value)}
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
                Cancel
              </Button>
              <Button
                onClick={() => {
                  updateProfile().then(() => setEditProfileDialogOpen(false));
                }}
                disabled={updateProfileMutation.isPending}
              >
                Update
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
  const [countNumber, setCountNumber] = useState(0);
  useEffect(() => {
    if (rssCount) {
      setCountNumber(rssCount);
    }
  }, [rssCount]);
  const [updateTime, setUpdateTime] = useState(Date.now());
  usePageVisibility(() => {
    if (Date.now() - updateTime > 10 * 60 * 1000) {
      setUpdateTime(Date.now());
      invalidRSSCount();
    }
  });

  return (
    <Sheet>
      <SheetTrigger className="relative">
        <div className="relative size-12" onClick={() => setCountNumber(0)}>
          <div
            className="size-full cursor-pointer overflow-hidden rounded-lg border shadow-md"
            {...props}
          >
            <img src="/brands/miniflux.png"></img>
          </div>
          {countNumber !== 0 && (
            <div className="bg-destructive absolute top-0 right-0 z-20 flex size-5 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full text-sm text-white">
              {countNumber}
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
  const [countNumber, setCountNumber] = useState(0);
  useEffect(() => {
    if (mailCount) {
      setCountNumber(mailCount);
    }
  }, [mailCount]);
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
        setCountNumber(0);
      }}
    >
      <div className="size-full cursor-pointer" {...props}>
        <img src="/brands/qqmail.png" alt="QQ Mail" />
      </div>
      {countNumber !== 0 && (
        <div className="bg-destructive absolute top-0 right-0 z-20 flex size-5 translate-x-1/3 -translate-y-1/3 items-center justify-center rounded-full text-sm text-white">
          {countNumber}
        </div>
      )}
    </div>
  );
};
