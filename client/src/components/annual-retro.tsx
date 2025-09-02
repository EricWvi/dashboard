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
import { getWeekYearPair } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useTTContext } from "@/components/editor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { createTiptap } from "@/hooks/use-draft";
import { PenLine } from "lucide-react";
import { ContentHtml } from "@/components/tiptap-templates/simple/simple-editor";

export const AnnualRetro = () => {
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
  const { year: currYear } = getWeekYearPair();
  const { data: years, isPending } = useEchoesOfQuestion(
    questionId,
    EchoEnum.YEAR,
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
  const createEchoMutation = useCreateQuestionEcho(questionId, EchoEnum.YEAR);

  const [dialogYear, setDialogYear] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);

  const currYearDraft =
    (years ?? [])[0]?.year === currYear ? (years ?? [])[0]?.draft : undefined;

  return !showLoading ? (
    <div
      className={`${isMobile ? "grid grid-cols-4 gap-2" : "flex flex-wrap gap-2"}`}
    >
      {/* current year */}
      <Button
        variant={!!currYearDraft ? "secondary" : "outline"}
        className={!!currYearDraft ? "" : "border-dashed"}
        onClick={async () => {
          let draft = currYearDraft;
          if (!draft) {
            draft = await createTiptap();
            createEchoMutation.mutateAsync({
              year: currYear,
              draft,
            });
          }
          setEditorId(draft);
          setEditorDialogOpen(true);
        }}
      >
        {currYear}
      </Button>

      {years
        ?.filter((year) => year.year !== currYear)
        .map((year) => (
          <Button
            variant="secondary"
            key={year.id}
            onClick={() => {
              setDialogYear(year.year);
              setDialogOpen(true);
              setEditorId(year.draft);
            }}
          >
            {year.year}
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
                {dialogYear}
                {" · "}
                {questions[questionIndex]["en-US"]}

                {/* only allow edit the last year's echo */}
                {currYear - 1 === dialogYear && new Date().getMonth() < 2 && (
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

// https://stephango.com/40-questions
// https://github.com/kepano/40-questions
const questions = [
  {
    id: 1,
    "zh-CN": "你今年做了哪些之前从未做过的事？",
    "en-US": "What did you do this year that you’d never done before?",
  },
  {
    id: 2,
    "zh-CN": "你有没有遵守年初时和自己许下的约定？",
    "en-US": "Did you keep your new year’s resolutions?",
  },
  {
    id: 3,
    "zh-CN": "你身边有人生孩子了吗？",
    "en-US": "Did anyone close to you give birth?",
  },
  {
    id: 4,
    "zh-CN": "你身边有人去世了吗？",
    "en-US": "Did anyone close to you die?",
  },
  {
    id: 5,
    "zh-CN": "你去了哪些城市/州/国家？",
    "en-US": "What cities/states/countries did you visit?",
  },
  {
    id: 6,
    "zh-CN": "明年你想要获得哪些你今年没有的东西？",
    "en-US": "What would you like to have next year that you lacked this year?",
  },
  {
    id: 7,
    "zh-CN": "今年的哪个或哪些日子会铭刻在你的记忆中，为什么？",
    "en-US":
      "What date(s) from this year will remain etched upon your memory, and why?",
  },
  {
    id: 8,
    "zh-CN": "你今年最大的成就是什么？",
    "en-US": "What was your biggest achievement of the year?",
  },
  {
    id: 9,
    "zh-CN": "你今年最大的失败是什么？",
    "en-US": "What was your biggest failure?",
  },
  {
    id: 10,
    "zh-CN": "你今年还遇到过哪些困难？",
    "en-US": "What other hardships did you face?",
  },
  {
    id: 11,
    "zh-CN": "你今年是否生过病或受过伤？",
    "en-US": "Did you suffer illness or injury?",
  },
  {
    id: 12,
    "zh-CN": "你今年买过的最好的东西是什么？",
    "en-US": "What was the best thing you bought?",
  },
  {
    id: 13,
    "zh-CN": "谁的行为值得去表扬？",
    "en-US": "Whose behavior merited celebration?",
  },
  {
    id: 14,
    "zh-CN": "谁的行为令你感到震惊？",
    "en-US": "Whose behavior made you appalled?",
  },
  {
    id: 15,
    "zh-CN": "你大部分的钱都花到哪里去了？",
    "en-US": "Where did most of your money go?",
  },
  {
    id: 16,
    "zh-CN": "有什么事让你感到超级、超级、超级兴奋？",
    "en-US": "What did you get really, really, really excited about?",
  },
  {
    id: 17,
    "zh-CN": "哪首歌会永远让你想起这一年？",
    "en-US": "What song will always remind you of this year?",
  },
  {
    id: 18,
    "zh-CN":
      "与去年的这个时候相比，你是：感到更快乐还是更悲伤了？变得更瘦还是更胖了？变得更富还是更穷了？",
    "en-US":
      "Compared to this time last year, are you: happier or sadder? Thinner or fatter? Richer or poorer?",
  },
  {
    id: 19,
    "zh-CN": "你希望自己能做得更多的是什么？",
    "en-US": "What do you wish you’d done more of?",
  },
  {
    id: 20,
    "zh-CN": "你希望自己能做得更少的是什么？",
    "en-US": "What do you wish you’d done less of?",
  },
  {
    id: 21,
    "zh-CN": "你是如何度过节假日的？",
    "en-US": "How are you spending the holidays?",
  },
  {
    id: 22,
    "zh-CN": "你今年坠入爱河了吗？",
    "en-US": "Did you fall in love this year?",
  },
  {
    id: 23,
    "zh-CN": "你是否有讨厌某个你去年此时不觉得讨厌的人呢？",
    "en-US": "Do you hate anyone now that you didn’t hate this time last year?",
  },
  {
    id: 24,
    "zh-CN": "你最喜欢的电视节目是什么？",
    "en-US": "What was your favorite show?",
  },
  {
    id: 25,
    "zh-CN": "你读过最好的一本书是什么？",
    "en-US": "What was the best book you read?",
  },
  {
    id: 26,
    "zh-CN": "你今年发现的最好听的一首歌是什么？",
    "en-US": "What was your greatest musical discovery of the year?",
  },
  {
    id: 27,
    "zh-CN": "你今年看过最喜欢的一部电影是什么？",
    "en-US": "What was your favorite film?",
  },
  {
    id: 28,
    "zh-CN": "你今年吃过最好吃的一顿饭是什么？",
    "en-US": "What was your favorite meal?",
  },
  {
    id: 29,
    "zh-CN": "有什么是你想要且得到了的？",
    "en-US": "What did you want and get?",
  },
  {
    id: 30,
    "zh-CN": "有什么是你想要却没有得到的？",
    "en-US": "What did you want and not get?",
  },
  {
    id: 31,
    "zh-CN": "你生日那天做了什么？",
    "en-US": "What did you do on your birthday?",
  },
  {
    id: 32,
    "zh-CN": "有什么还未发生的事，如果发生了，会让你的这一年变得无比满足?",
    "en-US":
      "What one thing would have made your year immeasurably more satisfying?",
  },
  {
    id: 33,
    "zh-CN": "你会如何描述你今年的个人时尚风格？",
    "en-US": "How would you describe your personal fashion this year?",
  },
  {
    id: 34,
    "zh-CN": "是什么让你保持理智？",
    "en-US": "What kept you sane?",
  },
  {
    id: 35,
    "zh-CN": "你最欣赏哪个名人/公众人物？",
    "en-US": "Which celebrity/public figure did you admire the most?",
  },
  {
    id: 36,
    "zh-CN": "哪个政治问题最令你有感而发？",
    "en-US": "What political issue stirred you the most?",
  },
  {
    id: 37,
    "zh-CN": "你想念哪些人？",
    "en-US": "Who did you miss?",
  },
  {
    id: 38,
    "zh-CN": "在你新认识的人之中，谁是最好的？",
    "en-US": "Who was the best new person you met?",
  },
  {
    id: 39,
    "zh-CN": "今年你学到了什么宝贵的人生经验？",
    "en-US": "What valuable life lesson did you learn this year?",
  },
  {
    id: 40,
    "zh-CN": "能够总结你这一年的一句话是什么？",
    "en-US": "What is a quote that sums up your year?",
  },
  {
    id: 41,
    "zh-CN": "还有什么...",
    "en-US": "What’s more...",
  },
];
