import { UserLangEnum, type UserLang } from "@/hooks/use-user";
import {
  WatchEnum,
  type WatchType,
  type WatchMeasure,
  WatchMeasureText,
  WatchMeasureEnum,
} from "@/hooks/use-watches";
import { useUserContext } from "@/user-provider";

export default function WatchCheckpoints({
  checkpoints,
  type,
  measure,
}: {
  checkpoints: [string, number][];
  type: WatchType;
  measure: WatchMeasure;
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

              <span className="text-muted-foreground w-22 pt-3 text-right text-sm sm:w-24">
                {checkpoint[0]}
              </span>
              <span className="pt-2 pb-6">
                {checkpointText(type, measure, checkpoint[1], language)}
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
  type: WatchType,
  measure: WatchMeasure,
  value: number,
  language: UserLang,
) => {
  if (value === 0) {
    if (language === UserLangEnum.ZHCN) {
      return (
        "标记在" +
        ([WatchEnum.BOOK, WatchEnum.MANGA].includes(type)
          ? "读"
          : type === WatchEnum.GAME
            ? "玩"
            : "看")
      );
    } else if (language === UserLangEnum.ENUS) {
      return (
        "start to " +
        ([WatchEnum.BOOK, WatchEnum.MANGA].includes(type)
          ? "read"
          : type === WatchEnum.GAME
            ? "play"
            : "watch")
      );
    }
    return "";
  }
  if (value === -1) {
    if (language === UserLangEnum.ZHCN) {
      return "标记弃看";
    } else if (language === UserLangEnum.ENUS) {
      return "dropped";
    }
    return "";
  }
  const action = [WatchEnum.BOOK, WatchEnum.MANGA].includes(type)
    ? i18nText[language].read
    : type === WatchEnum.GAME
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
