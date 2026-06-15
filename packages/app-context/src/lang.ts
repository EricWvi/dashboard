export type UserLang = "zh-CN" | "en-US";

export const UserLangEnum: { ZHCN: UserLang; ENUS: UserLang } = {
  ZHCN: "zh-CN",
  ENUS: "en-US",
};

export function isUserLang(value: string): value is UserLang {
  return value === "zh-CN" || value === "en-US";
}

export function toUserLang(value: string): UserLang {
  return isUserLang(value) ? value : UserLangEnum.ZHCN;
}
