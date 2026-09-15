import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { setStringsLanguage, type ResolvedLanguage, strings } from "@/lib/strings";
import { setDayjsLocale } from "@/lib/time";

export type Language = "system" | "en" | "zh";

export type I18nContextValue = {
  language: Language;
  resolvedLanguage: ResolvedLanguage;
  setLanguage: (lang: Language) => void;
  strings: typeof strings;
};

const LANGUAGE_STORAGE_KEY = "ecv-lang";

const I18nContext = createContext<I18nContextValue | null>(null);

export function resolveLanguage(lang: Language): ResolvedLanguage {
  if (lang === "zh" || lang === "en") {
    return lang;
  }
  if (typeof navigator !== "undefined") {
    const primary = (navigator.languages?.[0] || navigator.language || "").toLowerCase();
    if (primary.startsWith("zh")) {
      return "zh";
    }
  }
  return "en";
}

function readStoredLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "zh" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable: fall back to system
  }
  return "system";
}

function applyLanguage(resolved: ResolvedLanguage): void {
  document.documentElement.lang = resolved === "zh" ? "zh-CN" : "en";
  setDayjsLocale(resolved);
  setStringsLanguage(resolved);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);
  const [systemLang, setSystemLang] = useState<ResolvedLanguage>(() => resolveLanguage("system"));

  const resolvedLanguage: ResolvedLanguage = language === "system" ? systemLang : language;

  useEffect(() => {
    applyLanguage(resolvedLanguage);
    if (language !== "system") {
      return;
    }

    const onLanguageChange = () => {
      const next = resolveLanguage("system");
      setSystemLang(next);
      applyLanguage(next);
    };

    window.addEventListener("languagechange", onLanguageChange);
    return () => window.removeEventListener("languagechange", onLanguageChange);
  }, [language, resolvedLanguage]);

  const setLanguage = useCallback((next: Language) => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable: language still applies for this session
    }
    setLanguageState(next);
  }, []);

  const value = useMemo(
    () => ({
      language,
      resolvedLanguage,
      setLanguage,
      strings,
    }),
    [language, resolvedLanguage, setLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
