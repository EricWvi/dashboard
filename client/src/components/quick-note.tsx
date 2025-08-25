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
import { ContentHtml } from "@/components/tiptap-templates/simple/simple-editor";

export const QuickNoteList = () => {
  const isMobile = useIsMobile();
  const [isComposing, setIsComposing] = useState(false);
  const { data: notes, isLoading } = useQuickNotes();
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
            <div className="text-xl">Quick Note</div>
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
          {isLoading ? (
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
            notes &&
            (notes.length === 0 ? (
              <div className="text-muted-foreground flex min-h-0 w-full flex-1 flex-col">
                <div className="flex min-h-0 flex-1 items-center justify-center">
                  No quick notes...
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
                      <DialogTrigger className="one-line-text cursor-pointer">
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
                        <ContentHtml id={note.draft} />
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
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setEditorId(note.draft);
                            setEditorDialogOpen(true);
                          }}
                        >
                          <NotepadText />
                          Edit Note
                        </DropdownMenuItem>
                        {idx !== notes.length - 1 && (
                          <DropdownMenuItem
                            onClick={() => moveToBottom(note.id)}
                          >
                            <CornerRightDown />
                            Bottom
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
                          Delete
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
            <DialogTitle>Rename Quick Note</DialogTitle>
            <DialogDescription>
              Enter a new name for your quick note.
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
                Cancel
              </Button>
              <Button
                onClick={onRename}
                disabled={!noteName.trim() || updateQuickNoteMutation.isPending}
              >
                Rename
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription className="wrap-anywhere">
              {`Are you sure you want to {delete} [${noteName}]`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
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
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default QuickNoteList;
