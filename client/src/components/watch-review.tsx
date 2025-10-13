import { ContentHTML } from "@/components/tiptap-templates/simple/simple-editor";
import ColorThief from "colorthief";
import chroma from "chroma-js";
import { useEffect, useRef, useState } from "react";
import { useUserContext } from "@/user-provider";
import { UserLangEnum, type UserLang } from "@/hooks/use-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StarIcon } from "@/components/ui/icons";
import { WatchEnum, type Watch, type WatchType } from "@/hooks/use-watches";
import { Share } from "lucide-react";
import { snapdom } from "@zumer/snapdom";

const i18nText = {
  [UserLangEnum.ZHCN]: {
    rate: "评分",
  },
  [UserLangEnum.ENUS]: {
    rate: "Rate",
  },
};

export default function WatchReview({
  watch,
  dropped = false,
}: {
  watch: Watch;
  dropped?: boolean;
}) {
  const { user, language } = useUserContext();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const reviewCardRef = useRef<HTMLDivElement | null>(null);
  const [color, setColor] = useState<[number, number, number] | null>(null);
  const brightColor = useRef<[number, number, number] | null>(null);
  const authorColor = useRef<string | null>(null);
  const dateColor = useRef<string | null>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const colorThief = new ColorThief();

    const extractColor = () => {
      try {
        const rgb = colorThief.getColor(img) as [number, number, number];
        const oklch = chroma(rgb).oklch();
        if (oklch[0] > 0.5) {
          // too light, darken it
          if (oklch[0] > 0.7) {
            oklch[0] = 0.5;
          } else {
            oklch[0] -= 0.2;
          }
        }

        const baseColor = chroma.oklch(...oklch);
        const bright = baseColor.brighten();
        const brightOklch = bright.oklch();

        if (brightOklch[0] > 0.6) brightOklch[0] = 0.6;

        setColor(baseColor.oklch());
        brightColor.current = brightOklch;

        // compute adaptive secondary text color
        // main text is white — so pick a soft, readable secondary tone
        authorColor.current = getOklchString(
          chroma.mix("white", baseColor, 0.4).desaturate(2).oklch(),
        );

        const textBg = chroma.oklch(...brightOklch);
        dateColor.current = getOklchString(
          chroma.mix("white", textBg, 0.4).desaturate(2).oklch(),
        );
      } catch (err) {
        console.error("Color extraction failed:", err);
        setColor([0.36, 0.03, 255]);
        brightColor.current = [0.5, 0.03, 255];
        authorColor.current = "oklch(0.873 0 0)";
        dateColor.current = "oklch(0.7371 0.0079 260.73)";
        return;
      }
    };

    if (img.complete) {
      extractColor();
    } else {
      img.addEventListener("load", extractColor);
      return () => img.removeEventListener("load", extractColor);
    }
  }, []);

  const saveCardPng = async () => {
    const result = await snapdom(reviewCardRef.current!, { scale: 3 });
    await result.download({ format: "png", filename: watch.title });
  };

  return (
    <div className="relative min-w-0">
      {/* share button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          className="cursor-pointer rounded-md bg-black/50 p-2 text-white hover:bg-black/70"
          onClick={() => saveCardPng()}
          title="Share"
        >
          <Share className="size-4" />
        </button>
      </div>

      <div className="max-h-[80vh] overflow-scroll">
        <div ref={reviewCardRef} className="overflow-hidden rounded-lg">
          {/* image part */}
          <div className="relative">
            <img
              ref={imgRef}
              src={watch.payload.img ?? "/placeholder.svg"}
              alt={watch.title}
              className="w-full object-cover select-none"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0" style={getGradientStyle(color)}>
              <div className="absolute bottom-6 flex w-full items-end justify-between gap-6 px-4 sm:px-5 lg:px-6">
                <div className="mb-2 flex min-w-0 flex-col gap-2">
                  <div className="text-2xl font-medium text-white">
                    {watch.title}
                  </div>

                  <div
                    className="truncate text-xs"
                    style={{ color: authorColor.current ?? "#DDD" }}
                  >
                    {watch.author}
                  </div>
                </div>

                <div className="h-22 w-18 shrink-0 rounded-md bg-black/36 py-2">
                  <div className="flex flex-col items-center">
                    <div className="text-xs text-white">
                      {i18nText[language].rate}
                    </div>
                    <div className="text-2xl text-nowrap text-white">
                      {(Number(watch.rate) / 2).toFixed(1)}
                    </div>
                    <div className="mt-1 flex">
                      {[...Array(5)].map((_, idx) => (
                        <div
                          className={
                            idx * 2 + 1 <= Number(watch.rate) / 2
                              ? "text-[#FE9902]"
                              : "text-white/50"
                          }
                          key={idx}
                        >
                          <StarIcon
                            className="size-3"
                            fill={
                              Number(watch.rate) / 2 < (idx + 1) * 2 &&
                              Number(watch.rate) / 2 >= idx * 2 + 1
                                ? 0.5
                                : 1
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* review content part */}
          <div style={color ? { background: getOklchString(color) } : {}}>
            <div
              className="rounded-lg px-4 py-3 text-white sm:px-5 sm:py-4 lg:px-6 lg:py-5"
              style={
                brightColor.current
                  ? { background: getOklchString(brightColor.current) }
                  : {}
              }
            >
              <div className="flex items-center gap-4">
                <Avatar className="size-11 border border-gray-300">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback />
                </Avatar>

                <div className="flex flex-col">
                  <div className="text-lg font-medium">{user.username}</div>
                  <div
                    className="text-sm text-nowrap"
                    style={{ color: dateColor.current ?? "#A7AAAF" }}
                  >
                    {dateString(
                      watch.type,
                      watch.createdAt,
                      watch.payload.epoch ?? 1,
                      language,
                      dropped,
                    )}
                  </div>
                </div>
              </div>

              {!!watch.payload.review ? (
                <div className="dark mt-2">
                  <ContentHTML id={watch.payload.review} />
                </div>
              ) : (
                <div className="h-2 w-full"></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function dateString(
  type: WatchType,
  date: Date,
  epoch: number,
  language: UserLang,
  dropped: boolean = false,
) {
  let epochStr = "";
  if (epoch > 1) {
    if (language === UserLangEnum.ZHCN) {
      epochStr = `（${numberToChinese(epoch)}刷）`;
    } else if (language === UserLangEnum.ENUS) {
      epochStr = epoch === 2 ? "2nd " : epoch === 3 ? "3rd " : epoch + "th ";
    }
  }

  let action = "";
  if (language === UserLangEnum.ZHCN) {
    if (dropped) {
      action = "弃坑";
    } else {
      action = [WatchEnum.BOOK, WatchEnum.MANGA].includes(type)
        ? "读完"
        : type === WatchEnum.GAME
          ? "通关"
          : "看完";
    }
  } else if (language === UserLangEnum.ENUS) {
    if (dropped) {
      action = "dropped on ";
    } else {
      action = "completed on ";
    }
  }

  if (language === UserLangEnum.ZHCN) {
    return (
      new Date(date).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }) +
      action +
      epochStr
    );
  } else if (language === UserLangEnum.ENUS) {
    return (
      epochStr +
      action +
      new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );
  }
}

function getOklchString(color: [number, number, number] | null) {
  if (!color) return "";

  const [l, c, h] = color;
  return `oklch(${l} ${c} ${h || 0})`;
}

function getGradientStyle(
  color: [number, number, number] | null,
): React.CSSProperties {
  if (!color) return {};

  const [l, c, h] = color;

  return {
    background: `linear-gradient(
      to top,
      oklch(${l} ${c} ${h || 0}),
      oklch(${l} ${c} ${h || 0} / 0.9) 20%,
      oklch(${l} ${c} ${h || 0} / 0.7) 30%,
      oklch(${l} ${c} ${h || 0} / 0.5) 40%,
      oklch(${l} ${c} ${h || 0} / 0) 65%
    )`,
  };
}

function numberToChinese(num: number): string {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

  if (num < 1 || num > 99) return "超出范围"; // out of range
  if (num < 10) return digits[num]; // single digit

  const tens = Math.floor(num / 10);
  const ones = num % 10;

  if (num === 10) return "十"; // special case for 10

  if (tens === 1) {
    // 11–19
    return "十" + (ones ? digits[ones] : "");
  } else {
    // 20–99
    return digits[tens] + "十" + (ones ? digits[ones] : "");
  }
}
