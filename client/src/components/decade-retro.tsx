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
import { useUserContext } from "@/user-provider";
import { UserLangEnum } from "@/hooks/use-user";

export const DecadeRetro = () => {
  const { language } = useUserContext();
  const isMobile = useIsMobile();
  return (
    <Accordion type="single" collapsible>
      {questions.map((question, idx) => (
        <AccordionItem key={question.id} value={`question-${question.id}`}>
          <AccordionTrigger>
            <span className="text-lg font-medium">
              {question.id}
              {". "}
              {question[language]}
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
  const { language } = useUserContext();
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
                {questions[questionIndex][language]}

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
    [UserLangEnum.ENUS]: "What would you do if you had 6 months to live?",
    [UserLangEnum.ZHCN]: "若生命只剩最后六个月，你会去做什么？",
  },
  {
    id: 2,
    [UserLangEnum.ENUS]: "What would you do if you had a billion dollars?",
    [UserLangEnum.ZHCN]: "若拥有亿万财富，你会做什么？",
  },
  {
    id: 3,
    [UserLangEnum.ENUS]: "What advice would you give yourself 10 years ago?",
    [UserLangEnum.ZHCN]: "现在的你会给十年前的你一些什么建议？",
  },
  {
    id: 4,
    [UserLangEnum.ENUS]: "What do you hope will be the same 10 years from now?",
    [UserLangEnum.ZHCN]: "你希望十年之后，什么依旧保持一致？",
  },
  {
    id: 5,
    [UserLangEnum.ENUS]:
      "What do you hope will be different 10 years from now?",
    [UserLangEnum.ZHCN]: "你希望十年之后，什么是发生了变化？",
  },
  {
    id: 6,
    [UserLangEnum.ENUS]: "What is your idea of perfect happiness?",
    [UserLangEnum.ZHCN]: "在你心中什么是最完美的幸福？",
  },
  {
    id: 7,
    [UserLangEnum.ENUS]: "When and where were you happiest?",
    [UserLangEnum.ZHCN]: "何时何地，你最幸福过？",
  },
  {
    id: 8,
    [UserLangEnum.ENUS]: "Why do you get out of bed in the morning?",
    [UserLangEnum.ZHCN]: "为什么每天要起床？",
  },
  {
    id: 9,
    [UserLangEnum.ENUS]: "What do you consider the lowest depth of misery?",
    [UserLangEnum.ZHCN]: "什么是最痛苦的？",
  },
  {
    id: 10,
    [UserLangEnum.ENUS]: "What is your most marked characteristic?",
    [UserLangEnum.ZHCN]: "你的性格是什么？",
  },
  {
    id: 11,
    [UserLangEnum.ENUS]: "What is your greatest fear?",
    [UserLangEnum.ZHCN]: "你最害怕的是什么？",
  },
  {
    id: 12,
    [UserLangEnum.ENUS]: "What is the trait you most deplore in yourself?",
    [UserLangEnum.ZHCN]: "你最痛恨自己身上的什么特质？",
  },
  {
    id: 13,
    [UserLangEnum.ENUS]: "What is the trait you most deplore in others?",
    [UserLangEnum.ZHCN]: "你最痛恨别人身上的什么特质？",
  },
  {
    id: 14,
    [UserLangEnum.ENUS]: "On what occasion do you lie?",
    [UserLangEnum.ZHCN]: "什么时候会骗自己？",
  },
  {
    id: 15,
    [UserLangEnum.ENUS]: "What is your greatest extravagance?",
    [UserLangEnum.ZHCN]: "浪费过什么？",
  },
  {
    id: 16,
    [UserLangEnum.ENUS]: "What do you consider the most overrated virtue?",
    [UserLangEnum.ZHCN]: "什么样的美德被过誉了？",
  },
  {
    id: 17,
    [UserLangEnum.ENUS]: "What do you most dislike about your appearance?",
    [UserLangEnum.ZHCN]: "你最不喜欢自己外表的什么方面？",
  },
  {
    id: 18,
    [UserLangEnum.ENUS]:
      "If you could change one thing about yourself, what would it be?",
    [UserLangEnum.ZHCN]: "如果你能改变一件事情，那是什么？",
  },
  {
    id: 19,
    [UserLangEnum.ENUS]: "Which talent would you most like to have?",
    [UserLangEnum.ZHCN]: "你期望什么样的天赋？",
  },
  {
    id: 20,
    [UserLangEnum.ENUS]: "What do people frequently misunderstand about you?",
    [UserLangEnum.ZHCN]: "别人通常会误解你什么？",
  },
  {
    id: 21,
    [UserLangEnum.ENUS]: "What is the quality you most like in a man?",
    [UserLangEnum.ZHCN]: "你欣赏男人身上的气质是什么？",
  },
  {
    id: 22,
    [UserLangEnum.ENUS]: "What is the quality you most like in a woman?",
    [UserLangEnum.ZHCN]: "你欣赏女人身上的气质是什么？",
  },
  {
    id: 23,
    [UserLangEnum.ENUS]: "What do you most value in your friends?",
    [UserLangEnum.ZHCN]: "你最看重朋友的什么？",
  },
  {
    id: 24,
    [UserLangEnum.ENUS]: "What do you consider your greatest achievement?",
    [UserLangEnum.ZHCN]: "过去一年，最大的成就？",
  },
  {
    id: 25,
    [UserLangEnum.ENUS]:
      "If you could give everyone in the world one gift, what would it be?",
    [UserLangEnum.ZHCN]: "如果你可以给每一个人同样一个礼物，那是什么？",
  },
  {
    id: 26,
    [UserLangEnum.ENUS]: "What was your greatest waste of time?",
    [UserLangEnum.ZHCN]: "时间浪费在什么上了？",
  },
  {
    id: 27,
    [UserLangEnum.ENUS]: "What do you find painful but worth doing?",
    [UserLangEnum.ZHCN]: "最痛苦却又最值得做的是什么？",
  },
  {
    id: 28,
    [UserLangEnum.ENUS]: "Where would you most like to live?",
    [UserLangEnum.ZHCN]: "你最想去什么地方生活？",
  },
  {
    id: 29,
    [UserLangEnum.ENUS]: "What is your most treasured possession?",
    [UserLangEnum.ZHCN]: "你最喜欢的一件东西？",
  },
  {
    id: 30,
    [UserLangEnum.ENUS]: "Who is your best friend?",
    [UserLangEnum.ZHCN]: "谁是你最好的朋友？",
  },
  {
    id: 31,
    [UserLangEnum.ENUS]: "Who or what is the greatest love of your life?",
    [UserLangEnum.ZHCN]: "谁或什么是你最珍贵的？",
  },
  {
    id: 32,
    [UserLangEnum.ENUS]: "Which living person do you most admire?",
    [UserLangEnum.ZHCN]: "当今世上，你最欣赏的人是？",
  },
  {
    id: 33,
    [UserLangEnum.ENUS]: "Who is your hero of fiction?",
    [UserLangEnum.ZHCN]: "你最欣赏的一个小说英雄？",
  },
  {
    id: 34,
    [UserLangEnum.ENUS]: "Which historical figure do you most identify with?",
    [UserLangEnum.ZHCN]: "你觉得和哪个历史人物最像？",
  },
  {
    id: 35,
    [UserLangEnum.ENUS]: "What is your greatest regret?",
    [UserLangEnum.ZHCN]: "最后悔什么？",
  },
  {
    id: 36,
    [UserLangEnum.ENUS]: "How would you like to die?",
    [UserLangEnum.ZHCN]: "你希望以何种方式结束自己的生命？",
  },
  {
    id: 37,
    [UserLangEnum.ENUS]: "What is your motto?",
    [UserLangEnum.ZHCN]: "座右铭是？",
  },
  {
    id: 38,
    [UserLangEnum.ENUS]: "What is the best compliment you ever received?",
    [UserLangEnum.ZHCN]: "你受到最好赞美是？",
  },
  {
    id: 39,
    [UserLangEnum.ENUS]: "What is the luckiest thing that happened to you?",
    [UserLangEnum.ZHCN]: "最幸运的一件事是？",
  },
  {
    id: 40,
    [UserLangEnum.ENUS]: "What makes you hopeful?",
    [UserLangEnum.ZHCN]: "什么让你充满了希望？",
  },
  {
    id: 41,
    [UserLangEnum.ENUS]: "What’s more...",
    [UserLangEnum.ZHCN]: "还有什么...",
  },
];
