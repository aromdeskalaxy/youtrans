function createCaptionSettings({ save, saveDefaults, reset }) {
  function element(tag, text) {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  }

  const button = element("button", "⚙");
  button.type = "button";
  button.className = "language-button";
  button.title = "ตั้งค่าภาษาซับ";
  button.setAttribute("aria-label", button.title);
  button.setAttribute("aria-expanded", "false");

  const panel = element("section");
  panel.className = "language-settings";
  panel.hidden = true;
  panel.setAttribute("aria-label", "ตั้งค่าภาษาซับ");
  const primary = element("select");
  const secondary = element("select");
  const currentDefaults = element("p");
  const sourceHint = element("p");
  const saveButton = element("button", "บันทึกคลิปนี้");
  const defaultButton = element("button", "ใช้เป็นค่าเริ่มต้น");
  const resetButton = element("button", "ใช้ค่าเริ่มต้นกับคลิปนี้");
  const actions = element("div");
  actions.className = "language-actions";

  function makeLabel(title, select) {
    const label = element("label");
    select.setAttribute("aria-label", title);
    label.append(element("span", title), select);
    return label;
  }

  actions.append(saveButton, defaultButton, resetButton);
  panel.append(element("strong", "ภาษาซับ"), makeLabel("ภาษาหลัก", primary),
    makeLabel("ภาษารอง", secondary), sourceHint, currentDefaults, actions);

  function setOpen(open) {
    panel.hidden = !open;
    button.setAttribute("aria-expanded", String(open));
  }

  button.addEventListener("click", () => setOpen(panel.hidden));
  panel.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    event.stopPropagation();
    setOpen(false);
    button.focus();
  });

  function selected() {
    return { primary: primary.value, secondary: secondary.value };
  }
  saveButton.addEventListener("click", () => save(selected()));
  defaultButton.addEventListener("click", () => saveDefaults(selected()));
  resetButton.addEventListener("click", reset);

  let tracks = [];
  let targets = [];

  function fill(select, languages, value) {
    select.replaceChildren(...languages.map(({ code, name }) => new Option(name, code)));
    if (languages.some(({ code }) => code === value)) select.value = value;
  }

  function renderTargets(value) {
    const languages = targets.filter(({ code }) => code !== primary.value);
    const nativeCodes = new Set(tracks.map(({ code }) => code));
    fill(secondary, languages.map(({ code, name }) => ({
      code,
      name: nativeCodes.has(code) ? name : `${name} · แปลอัตโนมัติ`,
    })), value === primary.value ? (primary.value === "th" ? "en" : "th") : value);
    updateHint();
  }

  function updateHint() {
    const native = tracks.some(({ code }) => code === secondary.value);
    sourceHint.textContent = native
      ? "ภาษารองใช้ซับจาก YouTube เมื่อโหลดได้"
      : "ภาษารองใช้ตัวแปลใน Chrome";
  }

  primary.addEventListener("change", () => renderTargets(secondary.value));
  secondary.addEventListener("change", updateHint);

  return {
    button, panel, setOpen,
    render({ available, pair, defaults, override }) {
      tracks = available;
      const byCode = new Map(available.map((track) => [track.code, track]));
      const main = available.length ? available : [{ code: pair.primary, name: languageName(pair.primary) }];
      for (const code of new Set([...translationLanguages, pair.secondary, defaults.secondary])) {
        if (!byCode.has(code)) byCode.set(code, { code, name: languageName(code) });
      }
      targets = [...byCode.values()].sort((a, b) => a.name.localeCompare(b.name, "th"));
      fill(primary, main, pair.primary);
      renderTargets(pair.secondary);
      currentDefaults.textContent = `ค่าเริ่มต้น: ${languageName(defaults.primary)} + ${languageName(defaults.secondary)}`;
      resetButton.hidden = !override;
    },
  };
}
