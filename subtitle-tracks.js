const defaultLanguages = { primary: "en", secondary: "th" };
const languageDefaultsKey = "caption-language-defaults";
const clipLanguagesKey = (id) => `caption-languages:${id}`;
const clipEnabledKey = (id) => `caption-enabled:${id}`;

const translationLanguages = "ar bg bn cs da de el en es fi fr he hi hr hu id it ja kn ko lt mr nl no pl pt ro ru sk sl sv ta te th tr uk vi zh zh-Hant".split(" ");
const translationLanguageSet = new Set(translationLanguages);
const languageNames = new Intl.DisplayNames(["th"], { type: "language" });

function languageName(code) {
  try { return languageNames.of(code) || code; } catch { return code; }
}

function translationLanguage(code) {
  if (translationLanguageSet.has(code)) return code;
  if (/^zh-(TW|HK|MO)$/i.test(code)) return "zh-Hant";
  return new Intl.Locale(code).language;
}

async function fetchCaptionTrack(track, signal) {
  const url = new URL(track.url);
  if (url.origin !== location.origin || url.pathname !== "/api/timedtext") {
    throw new Error("Unexpected caption URL");
  }

  url.searchParams.set("fmt", "json3");
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Caption request failed");
  const { events } = await response.json();
  const cues = (events || []).flatMap((event) => {
    const start = event.tStartMs / 1000;
    const end = start + event.dDurationMs / 1000;
    const text = event.segs?.map(({ utf8 }) => utf8 || "").join("").replace(/\s+/g, " ").trim();
    return Number.isFinite(start) && end > start && text ? [{ start, end, text }] : [];
  }).sort((a, b) => a.start - b.start);
  if (!cues.length) throw new Error("No caption cues");

  // Remember the furthest end time so overlapping windows can be found after a seek.
  let maxEnd = 0;
  for (const cue of cues) {
    maxEnd = Math.max(maxEnd, cue.end);
    cue.maxEnd = maxEnd;
  }
  return cues;
}

function captionAt(cues, time) {
  let left = 0;
  let right = cues.length;
  while (left < right) {
    const mid = (left + right) >>> 1;
    if (cues[mid].maxEnd <= time) left = mid + 1;
    else right = mid;
  }

  const lines = new Set();
  for (let index = left; index < cues.length && cues[index].start <= time; index++) {
    const cue = cues[index];
    if (cue.end > time) lines.add(cue.text);
  }
  return [...lines].join(" ");
}
