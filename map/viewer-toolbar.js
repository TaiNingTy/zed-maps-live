// Shared controls for dedicated model pages that already own a 2D camera.
export function installViewerToolbar({ planButton, spread, envelope, renderMode }) {
  const toolbar = planButton.parentElement;
  const spreadLabel = spread.closest("label");
  const group = document.createElement("div");
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", "View mode");
  group.className = "seg viewer-mode-switch";
  group.style.display = "inline-flex";
  group.style.gap = "4px";
  planButton.before(group);
  toolbar.append(spreadLabel);
  planButton.hidden = true;
  let mode = planButton.getAttribute("aria-pressed") === "true" ? "plan" : "3d";
  let storedSpread = Number(spread.value);
  const buttons = new Map();
  for (const [key, title] of [["3d", "3D"], ["stack", "Floor stack"], ["plan", "Plan"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = title;
    button.onclick = () => {
      if (mode === "stack") storedSpread = Number(spread.value);
      mode = key;
      if ((planButton.getAttribute("aria-pressed") === "true") !== (mode === "plan")) planButton.click();
      spread.value = mode === "stack" ? storedSpread : 0;
      spread.dispatchEvent(new Event("input"));
      sync();
    };
    group.append(button);
    buttons.set(key, button);
  }
  function sync() {
    toolbar.dataset.view = mode;
    for (const [key, button] of buttons) button.setAttribute("aria-pressed", String(key === mode));
    spreadLabel.style.display = mode === "stack" ? "" : "none";
    if (envelope) {
      envelope.hidden = mode === "plan";
      envelope.disabled = mode === "stack";
    }
    renderMode(mode);
  }
  sync();
}
