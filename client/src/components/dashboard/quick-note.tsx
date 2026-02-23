import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Trash2,
  Plus,
  MoreHorizontal,
  Edit,
  NotepadText,
  CornerRightDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { dateString, stripeColor } from "@/lib/utils";
import {
  createTiptap,
  useBottomQuickNote,
  useCreateQuickNote,
  useDeleteQuickNote,
  useQuickNotes,
  useUpdateQuickNote,
} from "@/hooks/use-draft";
import { useTTContext } from "@/components/editor";
import { ContentRender } from "@/components/tiptap-templates/simple/simple-editor";
import { UserLangEnum } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

export const QuickNoteList = () => {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const [isComposing, setIsComposing] = useState(false);
  const { data: notes, isPending } = useQuickNotes();
  const [editTitleDialogOpen, setEditTitleDialogOpen] = useState(false);
  const updateQuickNoteMutation = useUpdateQuickNote();
  const bottomQuickNoteMutation = useBottomQuickNote();
  const createQuickNoteMutation = useCreateQuickNote();
  const deleteQuickNoteMutation = useDeleteQuickNote();
  const { setId: setEditorId, setOpen: setEditorDialogOpen } = useTTContext();

  const [noteName, setNoteName] = useState("");
  const [noteId, setNoteId] = useState(0);
  // confirm dialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleEditTitleDialogOpen = (note: { id: number; title: string }) => {
    setNoteName(note.title);
    setNoteId(note.id);
    setEditTitleDialogOpen(true);
  };

  const moveToBottom = async (id: number) => {
    bottomQuickNoteMutation.mutateAsync({ id });
  };

  const onRename = async () => {
    updateQuickNoteMutation
      .mutateAsync({
        id: noteId,
        title: noteName,
      })
      .then(() => {
        setEditTitleDialogOpen(false);
      });
  };

  const onCreate = async () => {
    const draftId = await createTiptap();
    createQuickNoteMutation.mutateAsync({
      title: dateString(new Date(), "-"),
      draft: draftId,
    });
    setEditorId(draftId);
    setEditorDialogOpen(true);
  };

  return (
    <Card className="max-w-4xl min-w-0 gap-1">
      <CardHeader>
        <CardTitle>
          <div className="flex justify-between">
            <div className="text-xl">{i18nText[language].quickNote}</div>
            <Button
              variant={"ghost"}
              size="icon"
              className="h-8 w-8 transition-transform hover:rotate-90"
              onClick={onCreate}
            >
              <Plus className="size-5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        {/* desktop fixed height, mobile full height */}
        <div
          className={`flex flex-col rounded-sm ${isMobile ? "min-h-20" : "h-120 overflow-scroll"}`}
        >
          {isPending ? (
            <>
              <div className="space-y-2">
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
                <Skeleton className="h-10 rounded-sm" />
              </div>
            </>
          ) : (
            !!notes &&
            (notes.length === 0 ? (
              <div className="text-muted-foreground flex min-h-0 w-full flex-1 flex-col">
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  {i18nText[language].noQuickNotes}
                </div>
                <div className="min-h-0 flex-1"></div>
              </div>
            ) : (
              <div className="min-h-0 w-full flex-1 space-y-1">
                {notes.map((note, idx) => (
                  <div
                    key={note.id}
                    className={`relative flex items-center justify-between gap-2 rounded-sm border py-2 pr-2 text-sm ${isMobile ? "pl-4" : "pl-6"}`}
                  >
                    <div
                      className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-sm ${stripeColor(0)}`}
                    />
                    {/* quick note title */}
                    <Dialog>
                      <DialogTrigger className="cursor-pointer truncate">
                        {note.title}
                      </DialogTrigger>
                      <DialogContent
                        className="w-[calc(100%-2rem)] !max-w-[800px] gap-0"
                        onOpenAutoFocus={(e) => {
                          e.preventDefault(); // stops Radix from focusing anything
                          (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
                        }}
                      >
                        <DialogHeader>
                          <DialogTitle>{note.title}</DialogTitle>
                          <DialogDescription></DialogDescription>
                        </DialogHeader>
                        <ContentRender id={note.draft} />
                      </DialogContent>
                    </Dialog>

                    {/* quick note menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="size-4 xl:size-6">
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditTitleDialogOpen(note)}
                        >
                          <Edit />
                          {i18nText[language].rename}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditorId(note.draft);
                            setEditorDialogOpen(true);
                          }}
                        >
                          <NotepadText />
                          {i18nText[language].editNote}
                        </DropdownMenuItem>
                        {idx !== notes.length - 1 && (
                          <DropdownMenuItem
                            onClick={() => moveToBottom(note.id)}
                          >
                            <CornerRightDown />
                            {i18nText[language].bottom}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => {
                            setNoteId(note.id);
                            setNoteName(note.title);
                            setConfirmDialogOpen(true);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="text-destructive" />
                          {i18nText[language].delete}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </CardContent>

      {/* Edit Quick Note Dialog */}
      <Dialog open={editTitleDialogOpen} onOpenChange={setEditTitleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{`${i18nText[language].rename} ${i18nText[language].quickNote}`}</DialogTitle>
            <DialogDescription>
              {i18nText[language].enterNewName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter new name..."
              value={noteName}
              disabled={updateQuickNoteMutation.isPending}
              onChange={(e) => setNoteName(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isComposing) {
                  onRename();
                }
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditTitleDialogOpen(false)}
              >
                {i18nText[language].cancel}
              </Button>
              <Button
                onClick={onRename}
                disabled={!noteName.trim() || updateQuickNoteMutation.isPending}
              >
                {i18nText[language].rename}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{i18nText[language].confirmAction}</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {`${i18nText[language].confirmDeleteDescStart}${noteName}${i18nText[language].confirmDeleteDescEnd}`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              {i18nText[language].cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteQuickNoteMutation.mutateAsync({
                  id: noteId,
                });
                setConfirmDialogOpen(false);
              }}
            >
              {i18nText[language].confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const i18nText = {
  [UserLangEnum.ZHCN]: {
    quickNote: "速记",
    noQuickNotes: "暂无速记...",
    rename: "重命名",
    editNote: "编辑",
    bottom: "置底",
    delete: "删除",
    enterNewName: "为你的速记输入一个新名称",
    confirmAction: "确认操作",
    confirmDeleteDescStart: "你确定要删除「",
    confirmDeleteDescEnd: "」吗？",
    cancel: "取消",
    confirm: "确认",
  },
  [UserLangEnum.ENUS]: {
    quickNote: "Quick Note",
    noQuickNotes: "No quick notes...",
    rename: "Rename",
    editNote: "Edit Note",
    bottom: "Bottom",
    delete: "Delete",
    enterNewName: "Enter a new name for your quick note.",
    confirmAction: "Confirm Action",
    confirmDeleteDescStart: "Are you sure you want to {delete} [",
    confirmDeleteDescEnd: "]?",
    cancel: "Cancel",
    confirm: "Confirm",
  },
};

export default QuickNoteList;
