import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import relativeTime from "dayjs/plugin/relativeTime";
import { strings, type ResolvedLanguage } from "./strings";

dayjs.extend(relativeTime);

export function setDayjsLocale(locale: ResolvedLanguage): void {
  dayjs.locale(locale === "zh" ? "zh-cn" : "en");
}

// PRD 4.1: 刚刚 / N 分钟前 / 今天 HH:mm / 昨天 HH:mm / M月D日 HH:mm / YYYY-MM-DD.
export function formatClipTime(ts: number, now: number): string {
  const date = dayjs(ts);
  const nowDate = dayjs(now);
  const diffMs = now - ts;
  if (diffMs < 60_000) {
    return strings.time.justNow;
  }
  if (diffMs < 3_600_000) {
    return date.from(nowDate);
  }
  if (date.isSame(nowDate, "day")) {
    return strings.time.today(date.format("HH:mm"));
  }
  if (date.isSame(nowDate.subtract(1, "day"), "day")) {
    return strings.time.yesterday(date.format("HH:mm"));
  }
  if (date.isSame(nowDate, "year")) {
    return date.format(strings.time.sameYearFormat);
  }
  return date.format("YYYY-MM-DD");
}

export function formatFullTime(ts: number): string {
  return dayjs(ts).format("YYYY-MM-DD HH:mm:ss");
}
