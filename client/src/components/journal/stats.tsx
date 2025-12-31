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
  useGetCurrentYear,
  useGetEntryDate,
  useGetWordsCount,
} from "@/hooks/use-entries";
import { UserLangEnum } from "@/hooks/use-user";
import React, { useEffect, useRef } from "react";
import "odometer/themes/odometer-theme-default.css";

declare global {
  interface Window {
    Odometer: any;
  }
}

const OdometerComponent = ({
  value,
  isPending,
}: {
  value: number;
  isPending: boolean;
}) => {
  const odometerRef = useRef<HTMLDivElement>(null);
  const odometerInstance = useRef<any>(null);

  useEffect(() => {
    if (!isPending) {
      if (odometerRef.current && !odometerInstance.current) {
        import("odometer").then((OdometerModule) => {
          const Odometer = OdometerModule.default;
          odometerInstance.current = new Odometer({
            el: odometerRef.current,
            value: value,
            format: "(,ddd).dd",
          });
        });
      } else if (odometerInstance.current) {
        odometerInstance.current.update(value);
      }
    }
  }, [value, isPending]);

  return (
    <div
      ref={odometerRef}
      style={{
        fontFamily: '"OPPO Sans 4.0", sans-serif',
        fontVariantNumeric: "tabular-nums",
      }}
    />
  );
};

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
  const { data: currentYearData, isPending: yearIsPending } =
    useGetCurrentYear();
  const { data: wordCount, isPending: wordCountIsPending } = useGetWordsCount();
  const { data: datesWithCount, isPending: datesIsPending } = useGetEntryDate();

  return (
    <div className="flex items-center space-x-2">
      <div className="mr-4 flex flex-col">
        <div className="flex items-center leading-none">
          <Icon className="mr-[6px] ml-[2px] h-4 w-4">
            <Entries />
          </Icon>
          <Number>
            <OdometerComponent
              value={currentYearData?.count ?? 0}
              isPending={yearIsPending}
            />
          </Number>
        </div>
        <Description>{i18nText[language].entries}</Description>
      </div>

      <VerticalBar className="h-6 shrink-0" />

      <div className="mr-4 flex flex-col">
        <div className="flex items-center leading-none">
          <Icon className="mr-[6px] ml-[2px] h-4 w-4">
            <Quote />
          </Icon>
          <Number>
            <OdometerComponent
              value={wordCount ?? 0}
              isPending={wordCountIsPending}
            />
          </Number>
        </div>
        <Description>{i18nText[language].words}</Description>
      </div>

      <VerticalBar className="h-6 shrink-0" />

      <div className="mr-4 flex flex-col">
        <div className="flex items-center leading-none">
          <Icon className="mr-[6px] ml-[2px] h-4 w-4">
            <Calendar />
          </Icon>
          <Number>
            <OdometerComponent
              value={datesWithCount?.count ?? 0}
              isPending={datesIsPending}
            />
          </Number>
        </div>
        <Description>{i18nText[language].days}</Description>
      </div>
    </div>
  );
};

export default React.memo(Stats);
