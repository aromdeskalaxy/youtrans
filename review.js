const list = document.querySelector("#entries");
const count = document.querySelector("#count");
const notice = document.querySelector("#notice");
const query = document.querySelector("#query");
const template = document.querySelector("#entry-template");
let entries = [];

function formatTime(time) {
  const seconds = Math.floor(time);
  const parts = [Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, "0"));
  if (seconds >= 3600) parts.unshift(Math.floor(seconds / 3600));
  return parts.join(":");
}

function addContext(node, entry) {
  const context = entry.context.trim().replace(/\s+/g, " ");
  const language = entry.language || "en";
  const words = new Intl.Segmenter(language, { granularity: "word" });
  const key = favoriteKey(entry.word, language);
  node.lang = language;
  node.dir = "auto";
  for (const part of words.segment(context)) {
    if (part.isWordLike && favoriteKey(part.segment, language) === key) {
      const emphasis = document.createElement("strong");
      emphasis.textContent = part.segment;
      node.append(emphasis);
    } else {
      node.append(part.segment);
    }
  }
}

function makeEntry(key, entry) {
  const row = template.content.firstElementChild.cloneNode(true);
  const word = row.querySelector(".word");
  word.textContent = entry.word;
  word.lang = entry.language || "en";
  word.dir = "auto";
  const meaning = row.querySelector(".meaning");
  meaning.textContent = entry.meaning || "ยังไม่มีคำแปล";
  meaning.lang = entry.meaning ? entry.targetLanguage || "th" : "th";
  meaning.dir = "auto";
  addContext(row.querySelector(".context"), entry);

  const source = row.querySelector(".source");
  const hasTime = Number.isFinite(entry.time);
  source.textContent = [entry.title || "YouTube", hasTime ? formatTime(entry.time) : ""].filter(Boolean).join(" · ");

  const clip = row.querySelector(".clip");
  if (entry.videoId) {
    const url = new URL("https://www.youtube.com/watch");
    url.searchParams.set("v", entry.videoId);
    if (hasTime) url.searchParams.set("t", String(Math.floor(entry.time)));
    clip.href = url.href;
    clip.setAttribute("aria-label", `เปิดคลิปของ ${entry.word}`);
  } else {
    clip.hidden = true;
  }

  const remove = row.querySelector(".remove");
  remove.title = `ลบ ${entry.word}`;
  remove.setAttribute("aria-label", remove.title);
  remove.addEventListener("click", async () => {
    const wasFocused = document.activeElement === remove;
    remove.disabled = true;
    try {
      await chrome.storage.local.remove(key);
      if (wasFocused && document.activeElement === document.body) query.focus();
    } catch {
      remove.disabled = false;
      notice.textContent = "ลบคำนี้ไม่สำเร็จ ลองอีกครั้ง";
      notice.hidden = false;
    }
  });
  return row;
}

function render() {
  const term = query.value.trim().toLocaleLowerCase("en");
  const visible = entries.filter(([, entry]) => [entry.word, entry.meaning, entry.context, entry.title]
    .some((value) => value?.toLocaleLowerCase("en").includes(term)));
  count.textContent = `${visible.length} คำ`;
  list.replaceChildren(...visible.map(([key, entry]) => makeEntry(key, entry)));
  notice.hidden = visible.length > 0;
  notice.textContent = entries.length
    ? "ไม่พบคำที่ตรงกับการค้นหา"
    : "สมุดยังว่างอยู่ กด Alt / Option + คลิก ที่คำในซับหลักของ YouTube เพื่อบันทึกคำแรก";
}

let loadVersion = 0;

async function loadEntries() {
  const version = ++loadVersion;
  try {
    const stored = await chrome.storage.local.get(null);
    if (version !== loadVersion) return;
    entries = Object.entries(stored)
      .filter(([key, entry]) => key.startsWith(favoritePrefix) && entry?.word)
      .sort(([, a], [, b]) => b.savedAt - a.savedAt);
    render();
  } catch {
    if (version !== loadVersion) return;
    notice.textContent = "เปิดสมุดทบทวนไม่สำเร็จ";
    notice.hidden = false;
  }
}

query.addEventListener("input", render);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && Object.keys(changes).some((key) => key.startsWith(favoritePrefix))) {
    loadEntries();
  }
});
loadEntries();
