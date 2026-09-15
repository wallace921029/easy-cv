import { Fragment, type ReactNode } from "react";

const URL_RE = /https?:\/\/[^\s"'<>）】》]+/gu;
const TRAILING_PUNCT_RE = /[.,;:!?\)\]\}，。！？、；：）】》]+$/u;

type Segment = { type: "text" | "url"; value: string };

export function splitByUrls(text: string): Segment[] {
  const segments: Segment[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const url = raw.replace(TRAILING_PUNCT_RE, "");
    if (start > last) {
      segments.push({ type: "text", value: text.slice(last, start) });
    }
    if (url.length > 0) {
      segments.push({ type: "url", value: url });
    }
    if (url.length < raw.length) {
      segments.push({ type: "text", value: raw.slice(url.length) });
    }
    last = start + raw.length;
  }
  if (last < text.length) {
    segments.push({ type: "text", value: text.slice(last) });
  }
  return segments;
}

function highlightKeyword(text: string, keyword: string | undefined, keyPrefix: string): ReactNode[] {
  if (!keyword) {
    return [text];
  }
  const nodes: ReactNode[] = [];
  const haystack = text.toLowerCase();
  const needle = keyword.toLowerCase();
  let index = 0;
  for (;;) {
    const found = haystack.indexOf(needle, index);
    if (found === -1) {
      nodes.push(text.slice(index));
      break;
    }
    if (found > index) {
      nodes.push(text.slice(index, found));
    }
    nodes.push(
      <mark
        key={`${keyPrefix}-${found}`}
        className="rounded-[2px] bg-yellow-200/70 text-inherit dark:bg-yellow-500/40"
      >
        {text.slice(found, found + needle.length)}
      </mark>,
    );
    index = found + needle.length;
  }
  return nodes;
}

// Keyword highlight for single-line plain text (e.g. clip names).
export function highlightText(text: string, keyword?: string): ReactNode[] {
  return highlightKeyword(text, keyword, "h");
}

// Renders plain text with URLs turned into links and the search keyword
// highlighted. Never uses dangerouslySetInnerHTML (XSS).
export function renderRichText(text: string, keyword?: string): ReactNode[] {
  return splitByUrls(text).map((segment, index) =>
    segment.type === "url" ? (
      <a
        key={index}
        href={segment.value}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="break-all text-primary underline underline-offset-2"
      >
        {highlightKeyword(segment.value, keyword, `u${index}`)}
      </a>
    ) : (
      <Fragment key={index}>{highlightKeyword(segment.value, keyword, `t${index}`)}</Fragment>
    ),
  );
}
