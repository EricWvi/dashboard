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
  useCreateQuestionEcho,
  useEchoesOfQuestion,
} from "@/hooks/use-echoes";
import { useIsMobile } from "@/hooks/use-mobile";
import { getDecadePair } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTTContext } from "@/components/editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { createTiptap } from "@/hooks/use-draft";
import { PenLine } from "lucide-react";
import { ContentHtml } from "@/components/tiptap-templates/simple/simple-editor";

export const DecadeRetro = () => {
  const isMobile = useIsMobile();
  return (
    <Accordion type="single" collapsible>
      {questions.map((question, idx) => (
        <AccordionItem key={question.id} value={`question-${question.id}`}>
          <AccordionTrigger>
            <span className="text-lg font-medium">
              {question.id}
              {". "}
              {question["en-US"]}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <div className={`overflow-scroll ${isMobile ? "h-40" : "h-30"}`}>
              <Years questionIndex={idx} questionId={question.id} />
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

const Years = ({
  questionIndex,
  questionId,
}: {
  questionIndex: number;
  questionId: number;
}) => {
  const isMobile = useIsMobile();
  const { start: currDecadeStart, end: currDecadeEnd } = getDecadePair();
  const { data: years, isPending } = useEchoesOfQuestion(
    questionId,
    EchoEnum.DECADE,
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
  const createEchoMutation = useCreateQuestionEcho(questionId, EchoEnum.DECADE);

  const [dialogDecadeEnd, setDialogDecadeEnd] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const currDecadeDraft =
    (years ?? [])[0]?.year === currDecadeEnd
      ? (years ?? [])[0]?.draft
      : undefined;

  return !showLoading ? (
    <div
      className={`${isMobile ? "grid grid-cols-3 gap-2" : "flex flex-wrap gap-2"}`}
    >
      {/* current year */}
      <Button
        variant={!!currDecadeDraft ? "secondary" : "outline"}
        className={!!currDecadeDraft ? "" : "border-dashed"}
        onClick={async () => {
          let draft = currDecadeDraft;
          if (!draft) {
            draft = await createTiptap();
            createEchoMutation.mutateAsync({
              year: currDecadeEnd,
              draft,
            });
          }
          setEditorId(draft);
          setEditorDialogOpen(true);
        }}
      >
        {`${currDecadeStart}-${currDecadeEnd}`}
      </Button>

      {years
        ?.filter((year) => year.year !== currDecadeEnd)
        .map((year) => (
          <Button
            variant="secondary"
            key={year.id}
            onClick={() => {
              setDialogDecadeEnd(year.year);
              setDialogOpen(true);
              setEditorId(year.draft);
            }}
          >
            {`${year.year - 9}-${year.year}`}
          </Button>
        ))}

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
                {dialogDecadeEnd}
                {" · "}
                {questions[questionIndex]["en-US"]}

                {/* only allow edit the last decade's echo */}
                {currDecadeStart - 1 === dialogDecadeEnd &&
                  new Date().getFullYear() - 1 === dialogDecadeEnd && (
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
    <Skeleton className={`${isMobile ? "h-40" : "h-30"}`} />
  );
};

// https://stephango.com/40-questions-decade
// https://github.com/kepano/40-questions
const questions = [
  {
    id: 1,
    "en-US": "What would you do if you had 6 months to live?",
    "zh-CN": "若生命只剩最后六个月，你会去做什么？",
  },
  {
    id: 2,
    "en-US": "What would you do if you had a billion dollars?",
    "zh-CN": "若拥有亿万财富，你会做什么？",
  },
  {
    id: 3,
    "en-US": "What advice would you give yourself 10 years ago?",
    "zh-CN": "现在的你会给十年前的你一些什么建议？",
  },
  {
    id: 4,
    "en-US": "What do you hope will be the same 10 years from now?",
    "zh-CN": "你希望十年之后，什么依旧保持一致？",
  },
  {
    id: 5,
    "en-US": "What do you hope will be different 10 years from now?",
    "zh-CN": "你希望十年之后，什么是发生了变化？",
  },
  {
    id: 6,
    "en-US": "What is your idea of perfect happiness?",
    "zh-CN": "在你心中什么是最完美的幸福？",
  },
  {
    id: 7,
    "en-US": "When and where were you happiest?",
    "zh-CN": "何时何地，你最幸福过？",
  },
  {
    id: 8,
    "en-US": "Why do you get out of bed in the morning?",
    "zh-CN": "为什么每天要起床？",
  },
  {
    id: 9,
    "en-US": "What do you consider the lowest depth of misery?",
    "zh-CN": "什么是最痛苦的？",
  },
  {
    id: 10,
    "en-US": "What is your most marked characteristic?",
    "zh-CN": "你的性格是什么？",
  },
  {
    id: 11,
    "en-US": "What is your greatest fear?",
    "zh-CN": "你最害怕的是什么？",
  },
  {
    id: 12,
    "en-US": "What is the trait you most deplore in yourself?",
    "zh-CN": "你最痛恨自己身上的什么特质？",
  },
  {
    id: 13,
    "en-US": "What is the trait you most deplore in others?",
    "zh-CN": "你最痛恨别人身上的什么特质？",
  },
  {
    id: 14,
    "en-US": "On what occasion do you lie?",
    "zh-CN": "什么时候会骗自己？",
  },
  {
    id: 15,
    "en-US": "What is your greatest extravagance?",
    "zh-CN": "浪费过什么？",
  },
  {
    id: 16,
    "en-US": "What do you consider the most overrated virtue?",
    "zh-CN": "什么样的美德被过誉了？",
  },
  {
    id: 17,
    "en-US": "What do you most dislike about your appearance?",
    "zh-CN": "你最不喜欢自己外表的什么方面？",
  },
  {
    id: 18,
    "en-US": "If you could change one thing about yourself, what would it be?",
    "zh-CN": "如果你能改变一件事情，那是什么？",
  },
  {
    id: 19,
    "en-US": "Which talent would you most like to have?",
    "zh-CN": "你期望什么样的天赋？",
  },
  {
    id: 20,
    "en-US": "What do people frequently misunderstand about you?",
    "zh-CN": "别人通常会误解你什么？",
  },
  {
    id: 21,
    "en-US": "What is the quality you most like in a man?",
    "zh-CN": "你欣赏男人身上的气质是什么？",
  },
  {
    id: 22,
    "en-US": "What is the quality you most like in a woman?",
    "zh-CN": "你欣赏女人身上的气质是什么？",
  },
  {
    id: 23,
    "en-US": "What do you most value in your friends?",
    "zh-CN": "你最看重朋友的什么？",
  },
  {
    id: 24,
    "en-US": "What do you consider your greatest achievement?",
    "zh-CN": "过去一年，最大的成就？",
  },
  {
    id: 25,
    "en-US":
      "If you could give everyone in the world one gift, what would it be?",
    "zh-CN": "如果你可以给每一个人同样一个礼物，那是什么？",
  },
  {
    id: 26,
    "en-US": "What was your greatest waste of time?",
    "zh-CN": "时间浪费在什么上了？",
  },
  {
    id: 27,
    "en-US": "What do you find painful but worth doing?",
    "zh-CN": "最痛苦却又最值得做的是什么？",
  },
  {
    id: 28,
    "en-US": "Where would you most like to live?",
    "zh-CN": "你最想去什么地方生活？",
  },
  {
    id: 29,
    "en-US": "What is your most treasured possession?",
    "zh-CN": "你最喜欢的一件东西？",
  },
  {
    id: 30,
    "en-US": "Who is your best friend?",
    "zh-CN": "谁是你最好的朋友？",
  },
  {
    id: 31,
    "en-US": "Who or what is the greatest love of your life?",
    "zh-CN": "谁或什么是你最珍贵的？",
  },
  {
    id: 32,
    "en-US": "Which living person do you most admire?",
    "zh-CN": "当今世上，你最欣赏的人是？",
  },
  {
    id: 33,
    "en-US": "Who is your hero of fiction?",
    "zh-CN": "你最欣赏的一个小说英雄？",
  },
  {
    id: 34,
    "en-US": "Which historical figure do you most identify with?",
    "zh-CN": "你觉得和哪个历史人物最像？",
  },
  {
    id: 35,
    "en-US": "What is your greatest regret?",
    "zh-CN": "最后悔什么？",
  },
  {
    id: 36,
    "en-US": "How would you like to die?",
    "zh-CN": "你希望以何种方式结束自己的生命？",
  },
  {
    id: 37,
    "en-US": "What is your motto?",
    "zh-CN": "座右铭是？",
  },
  {
    id: 38,
    "en-US": "What is the best compliment you ever received?",
    "zh-CN": "你受到最好赞美是？",
  },
  {
    id: 39,
    "en-US": "What is the luckiest thing that happened to you?",
    "zh-CN": "最幸运的一件事是？",
  },
  {
    id: 40,
    "en-US": "What makes you hopeful?",
    "zh-CN": "什么让你充满了希望？",
  },
  {
    id: 41,
    "en-US": "What’s more...",
    "zh-CN": "还有什么...",
  },
];
