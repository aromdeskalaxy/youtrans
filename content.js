(() => {
  const models = new Map();
  let pair;
  let defaults = defaultLanguages;
  let override;
  let clipReady = false;
  let preferenceRequest = 0;
  let captionInfo;
  let settingsSignature;
  let secondaryRequest;
  let nativeCues;
  let nativeTrackKey;
  let translatorStatus = "";
  let needsGesture = false;

  let player;
  let video;
  let videoId;
  let enabled = false;
  let currentCue;
  let observedCaptions;
  let captionFrame;
  let translationTimer;
  let displayedTranslation;
  let pointer;
  let hovered;
  let timedCaption;
  let replayTarget;
  let clickStart;
  let toastTimer;
  const wordHighlight = "youtrans-word";

  const host = document.createElement("div");
  const shadow = host.attachShadow({ mode: "open" });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    :host {
      all: initial;
      position: absolute;
      inset: 0;
      z-index: 41;
      pointer-events: none;
      container-type: size;
      color: white;
      font: 14px system-ui, sans-serif;
    }

    :host([hidden]), [hidden] { display: none !important; }

    .controls {
      position: absolute;
      inset: 12px 12px auto auto;
      display: grid;
      justify-items: end;
      gap: 6px;
      max-width: min(32em, 90%);
    }

    button {
      pointer-events: auto;
      color: white;
      font: inherit;
      font-weight: 650;
      background: #171a22eb;
      border: 1px solid #ffffff50;
      border-radius: 999px;
      padding: 6px 12px;
      cursor: pointer;
    }

    button[aria-pressed="true"] {
      background: #b6f3e4;
      color: #10352d;
    }

    button:disabled { cursor: wait; }
    .buttons { display: flex; gap: 6px; }
    .notebook {
      display: grid;
      place-items: center;
      width: 34px;
      padding: 0;
      color: #b6f3e4;
    }
    .notebook:hover, .language-button:hover { background: #234138; }
    .language-button { width: 34px; padding-inline: 0; color: #b6f3e4; }
    .language-settings {
      pointer-events: auto;
      display: grid;
      gap: 9px;
      width: min(300px, 75cqw);
      max-height: 72cqh;
      overflow: auto;
      box-sizing: border-box;
      padding: 14px;
      background: #171a22fa;
      border: 1px solid #ffffff40;
      border-radius: 12px;
    }
    .language-settings strong { color: #b6f3e4; font-size: 16px; }
    .language-settings label { display: grid; gap: 4px; min-width: 0; }
    .language-settings select {
      min-width: 0;
      width: 100%;
      padding: 6px 8px;
      color: white;
      background: #272d35;
      border: 1px solid #ffffff50;
      border-radius: 6px;
      font: inherit;
    }
    .language-settings p { margin: 0; font-size: 12px; color: #d0d9d5; }
    .language-actions { display: flex; flex-wrap: wrap; gap: 6px; }
    .language-actions button { border-radius: 7px; font-size: 12px; }
    .language-actions button:first-child { color: #10352d; background: #b6f3e4; }
    .notebook svg { width: 16px; height: 16px; }
    .toast { color: #b6f3e4; }

    .status, .gloss, .toast {
      background: #171a22f5;
      border-radius: 8px;
      padding: 6px 10px;
    }

    .captions {
      position: absolute;
      inset-inline: 5%;
      display: grid;
      justify-items: center;
      text-align: center;
      font-size: clamp(14px, 2.6cqw, 40px);
      line-height: 1.42;
    }

    .secondary {
      width: fit-content;
      max-width: 100%;
      box-sizing: border-box;
      background: #11141beb;
      border-radius: 8px;
      padding: 2px 10px;
      overflow-wrap: anywhere;
      color: #b6f3e4;
      font-size: 0.93em;
    }

    mark {
      background: #ffe082;
      color: #211a0b;
      border-radius: 3px;
    }

    .gloss {
      position: absolute;
      inset: auto auto calc(100% + 6px);
      color: #ffe082;
      font-size: clamp(12px, 1.8cqw, 21px);
    }

    .captions[data-below] .gloss { inset: calc(100% + 6px) auto auto; }
  `);
  shadow.adoptedStyleSheets = [sheet];

  const controls = document.createElement("div");
  controls.className = "controls";
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.textContent = "EN + ไทย";
  toggle.title = "เปิดหรือปิดซับสองภาษา";
  toggle.setAttribute("aria-pressed", "false");
  const status = document.createElement("div");
  status.className = "status";
  status.setAttribute("role", "status");
  const notebook = document.createElement("button");
  notebook.type = "button";
  notebook.className = "notebook";
  notebook.title = "สมุดทบทวน";
  notebook.setAttribute("aria-label", notebook.title);
  const svgNamespace = "http://www.w3.org/2000/svg";
  const bookmarkIcon = document.createElementNS(svgNamespace, "svg");
  bookmarkIcon.setAttribute("viewBox", "0 0 24 24");
  bookmarkIcon.setAttribute("aria-hidden", "true");
  const bookmarkPath = document.createElementNS(svgNamespace, "path");
  bookmarkPath.setAttribute("d", "M6 4h12v16l-6-4-6 4z");
  bookmarkPath.setAttribute("fill", "none");
  bookmarkPath.setAttribute("stroke", "currentColor");
  bookmarkPath.setAttribute("stroke-width", "1.8");
  bookmarkPath.setAttribute("stroke-linejoin", "round");
  bookmarkIcon.append(bookmarkPath);
  notebook.append(bookmarkIcon);
  const buttons = document.createElement("div");
  buttons.className = "buttons";
  const languageSettings = createCaptionSettings({
    save: (languages) => saveLanguages(languages, false),
    saveDefaults: (languages) => saveLanguages(languages, true),
    reset: () => saveLanguages(null, false),
  });
  buttons.append(toggle, languageSettings.button, notebook);
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.setAttribute("role", "status");
  toast.hidden = true;
  const prepare = document.createElement("button");
  prepare.type = "button";
  prepare.textContent = "เตรียมตัวแปล";
  prepare.hidden = true;
  prepare.addEventListener("click", () => prepareTranslator(true));
  controls.addEventListener("click", (event) => event.stopPropagation());
  controls.append(buttons, languageSettings.panel, status, prepare, toast);

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
  }

  notebook.addEventListener("click", async (event) => {
    event.stopPropagation();
    try {
      if (await chrome.runtime.sendMessage("open-notebook")) return;
    } catch {
      // A reloaded extension can invalidate the content script.
    }
    showToast("เปิดสมุดทบทวนไม่สำเร็จ");
  });

  const captions = document.createElement("div");
  captions.className = "captions";
  const secondary = document.createElement("div");
  secondary.className = "secondary";
  secondary.dir = "auto";
  const gloss = document.createElement("div");
  gloss.className = "gloss";
  gloss.dir = "auto";
  captions.append(secondary, gloss);
  captions.hidden = secondary.hidden = gloss.hidden = true;
  shadow.append(controls, captions);

  function translate(text, activePair) {
    const model = models.get(activePair.modelKey);
    if (!model?.translator) return Promise.reject(new Error("Translator is not ready"));
    const cached = model.translations.get(text);
    if (cached) return cached;

    const result = model.translator.translate(text).then((value) => value.trim());
    model.translations.set(text, result);
    if (model.translations.size > 600) {
      model.translations.delete(model.translations.keys().next().value);
    }
    result.catch(() => {
      if (model.translations.get(text) === result) model.translations.delete(text);
    });
    return result;
  }

  function matchingRange(sentence, phrase, segmenter) {
    if (!phrase) return null;

    const boundaries = new Set(Array.from(segmenter.segment(sentence), ({ index }) => index));
    boundaries.add(sentence.length);
    let match = null;

    for (let start = sentence.indexOf(phrase); start !== -1; start = sentence.indexOf(phrase, start + 1)) {
      const end = start + phrase.length;
      if (!boundaries.has(start) || !boundaries.has(end)) continue;
      if (match) return null;
      match = { start, end };
    }
    return match;
  }

  function nearbyPhrases(text, words, index) {
    const phrases = [];
    for (let length = 2; length <= 3; length++) {
      for (let start = Math.max(0, index - length + 1); start <= index; start++) {
        const first = words[start];
        const last = words[start + length - 1];
        if (!last) continue;
        const end = last.index + last.segment.length;
        const phrase = text.slice(first.index, end);
        if (/^[\p{L}\p{M}\p{N}'’\s-]+$/u.test(phrase)) {
          phrases.push({ start: first.index, end, phrase });
        }
      }
    }
    return phrases;
  }

  async function matchInContext(cue, sentence, { start, end }) {
    const marker = "ZXQ";
    const masked = await translate(cue.text.slice(0, start) + marker + cue.text.slice(end), cue.pair);
    const parts = masked.split(marker);
    if (parts.length !== 2) return null;

    // Only use the difference when the translation around the marker agrees.
    const before = parts[0].trimEnd();
    const after = parts[1].trimStart();
    if ((!before && !after) || !sentence.startsWith(before) || !sentence.endsWith(after)) {
      return null;
    }
    const phrase = sentence.slice(before.length, sentence.length - after.length).trim();
    return matchingRange(sentence, phrase, cue.pair.targetWords);
  }

  async function resolveWord(cue, index, sentence, isCurrent = () => true) {
    const { segment, index: start } = cue.words[index];
    const translation = await translate(segment, cue.pair);
    if (!sentence || !isCurrent()) return { translation };

    let range = matchingRange(sentence, translation, cue.pair.targetWords);
    if (range) return { translation, range };

    const phrases = nearbyPhrases(cue.text, cue.words, index);
    const translated = await Promise.all(phrases.map(({ phrase }) => translate(phrase, cue.pair)));
    if (!isCurrent()) return { translation };
    range = translated.map((phrase) => matchingRange(sentence, phrase, cue.pair.targetWords)).find(Boolean);
    if (range) return { translation, range };

    const candidates = [{ start, end: start + segment.length }, ...phrases];
    const matches = await Promise.all(candidates.map((candidate) => matchInContext(cue, sentence, candidate)));
    return { translation, range: matches.find(Boolean) };
  }

  async function highlight(selection) {
    const { cue, index } = selection;
    const sentence = cue.sentence;
    const isCurrent = () => currentCue === cue && hovered === selection;

    try {
      const { translation, range } = await resolveWord(cue, index, sentence, isCurrent);
      if (!isCurrent()) return;

      if (range) {
        const mark = document.createElement("mark");
        mark.textContent = sentence.slice(range.start, range.end);
        secondary.replaceChildren(sentence.slice(0, range.start), mark, sentence.slice(range.end));
      } else if (translation) {
        gloss.textContent = `คำแปลแยก · ${translation}`;
        gloss.hidden = false;
      }
    } catch {
      if (isCurrent()) {
        gloss.textContent = "เปิดคำแปลของคำนี้ไม่ได้";
        gloss.hidden = false;
      }
    }
  }

  function clearHover() {
    if (!hovered) return;
    hovered = null;
    CSS.highlights.delete(wordHighlight);
    secondary.textContent = displayedTranslation?.sentence || "";
    gloss.hidden = true;
  }

  function rangeForWord(line, start, end) {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let offset = 0;
    let started = false;
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const nextOffset = offset + node.length;
      if (!started && start < nextOffset) {
        range.setStart(node, start - offset);
        started = true;
      }
      if (started && end <= nextOffset) {
        range.setEnd(node, end - offset);
        return range;
      }
      offset = nextOffset;
    }
    return null;
  }

  function wordAtPoint(cue, { x, y }) {
    const line = document.elementFromPoint(x, y)?.closest(".caption-visual-line");
    const lineStart = cue.lines.get(line);
    const caret = lineStart === undefined ? null : document.caretRangeFromPoint(x, y);
    if (!caret || !line.contains(caret.startContainer)) return null;

    const prefix = document.createRange();
    prefix.selectNodeContents(line);
    prefix.setEnd(caret.startContainer, caret.startOffset);
    const offset = lineStart + prefix.toString().length;
    const index = cue.words.findIndex((word) => word.index <= offset && offset <= word.index + word.segment.length);
    const word = cue.words[index];
    const range = word && rangeForWord(line, word.index - lineStart, word.index - lineStart + word.segment.length);
    if (!range || range.toString() !== word.segment || !Array.from(range.getClientRects()).some((rect) =>
      x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
    )) {
      return null;
    }
    return { index, range };
  }

  function updateHover() {
    const cue = currentCue;
    const hit = cue && pointer && wordAtPoint(cue, pointer);
    if (!hit) {
      clearHover();
      return;
    }

    const { index, range } = hit;
    if (hovered?.cue === cue && hovered.index === index) {
      CSS.highlights.get(wordHighlight).clear();
      CSS.highlights.get(wordHighlight).add(range);
      return;
    }

    clearHover();
    CSS.highlights.set(wordHighlight, new Highlight(range));
    hovered = { cue, index };
    if (cue.sentence && models.get(cue.pair.modelKey)?.translator) highlight(hovered);
  }

  function positionSecondary(lines) {
    const playerRect = host.getBoundingClientRect();
    let top = playerRect.bottom;
    let bottom = playerRect.top;
    for (const line of lines) {
      const rect = line.getBoundingClientRect();
      top = Math.min(top, rect.top);
      bottom = Math.max(bottom, rect.bottom);
    }
    const below = top - playerRect.top < playerRect.height * 0.24;
    captions.toggleAttribute("data-below", below);
    captions.style.top = below ? `${bottom - playerRect.top + 5}px` : "";
    captions.style.bottom = below ? "" : `${playerRect.bottom - top + 5}px`;
  }

  function timeCaptionWords(text) {
    if (timedCaption?.text === text) return timedCaption.words;

    const time = video?.currentTime;
    const words = Array.from(pair.sourceWords.segment(text))
      .filter((word) => word.isWordLike)
      .map((word) => ({ ...word, time }));
    const previous = timedCaption?.words || [];
    const appended = text.startsWith(timedCaption?.text || "")
      && previous.every((word, index) => word.segment === words[index]?.segment);

    // A rolling caption keeps the end of the previous caption on screen.
    let overlap = appended ? previous.length : Math.min(previous.length, words.length);
    while (!appended && overlap >= 2) {
      if (previous.slice(-overlap).every((word, index) => word.segment === words[index].segment)) break;
      overlap--;
    }
    if (!appended && overlap < 2) overlap = 0;

    const start = appended ? 0 : previous.length - overlap;
    for (let index = 0; index < overlap; index++) {
      words[index].time = previous[start + index].time;
    }
    timedCaption = { text, words };
    return words;
  }

  function showSecondary(text, sentence) {
    displayedTranslation = { text, sentence };
    secondary.textContent = sentence;
    secondary.hidden = !sentence;
  }

  function syncNativeCaption() {
    const sentence = captionAt(nativeCues, video?.currentTime || 0);
    if (sentence === displayedTranslation?.sentence) return;
    clearHover();
    if (currentCue) currentCue.sentence = sentence;
    showSecondary(currentCue?.text || "", sentence);
  }

  function renderCue(text, lines, words) {
    clearHover();
    clearTimeout(translationTimer);
    const cue = { text, lines, words, pair };
    currentCue = cue;

    if (nativeCues) {
      cue.sentence = displayedTranslation?.sentence || "";
      syncNativeCaption();
      return;
    }

    // Keep the translation visible while YouTube appends words to the same cue.
    const previous = displayedTranslation?.text;
    if (!previous || !text.startsWith(previous) || !/^[\s,.!?;:]/.test(text.slice(previous.length))) {
      displayedTranslation = null;
      secondary.hidden = true;
    }
    if (!models.get(pair.modelKey)?.translator) return;

    translationTimer = setTimeout(async () => {
      try {
        const sentence = await translate(text, cue.pair);
        if (currentCue !== cue || nativeCues) return;
        cue.sentence = sentence;
        showSecondary(text, sentence);
        if (sentence && hovered?.cue === cue) highlight(hovered);
      } catch {
        if (currentCue !== cue || nativeCues) return;
        displayedTranslation = null;
        secondary.hidden = true;
      }
    }, 100);
  }

  function clearCue() {
    clearTimeout(translationTimer);
    clearHover();
    currentCue = null;
    displayedTranslation = null;
    captions.hidden = secondary.hidden = true;
  }

  function scheduleCaptions() {
    if (captionFrame !== undefined) return;
    captionFrame = requestAnimationFrame(() => {
      captionFrame = undefined;
      updateCaptions();
    });
  }

  function trackPointer(event) {
    pointer = { x: event.clientX, y: event.clientY };
    if (currentCue?.lines.has(event.target.closest(".caption-visual-line"))) {
      updateHover();
    } else {
      clearHover();
    }
  }

  function leavePlayer() {
    pointer = null;
    clearHover();
  }

  function startCaptionClick(event) {
    clickStart = currentCue?.lines.has(event.target.closest(".caption-visual-line"))
      ? { x: event.clientX, y: event.clientY } : undefined;
  }

  async function saveFavorite(cue, index) {
    const { segment: word, time } = cue.words[index];
    const sourceId = videoId;
    const title = document.title.replace(/\s*-\s*YouTube$/, "");
    const key = favoriteKey(word, cue.pair.primary);

    try {
      if ((await chrome.storage.local.get(key))[key]) {
        showToast(`มี “${word}” ในสมุดแล้ว`);
        return;
      }

      const sentence = cue.sentence || await translate(cue.text, cue.pair).catch(() => "");
      const { range, translation } = await resolveWord(cue, index, sentence)
        .catch(async () => ({ translation: await translate(word, cue.pair).catch(() => "") }));
      const meaning = range ? sentence.slice(range.start, range.end) : translation;
      await chrome.storage.local.set({
        [key]: {
          word,
          meaning,
          context: cue.text,
          language: cue.pair.primary,
          targetLanguage: cue.pair.secondary,
          title,
          videoId: sourceId,
          time: Number.isFinite(time) ? Math.max(0, time - 0.2) : null,
          savedAt: Date.now(),
        },
      });
      showToast(`บันทึก “${word}” แล้ว`);
    } catch {
      showToast(`บันทึก “${word}” ไม่สำเร็จ`);
    }
  }

  function onCaptionClick(event) {
    const startPoint = clickStart;
    clickStart = undefined;
    if (!currentCue || !video || video.seeking || event.button !== 0
        || player.classList.contains("ad-showing")
        || event.ctrlKey || event.metaKey || event.shiftKey || !startPoint
        || Math.hypot(event.clientX - startPoint.x, event.clientY - startPoint.y) > 6) return;
    const hit = wordAtPoint(currentCue, { x: event.clientX, y: event.clientY });
    if (!hit) return;

    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      saveFavorite(currentCue, hit.index);
      return;
    }

    const { time } = currentCue.words[hit.index];
    const ranges = video.seekable;
    for (let index = 0; index < ranges.length; index++) {
      const start = ranges.start(index);
      if (!(time >= start && time <= ranges.end(index))) continue;

      event.preventDefault();
      event.stopPropagation();
      replayTarget = Math.max(start, time - 0.2);
      video.currentTime = replayTarget;
      video.play().catch(() => {});
      return;
    }
  }

  function onSeeking() {
    if (replayTarget === undefined || Math.abs(video.currentTime - replayTarget) > 0.25) {
      timedCaption = undefined;
    }
    updateCaptions();
  }

  function onSeeked() {
    replayTarget = undefined;
    updateCaptions();
  }

  function updateCaptions() {
    const watchingAd = player?.classList.contains("ad-showing");
    host.hidden = Boolean(watchingAd || player?.classList.contains("ytp-player-minimized"));
    const cc = player?.querySelector(".ytp-subtitles-button");
    const captionsOn = cc?.getAttribute("aria-pressed") === "true"
      && cc.getAttribute("aria-disabled") !== "true";

    const wrongTrack = captionInfo?.waiting || (captionInfo?.current && captionInfo.current !== pair?.primary);
    const canSelectTrack = captionInfo?.tracks.some(({ code }) => code === pair?.primary);
    const message = enabled && !host.hidden ? (
      !captionsOn || wrongTrack
        ? (canSelectTrack ? "กำลังเปิดซับหลัก…" : "เปิด CC และเลือกภาษาหลักใน YouTube")
        : (nativeCues || secondaryRequest ? "" : translatorStatus)
    ) : "";
    prepare.hidden = !enabled || !needsGesture || Boolean(secondaryRequest);
    const prepareLabel = nativeCues ? "เตรียมตัวแปลคำศัพท์" : "เตรียมตัวแปล";
    if (prepare.textContent !== prepareLabel) prepare.textContent = prepareLabel;
    if (status.textContent !== message) status.textContent = message;
    status.hidden = !message;

    const observing = captionsOn && !host.hidden && !video?.seeking;
    const active = clipReady && enabled && observing && !wrongTrack && Boolean(pair);
    player?.classList.toggle("yttrans-active", active);
    if (!observing || !pair || wrongTrack) {
      if (!captionsOn || host.hidden || wrongTrack) timedCaption = undefined;
      clearCue();
      return;
    }

    const lines = new Map();
    const parts = [];
    let offset = 0;
    for (const line of observedCaptions?.querySelectorAll(".caption-window .caption-visual-line") || []) {
      const part = line.textContent;
      if (!part.trim() || !line.getClientRects().length) continue;
      lines.set(line, offset);
      parts.push(part);
      offset += part.length + 1;
    }
    const text = parts.join(" ");
    if (!text) {
      timedCaption = undefined;
      if (nativeCues && active) {
        if (currentCue) clearCue();
        captions.style.top = "";
        captions.style.bottom = "max(13%, 54px)";
        captions.removeAttribute("data-below");
        captions.hidden = false;
        syncNativeCaption();
      } else {
        clearCue();
      }
      return;
    }

    const words = timeCaptionWords(text);
    if (!active) {
      clearCue();
      return;
    }

    positionSecondary(lines.keys());
    captions.hidden = false;
    if (text !== currentCue?.text) {
      renderCue(text, lines, words);
    } else {
      currentCue.lines = lines;
      currentCue.words = words;
      if (nativeCues) syncNativeCaption();
    }
    updateHover();
  }

  function prepareTranslator(userInitiated = false) {
    if (!enabled || !pair) return;
    const { modelKey, sourceLanguage, targetLanguage } = pair;
    if (models.has(modelKey)) return;
    if (!globalThis.Translator || sourceLanguage === targetLanguage) {
      translatorStatus = "Chrome ยังแปลคู่ภาษานี้ไม่ได้";
      needsGesture = false;
      scheduleCaptions();
      return;
    }

    if (needsGesture && !userInitiated) return;
    const model = { translations: new Map() };
    models.set(modelKey, model);
    needsGesture = false;
    translatorStatus = "กำลังเตรียมตัวแปล…";

    Promise.resolve().then(() => Translator.create({
      sourceLanguage,
      targetLanguage,
      monitor(monitor) {
        monitor.addEventListener("downloadprogress", ({ loaded }) => {
          if (pair?.modelKey !== modelKey || !enabled) return;
          translatorStatus = `กำลังดาวน์โหลดตัวแปล… ${Math.round(loaded * 100)}%`;
          scheduleCaptions();
        });
      },
    })).then((translator) => {
      model.translator = translator;
      if (pair?.modelKey !== modelKey) return;
      translatorStatus = "";
      needsGesture = false;
      if (!nativeCues) clearCue();
      else if (hovered?.cue.sentence) highlight(hovered);
      scheduleCaptions();
    }).catch((error) => {
      models.delete(modelKey);
      if (pair?.modelKey !== modelKey) return;
      needsGesture = error.name !== "NotSupportedError";
      translatorStatus = needsGesture
        ? "กดเตรียมตัวแปลเพื่อเปิดซับรอง"
        : "Chrome ยังแปลคู่ภาษานี้ไม่ได้";
      scheduleCaptions();
    });
  }

  function syncSecondaryTrack() {
    const track = enabled && captionInfo?.tracks.find(({ code }) => code === pair.secondary);
    const key = track?.url ? `${videoId}:${track.url}` : null;
    if (key === nativeTrackKey) return;

    secondaryRequest?.abort();
    secondaryRequest = undefined;
    nativeTrackKey = key;
    nativeCues = undefined;
    clearCue();
    if (!key) return;

    const request = new AbortController();
    secondaryRequest = request;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(8000)]);
    fetchCaptionTrack(track, signal).then((cues) => {
      if (secondaryRequest !== request) return;
      nativeCues = cues;
      clearCue();
    }).catch(() => {
      // If the timed-text request is unavailable, keep using Chrome's translator.
    }).finally(() => {
      if (secondaryRequest !== request) return;
      secondaryRequest = undefined;
      scheduleCaptions();
    });
  }

  function requestTracks(primary) {
    document.dispatchEvent(new CustomEvent("youtrans:caption-request", { detail: { videoId, primary } }));
  }

  document.addEventListener("youtrans:caption-response", ({ detail }) => {
    if (detail?.videoId === videoId && Array.isArray(detail.tracks)) captionInfo = detail;
  });

  function refreshLanguages(userInitiated = false) {
    if (!clipReady || !player || captionInfo?.waiting) return;
    const requested = override || defaults;
    const available = captionInfo?.tracks || [];
    const fallbackTracks = available.filter(({ code }) => code !== requested.secondary);
    const primary = available.find(({ code }) => code === requested.primary)?.code
      || fallbackTracks.find(({ code }) => code === captionInfo?.current)?.code
      || fallbackTracks[0]?.code || available[0]?.code || requested.primary;
    const target = primary === requested.secondary ? (primary === "th" ? "en" : "th") : requested.secondary;

    if (primary !== pair?.primary || target !== pair?.secondary) {
      const sourceLanguage = translationLanguage(primary);
      const targetLanguage = translationLanguage(target);
      pair = {
        primary, secondary: target, sourceLanguage, targetLanguage,
        modelKey: `${sourceLanguage}:${targetLanguage}`,
        sourceWords: new Intl.Segmenter(primary, { granularity: "word" }),
        targetWords: new Intl.Segmenter(target, { granularity: "word" }),
      };
      timedCaption = undefined;
      translatorStatus = "";
      needsGesture = false;
      clearCue();
      secondary.lang = gloss.lang = target;
    }

    const name = (code) => code === "th" ? "ไทย" : code.toUpperCase();
    const label = `${name(primary)} + ${name(target)}`;
    if (toggle.textContent !== label) toggle.textContent = label;
    toggle.setAttribute("aria-pressed", String(enabled));
    const signature = JSON.stringify([available.map(({ code, name }) => [code, name]), primary, target, defaults, Boolean(override)]);
    if (signature !== settingsSignature) {
      settingsSignature = signature;
      languageSettings.render({ available, pair, defaults, override });
    }

    syncSecondaryTrack();
    if (userInitiated || !translatorStatus) prepareTranslator(userInitiated);
    scheduleCaptions();
  }

  async function loadPreferences() {
    const id = videoId;
    const request = ++preferenceRequest;
    if (!id) return;
    const languages = clipLanguagesKey(id);
    const state = clipEnabledKey(id);
    try {
      const values = await chrome.storage.local.get([languages, state, languageDefaultsKey]);
      if (request !== preferenceRequest || id !== videoId) return;
      defaults = values[languageDefaultsKey] || defaultLanguages;
      override = values[languages];
      enabled = values[state] === true;
    } catch {
      if (request !== preferenceRequest || id !== videoId) return;
      showToast("อ่านการตั้งค่าซับไม่สำเร็จ");
    }
    clipReady = true;
    toggle.disabled = false;
    languageSettings.button.disabled = false;
    refreshLanguages();
  }

  async function saveLanguages(languages, asDefaults) {
    const id = videoId;
    if (!clipReady || !id || (languages && (!languages.primary || !languages.secondary))) return;
    const key = asDefaults ? languageDefaultsKey : clipLanguagesKey(id);
    try {
      if (languages) await chrome.storage.local.set({ [key]: languages });
      else await chrome.storage.local.remove(key);
      if (id !== videoId) return;
      if (asDefaults) defaults = languages;
      else override = languages || undefined;
      languageSettings.setOpen(false);
      requestTracks();
      refreshLanguages(true);
      if (enabled && pair) requestTracks(pair.primary);
      showToast(asDefaults ? "บันทึกคู่ภาษาเริ่มต้นแล้ว" : "บันทึกคู่ภาษาของคลิปนี้แล้ว");
    } catch {
      if (id === videoId) showToast("บันทึกคู่ภาษาไม่สำเร็จ");
    }
  }

  toggle.addEventListener("click", () => {
    if (!clipReady || !videoId) return;
    const id = videoId;
    enabled = !enabled;
    refreshLanguages(true);
    if (enabled && pair) requestTracks(pair.primary);
    chrome.storage.local.set({ [clipEnabledKey(id)]: enabled }).catch(() => {
      if (id === videoId) showToast("จำสถานะของคลิปนี้ไม่สำเร็จ");
    });
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && videoId &&
        (languageDefaultsKey in changes || clipLanguagesKey(videoId) in changes || clipEnabledKey(videoId) in changes)) {
      loadPreferences();
    }
  });

  const captionObserver = new MutationObserver(scheduleCaptions);
  const playerObserver = new MutationObserver(scheduleCaptions);
  const playerSize = new ResizeObserver(scheduleCaptions);

  function syncPlayer() {
    const nextId = location.pathname === "/watch" ? new URLSearchParams(location.search).get("v") : null;
    const nextPlayer = nextId ? document.querySelector("#movie_player") : null;
    const nextVideo = nextPlayer?.querySelector("video");
    const nextCaptions = nextPlayer?.querySelector("#ytp-caption-window-container, .ytp-caption-window-container");

    const newClip = nextId !== videoId;
    if (newClip || nextPlayer !== player || nextVideo !== video || nextCaptions !== observedCaptions) {
      clearCue();
      timedCaption = replayTarget = undefined;
      player?.classList.remove("yttrans-active");
      player?.removeEventListener("pointermove", trackPointer);
      player?.removeEventListener("pointerleave", leavePlayer);
      player?.removeEventListener("pointerdown", startCaptionClick, true);
      player?.removeEventListener("click", onCaptionClick, true);
      pointer = clickStart = undefined;
      playerSize.disconnect();
      captionObserver.disconnect();
      playerObserver.disconnect();
      video?.removeEventListener("seeking", onSeeking);
      video?.removeEventListener("seeked", onSeeked);
      video?.removeEventListener("timeupdate", scheduleCaptions);

      videoId = nextId;
      if (newClip) {
        enabled = clipReady = false;
        override = captionInfo = pair = undefined;
        translatorStatus = "";
        needsGesture = false;
        settingsSignature = undefined;
        syncSecondaryTrack();
        toggle.setAttribute("aria-pressed", "false");
        toggle.disabled = languageSettings.button.disabled = true;
        languageSettings.setOpen(false);
      }
      player = nextPlayer;
      video = nextVideo;
      observedCaptions = nextCaptions;

      if (player) {
        if (host.parentNode !== player) player.append(host);
        player.addEventListener("pointermove", trackPointer);
        player.addEventListener("pointerleave", leavePlayer);
        player.addEventListener("pointerdown", startCaptionClick, true);
        player.addEventListener("click", onCaptionClick, true);
        playerSize.observe(player);
        playerObserver.observe(player, { attributes: true, attributeFilter: ["class"] });
        const cc = player.querySelector(".ytp-subtitles-button");
        if (cc) playerObserver.observe(cc, {
          attributes: true,
          attributeFilter: ["aria-pressed", "aria-disabled"],
        });
        if (observedCaptions) {
          captionObserver.observe(observedCaptions, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ["style", "class", "hidden"],
          });
        }
        video?.addEventListener("seeking", onSeeking);
        video?.addEventListener("seeked", onSeeked);
        video?.addEventListener("timeupdate", scheduleCaptions);
      } else {
        host.remove();
      }
    }

    if (player) {
      requestTracks(enabled ? pair?.primary : undefined);
      refreshLanguages();
      scheduleCaptions();
    }
    if (newClip) loadPreferences();
  }

  document.addEventListener("yt-navigate-finish", syncPlayer);
  setInterval(syncPlayer, 500);
  syncPlayer();
})();
