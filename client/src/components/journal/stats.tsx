import { useUserContext } from "@/user-provider";
import {
  Calendar,
  Description,
  Entries,
  Icon,
  Number,
  Quote,
  VerticalBar,
} from "./icon";
import {
  useGetEntryDate,
  useGetEntriesCount,
  useGetWordsCount,
} from "@/hooks/use-entries";
import { UserLangEnum } from "@/hooks/use-user";

const i18nText = {
  [UserLangEnum.ZHCN]: {
    entries: "今年手记篇数",
    words: "字数",
    days: "写手记天数",
  },
  [UserLangEnum.ENUS]: {
    entries: "Entries This Year",
    words: "Words Written",
    days: "Days Journaled",
  },
};

const Stats = () => {
  const { language } = useUserContext();
  const { data: entryCount } = useGetEntriesCount(new Date().getFullYear());
  const { data: wordCount } = useGetWordsCount();
  const { data: entryDates } = useGetEntryDate();
  return (
    <div className="flex items-center space-x-2">
      <div className="mr-4 flex flex-col">
        <div className="flex items-center leading-none">
          <Icon className="mr-[6px] ml-[2px] h-4 w-4">
            <Entries />
          </Icon>
          <Number>{entryCount ?? 0}</Number>
        </div>
        <Description>{i18nText[language].entries}</Description>
      </div>

      <VerticalBar className="h-6 shrink-0" />

      <div className="mr-4 flex flex-col">
        <div className="flex items-center leading-none">
          <Icon className="mr-[6px] ml-[2px] h-4 w-4">
            <Quote />
          </Icon>
          <Number>{wordCount ?? 0}</Number>
        </div>
        <Description>{i18nText[language].words}</Description>
      </div>

      <VerticalBar className="h-6 shrink-0" />

      <div className="mr-4 flex flex-col">
        <div className="flex items-center leading-none">
          <Icon className="mr-[6px] ml-[2px] h-4 w-4">
            <Calendar />
          </Icon>
          <Number>{entryDates?.length ?? 0}</Number>
        </div>
        <Description>{i18nText[language].days}</Description>
      </div>
    </div>
  );
};

export default Stats;
