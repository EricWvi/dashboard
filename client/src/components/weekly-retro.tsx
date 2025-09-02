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

const Weeks = ({ year }: { year: number }) => {
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
              draft = await createTiptap(weeklyReviewInitial);
              createEchoMutation.mutateAsync({
                sub: currWeek,
                draft,
              });
            }
            setEditorId(draft);
            setEditorDialogOpen(true);
          }}
        >{`Week ${currWeek}`}</Button>
      )}
      {/* last week */}
      {year === currYear &&
        currWeek > 1 &&
        !weeks?.find((week) => week.sub === currWeek - 1) && (
          <Button
            variant="outline"
            className="border-dashed"
            onClick={async () => {
              const draft = await createTiptap(weeklyReviewInitial);
              createEchoMutation.mutateAsync({
                sub: currWeek - 1,
                draft,
              });
              setEditorId(draft);
              setEditorDialogOpen(true);
            }}
          >{`Week ${currWeek - 1}`}</Button>
        )}

      {weeks
        ?.filter((week) => year !== currYear || week.sub !== currWeek)
        .map((week) => (
          <Button
            variant="secondary"
            key={week.id}
            onClick={() => {
              const { start, end } = getWeekRange(year, week.sub);
              setDialogWeekRange(`(${dateString(start)} - ${dateString(end)})`);
              setDialogWeek(week.sub);
              setDialogOpen(true);
              setEditorId(week.draft);
            }}
          >{`Week ${week.sub}`}</Button>
        ))}

      {/* the last week in last year */}
      {year === currYear - 1 &&
        currWeek === 1 &&
        !weeks?.find((week) => week.sub === lastWeekOfLastYear) && (
          <Button
            variant="outline"
            className="border-dashed"
            onClick={async () => {
              const draft = await createTiptap(weeklyReviewInitial);
              createEchoMutation.mutateAsync({
                sub: lastWeekOfLastYear,
                draft,
              });
              setEditorId(draft);
              setEditorDialogOpen(true);
            }}
          >{`Week ${lastWeekOfLastYear}`}</Button>
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
          <DialogHeader>
            <DialogTitle className="text-left">
              <div className="relative">
                {`Week ${dialogWeek} `}
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
    "zh-CN": "本周哪些时刻让我觉得最有意义或最难忘？",
    "en-US": "What moments this week felt the most meaningful or memorable?",
  },
  {
    id: 2,
    "zh-CN": "什么对我挑战最大，我是如何应对的？",
    "en-US": "What challenged me the most, and how did I respond?",
  },
  {
    id: 3,
    "zh-CN": "我做了什么让自己感到骄傲的事情，无论多小？",
    "en-US": "What did I do that I’m proud of, no matter how small?",
  },
  {
    id: 4,
    "zh-CN": "我在哪里感受到了快乐、轻松或感激？",
    "en-US": "Where did I notice joy, ease, or gratitude?",
  },
  {
    id: 5,
    "zh-CN": "什么消耗了我的精力，下周我可能会做些什么不同的事？",
    "en-US": "What drained me, and what might I do differently next week?",
  },
  {
    id: 6,
    "zh-CN": "这周谁或什么支持了我？",
    "en-US": "Who or what supported me this week?",
  },
  {
    id: 7,
    "zh-CN": "我会带着什么样的教训、见解或提醒继续前进？",
    "en-US": "What lesson, insight, or reminder will I carry forward?",
  },
  {
    id: 8,
    "zh-CN": "还有什么...",
    "en-US": "What’s more...",
  },
];

const weeklyReviewInitial = questions.flatMap((q) => [
  {
    type: "heading",
    attrs: {
      level: 3,
      textAlign: null,
    },
    content: [
      {
        text: q["en-US"],
        type: "text",
      },
    ],
  },
  {
    type: "paragraph",
    attrs: { textAlign: null },
  },
]);
