import { ApiError } from "./api";
import { zh, type StringsDictionary } from "./i18n/zh";
import { en } from "./i18n/en";

export type { StringsDictionary };
export type ResolvedLanguage = "en" | "zh";

const dictionaries: Record<ResolvedLanguage, StringsDictionary> = {
  zh,
  en,
};

function getInitialLanguage(): ResolvedLanguage {
  try {
    const stored = localStorage.getItem("ecv-lang");
    if (stored === "zh" || stored === "en") {
      return stored;
    }
  } catch {
    // fallback
  }
  if (typeof navigator !== "undefined") {
    const primary = (navigator.languages?.[0] || navigator.language || "").toLowerCase();
    if (primary.startsWith("zh")) {
      return "zh";
    }
  }
  return "en";
}

let currentLanguage: ResolvedLanguage = getInitialLanguage();

export function setStringsLanguage(lang: ResolvedLanguage): void {
  currentLanguage = lang;
}

export function getActiveStrings(): StringsDictionary {
  return dictionaries[currentLanguage] ?? zh;
}

export const strings: StringsDictionary = new Proxy({} as StringsDictionary, {
  get(_target, prop) {
    return getActiveStrings()[prop as keyof StringsDictionary];
  },
});

export function errorMessage(err: unknown): string {
  const active = getActiveStrings();
  if (err instanceof ApiError) {
    return (
      active.apiErrors[err.code as keyof typeof active.apiErrors] ?? err.message
    );
  }
  return active.errors.operationFailed;
}
