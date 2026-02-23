import { UserLangEnum, type UserLang } from "@/hooks/use-user";
import {
  type WatchMeasure,
  WatchMeasureText,
  WatchMeasureEnum,
} from "@/hooks/use-watches";
import { useUserContext } from "@/user-provider";

export default function WatchCheckpoints({
  checkpoints,
  measure,
  finished = false,
}: {
  checkpoints: [string, number][];
  measure: WatchMeasure;
  finished?: boolean;
}) {
  const { language } = useUserContext();
  return (
    <div className="bg-accent flex aspect-[5/4] rounded-lg pl-2 sm:aspect-[16/9]">
      <div className="flex-1 overflow-scroll pt-8">
        <div className="flex flex-col">
          {[...checkpoints].reverse().map((checkpoint, idx) => (
            <div key={idx} className="relative flex gap-13">
              {/* timeline decoration */}
              <div className="bg-border absolute top-0 bottom-0 left-28 w-0.5" />
              <div className="bg-muted-foreground absolute top-4 left-27 size-[10px] rounded-full" />

              <span className="text-muted-foreground w-22 shrink-0 pt-3 text-right text-sm sm:w-24">
                {checkpoint[0]}
              </span>
              <span className="pt-2 pb-6">
                {checkpointText(
                  measure,
                  checkpoint[1],
                  language,
                  finished && idx === 0,
                )}
              </span>
            </div>
          ))}
          <div className="relative flex gap-13">
            <div className="bg-border absolute top-0 bottom-0 left-28 w-0.5" />
            <span className="w-22 py-2 sm:w-24"></span>
          </div>
        </div>
      </div>
    </div>
  );
}

const i18nText = {
  [UserLangEnum.ZHCN]: {
    watch: "看到",
    read: "读到",
    play: "玩到",
  },
  [UserLangEnum.ENUS]: {
    watch: "watched",
    read: "read",
    play: "played",
  },
};

const checkpointText = (
  measure: WatchMeasure,
  value: number,
  language: UserLang,
  finished: boolean = false,
) => {
  if (finished) {
    if (language === UserLangEnum.ZHCN) {
      return (
        "标记" +
        ([
          WatchMeasureEnum.CHAPTER,
          WatchMeasureEnum.PAGE,
          WatchMeasureEnum.VOLUME,
          WatchMeasureEnum.PERCENTAGE,
        ].includes(measure)
          ? "读完"
          : measure === WatchMeasureEnum.TROPHY
            ? "通关"
            : "看完")
      );
    } else if (language === UserLangEnum.ENUS) {
      return "mark as completed";
    }
    return "";
  }
  if (value === 0) {
    if (language === UserLangEnum.ZHCN) {
      return (
        "标记在" +
        ([
          WatchMeasureEnum.CHAPTER,
          WatchMeasureEnum.PAGE,
          WatchMeasureEnum.VOLUME,
          WatchMeasureEnum.PERCENTAGE,
        ].includes(measure)
          ? "读"
          : measure === WatchMeasureEnum.TROPHY
            ? "玩"
            : "看")
      );
    } else if (language === UserLangEnum.ENUS) {
      return (
        "start to " +
        ([
          WatchMeasureEnum.CHAPTER,
          WatchMeasureEnum.PAGE,
          WatchMeasureEnum.VOLUME,
          WatchMeasureEnum.PERCENTAGE,
        ].includes(measure)
          ? "read"
          : measure === WatchMeasureEnum.TROPHY
            ? "play"
            : "watch")
      );
    }
    return "";
  }
  if (value === -1) {
    if (language === UserLangEnum.ZHCN) {
      return "标记弃坑";
    } else if (language === UserLangEnum.ENUS) {
      return "dropped";
    }
    return "";
  }
  const action = [
    WatchMeasureEnum.CHAPTER,
    WatchMeasureEnum.PAGE,
    WatchMeasureEnum.VOLUME,
    WatchMeasureEnum.PERCENTAGE,
  ].includes(measure)
    ? i18nText[language].read
    : measure === WatchMeasureEnum.TROPHY
      ? i18nText[language].play
      : i18nText[language].watch;
  let measureText = WatchMeasureText[measure][language];
  if (measure === WatchMeasureEnum.PERCENTAGE) {
    return `${action} ${value}%`;
  }
  if (language === UserLangEnum.ZHCN) {
    return `${action} ${value} ${measureText}`;
  } else if (language === UserLangEnum.ENUS) {
    return `${action} ${measureText} ${value}`;
  }
  return "";
};
