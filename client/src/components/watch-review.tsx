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
        let rgb = colorThief.getColor(img) as [number, number, number];
        const hsl = chroma(rgb).hsl();
        if (hsl[2] > 0.5) {
          // too light, darken it
          rgb = chroma(rgb).darken().rgb();
        }

        const baseColor = chroma(rgb);
        const bright = baseColor.brighten();
        const brightHSL = bright.hsl();

        if (brightHSL[2] > 0.5) brightHSL[2] = 0.5;

        setColor(baseColor.hsl());
        brightColor.current = brightHSL;

        // compute adaptive secondary text color
        const imgLuminance = baseColor.luminance();
        // main text is white — so pick a soft, readable secondary tone
        let secondaryColor;
        if (imgLuminance < 0.3) {
          // Dark background → dim, cooler gray
          secondaryColor = chroma
            .mix("white", baseColor, 0.4)
            .desaturate(2)
            .hex();
        } else {
          // Light background → softer gray
          secondaryColor = chroma
            .mix("black", baseColor, 0.7)
            .desaturate(2)
            .hex();
        }
        authorColor.current = secondaryColor;

        const textBg = chroma.hsl(...brightHSL);
        const bgLuminance = textBg.luminance();

        if (bgLuminance < 0.3) {
          // Dark background → dim, cooler gray
          secondaryColor = chroma.mix("white", textBg, 0.4).desaturate(2).hex();
        } else {
          // Light background → softer gray
          secondaryColor = chroma.mix("black", textBg, 0.7).desaturate(2).hex();
        }

        dateColor.current = secondaryColor;
      } catch (err) {
        console.error("Color extraction failed:", err);
        setColor([0, 0, 0.3]);
        brightColor.current = [0, 0, 0.4];
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
    <div className="relative">
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
                              : "opacity-50"
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
          <div style={color ? { background: getHslString(color) } : {}}>
            <div
              className="rounded-lg px-4 py-3 text-white sm:px-5 sm:py-4 lg:px-6 lg:py-5"
              style={
                brightColor.current
                  ? { background: getHslString(brightColor.current) }
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
                    className="text-sm"
                    style={{ color: dateColor.current ?? "#A7AAAF" }}
                  >
                    {dateString(watch.type, watch.createdAt, language, dropped)}
                  </div>
                </div>
              </div>

              {!!watch.payload.review && (
                <div className="dark mt-2">
                  <ContentHTML id={watch.payload.review} />
                </div>
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
  language: UserLang,
  dropped: boolean = false,
) {
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
      }) + action
    );
  } else if (language === UserLangEnum.ENUS) {
    return (
      action +
      new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    );
  }
}

function getHslString(color: [number, number, number] | null) {
  if (!color) return "";

  const [h, s, l] = color;
  return `hsl(${h}, ${s * 100}%, ${l * 100}%)`;
}

function getGradientStyle(
  color: [number, number, number] | null,
): React.CSSProperties {
  if (!color) return {};

  const [h, s, l] = color;

  return {
    background: `linear-gradient(
      to top,
      hsla(${h}, ${s * 100}%, ${l * 100}%, 1),
      hsla(${h}, ${s * 100}%, ${l * 100}%, 0.9) 26%,
      hsla(${h}, ${s * 100}%, ${l * 100}%, 0.8) 33%,
      hsla(${h}, ${s * 100}%, ${l * 100}%, 0.6) 43%,
      hsla(${h}, ${s * 100}%, ${l * 100}%, 0) 65%
    )`,
  };
}
