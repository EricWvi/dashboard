import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  EchoEnum,
  useCreateEcho,
  useEchoes,
  useToggleEchoMark,
  useYears,
} from "@/hooks/use-echoes";
import { Button } from "@/components/ui/button";
import { useTTContext } from "@/components/editor";
import { ContentHtml } from "@/components/tiptap-templates/simple/simple-editor";
import { useEffect, useState } from "react";
import { createTiptap } from "@/hooks/use-draft";
import { PenLine } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { dateString, getWeekRange, getWeekYearPair } from "@/lib/utils";
import { MarkIcon } from "@/components/ui/icons";
import { UserLangEnum, type UserLang } from "@/hooks/use-user";
import { useUserContext } from "@/user-provider";

export const WeeklyRetro = () => {
  const isMobile = useIsMobile();
  const { data: years } = useYears(EchoEnum.WEEK);
  const currYear = getWeekYearPair().year;
  return (
    <>
      <Accordion type="single" collapsible defaultValue={`item-${currYear}`}>
        <AccordionItem value={`item-${currYear}`}>
          <AccordionTrigger>
            <span className="text-lg font-medium">{currYear}</span>
          </AccordionTrigger>
          <AccordionContent>
            <div className={`overflow-scroll ${isMobile ? "h-80" : "h-30"}`}>
              <Weeks year={currYear} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {years
          ?.filter((year) => year !== currYear)
          .map((year) => (
            <AccordionItem key={year} value={`item-${year}`}>
              <AccordionTrigger>
                <span className="text-lg font-medium">{year}</span>
              </AccordionTrigger>
              <AccordionContent>
                <div
                  className={`overflow-scroll ${isMobile ? "h-80" : "h-30"}`}
                >
                  <Weeks year={year} />
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
      </Accordion>
    </>
  );
};

const getWeekLabel = (week: number, language: UserLang) => {
  if (language === UserLangEnum.ZHCN) {
    return `第 ${week} 周`;
  }
  return `Week ${week}`;
};

const Weeks = ({ year }: { year: number }) => {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  const { week: currWeek, year: currYear } = getWeekYearPair();
  const lastWeekOfLastYear = getWeekYearPair(
    new Date(currYear - 1, 11, 31),
  ).week;

  const { data: weeks, isPending } = useEchoes(
    year,
    EchoEnum.WEEK,
    year === currYear,
  );
  const [showLoading, setShowLoading] = useState(true);
  useEffect(() => {
    if (!isPending) {
      setTimeout(() => {
        setShowLoading(false);
      }, 400);
    } else {
      setShowLoading(true);
    }
  }, [isPending]);
  const {
    id,
    setId: setEditorId,
    setOpen: setEditorDialogOpen,
  } = useTTContext();
  const createEchoMutation = useCreateEcho(year, EchoEnum.WEEK);

  const [dialogWeekRange, setDialogWeekRange] = useState("");
  const [dialogWeek, setDialogWeek] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMark, setDialogMark] = useState(false);
  const [dialogWeekId, setDialogWeekId] = useState(0);

  const useToggleEchoMarkMutation = useToggleEchoMark(year, EchoEnum.WEEK);
  const toggleMark = (id: number, mark: boolean) => {
    return useToggleEchoMarkMutation.mutateAsync({ id, mark });
  };

  const currWeekDraft =
    (weeks ?? [])[0]?.sub === currWeek ? (weeks ?? [])[0]?.draft : undefined;

  return !showLoading ? (
    <div
      className={`${isMobile ? "grid grid-cols-3 gap-2" : "flex flex-wrap gap-2"}`}
    >
      {/* current week */}
      {year === currYear && (
        <Button
          variant={!!currWeekDraft ? "secondary" : "outline"}
          className={!!currWeekDraft ? "" : "border-dashed"}
          onClick={async () => {
            let draft = currWeekDraft;
            if (!draft) {
              draft = await createTiptap(weeklyReviewInitial(language));
              createEchoMutation.mutateAsync({
                sub: currWeek,
                draft,
              });
            }
            setEditorId(draft);
            setEditorDialogOpen(true);
          }}
        >
          {getWeekLabel(currWeek, language)}
        </Button>
      )}
      {/* last week */}
      {year === currYear &&
        currWeek > 1 &&
        !weeks?.find((week) => week.sub === currWeek - 1) && (
          <Button
            variant="outline"
            className="border-dashed"
            onClick={async () => {
              const draft = await createTiptap(weeklyReviewInitial(language));
              createEchoMutation.mutateAsync({
                sub: currWeek - 1,
                draft,
              });
              setEditorId(draft);
              setEditorDialogOpen(true);
            }}
          >
            {getWeekLabel(currWeek - 1, language)}
          </Button>
        )}

      {weeks
        ?.filter((week) => year !== currYear || week.sub !== currWeek)
        .map((week) => (
          <div key={week.id} className="relative w-fit overflow-hidden">
            <Button
              variant="secondary"
              onClick={() => {
                const { start, end } = getWeekRange(year, week.sub);
                setDialogWeekRange(
                  `(${dateString(start)} - ${dateString(end)})`,
                );
                setDialogWeek(week.sub);
                setDialogOpen(true);
                setDialogMark(week.mark);
                setDialogWeekId(week.id);
                setEditorId(week.draft);
              }}
            >
              {getWeekLabel(week.sub, language)}
            </Button>
            <div className="absolute -top-2 right-0">
              {week.mark && (
                <MarkIcon className="size-6 fill-[var(--mark-icon-fill)] stroke-[var(--mark-icon-stroke)]" />
              )}
            </div>
          </div>
        ))}

      {/* the last week in last year */}
      {year === currYear - 1 &&
        currWeek === 1 &&
        !weeks?.find((week) => week.sub === lastWeekOfLastYear) && (
          <Button
            variant="outline"
            className="border-dashed"
            onClick={async () => {
              const draft = await createTiptap(weeklyReviewInitial(language));
              createEchoMutation.mutateAsync({
                sub: lastWeekOfLastYear,
                draft,
              });
              setEditorId(draft);
              setEditorDialogOpen(true);
            }}
          >
            {getWeekLabel(lastWeekOfLastYear, language)}
          </Button>
        )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%-2rem)] !max-w-[800px] gap-0"
          onOpenAutoFocus={(e) => {
            e.preventDefault(); // stops Radix from focusing anything
            (e.currentTarget as HTMLElement).focus(); // focus the dialog container itself
          }}
        >
          <div
            className="absolute -top-1 -left-1 cursor-pointer"
            onClick={() => {
              toggleMark(dialogWeekId, !dialogMark).then(() =>
                setDialogMark(!dialogMark),
              );
            }}
          >
            <MarkIcon
              className={`size-8 ${dialogMark ? "fill-[var(--mark-icon-fill)] stroke-[var(--mark-icon-stroke)]" : "stroke-border"}`}
            />
          </div>
          <DialogHeader>
            <DialogTitle className="text-left">
              <div className="relative">
                {getWeekLabel(dialogWeek, language)}{" "}
                <span className="text-muted-foreground text-sm">
                  {dialogWeekRange}
                </span>
                {/* only allow edit the last week's echo */}
                {(currWeek - 1 === dialogWeek ||
                  (currWeek === 1 &&
                    dialogWeek ===
                      getWeekYearPair(
                        new Date(new Date().getFullYear() - 1, 11, 31),
                      ).week)) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground absolute top-1/2 right-0 translate-x-1/2 -translate-y-3/5"
                    onClick={() => {
                      setEditorDialogOpen(true);
                      setDialogOpen(false);
                    }}
                  >
                    <PenLine />
                  </Button>
                )}
              </div>
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <ContentHtml id={id} />
        </DialogContent>
      </Dialog>
    </div>
  ) : (
    <Skeleton className={`${isMobile ? "h-80" : "h-30"}`} />
  );
};

const questions = [
  {
    id: 1,
    [UserLangEnum.ZHCN]: "本周哪些时刻让我觉得最有意义或最难忘？",
    [UserLangEnum.ENUS]:
      "What moments this week felt the most meaningful or memorable?",
  },
  {
    id: 2,
    [UserLangEnum.ZHCN]: "什么对我挑战最大，我是如何应对的？",
    [UserLangEnum.ENUS]: "What challenged me the most, and how did I respond?",
  },
  {
    id: 3,
    [UserLangEnum.ZHCN]: "我做了什么让自己感到骄傲的事情，无论多小？",
    [UserLangEnum.ENUS]:
      "What did I do that I’m proud of, no matter how small?",
  },
  {
    id: 4,
    [UserLangEnum.ZHCN]: "我在哪里感受到了快乐、轻松或感激？",
    [UserLangEnum.ENUS]: "Where did I notice joy, ease, or gratitude?",
  },
  {
    id: 5,
    [UserLangEnum.ZHCN]: "什么消耗了我的精力，下周我可能会做些什么不同的事？",
    [UserLangEnum.ENUS]:
      "What drained me, and what might I do differently next week?",
  },
  {
    id: 6,
    [UserLangEnum.ZHCN]: "这周谁或什么支持了我？",
    [UserLangEnum.ENUS]: "Who or what supported me this week?",
  },
  {
    id: 7,
    [UserLangEnum.ZHCN]: "我会带着什么样的教训、见解或提醒继续前进？",
    [UserLangEnum.ENUS]:
      "What lesson, insight, or reminder will I carry forward?",
  },
  {
    id: 8,
    [UserLangEnum.ZHCN]: "还有什么...",
    [UserLangEnum.ENUS]: "What’s more...",
  },
];

const weeklyReviewInitial = (language: UserLang) =>
  questions.flatMap((q) => [
    {
      type: "heading",
      attrs: {
        level: 3,
        textAlign: null,
      },
      content: [
        {
          text: q[language],
          type: "text",
        },
      ],
    },
    {
      type: "paragraph",
      attrs: { textAlign: null },
    },
  ]);
