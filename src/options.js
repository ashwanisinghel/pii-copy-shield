(function () {
  "use strict";

  const storage = typeof browser !== "undefined" ? browser.storage : chrome.storage;
  const controls = [...document.querySelectorAll("[data-setting]")];
  const status = document.querySelector("#status");
  const form = document.querySelector("#exclusion-form");
  const input = document.querySelector("#exclusion-input");
  const list = document.querySelector("#exclusion-list");
  let exclusions = [];

  function showStatus(message) {
    status.textContent = message;
    window.setTimeout(() => { status.textContent = ""; }, 1800);
  }

  function renderExclusions() {
    list.replaceChildren(...exclusions.map((value) => {
      const item = document.createElement("li");
      const text = document.createElement("span");
      const remove = document.createElement("button");
      text.textContent = value;
      remove.type = "button";
      remove.className = "remove";
      remove.textContent = "Remove";
      remove.addEventListener("click", async () => {
        exclusions = exclusions.filter((other) => other !== value);
        await storage.sync.set({ exclusions });
        renderExclusions();
        showStatus("Settings saved");
      });
      item.append(text, remove);
      return item;
    }));
  }

  storage.sync.get(PiiDetector.DEFAULT_SETTINGS).then((settings) => {
    controls.forEach((control) => { control.checked = settings[control.dataset.setting]; });
    exclusions = Array.isArray(settings.exclusions) ? settings.exclusions : [];
    renderExclusions();
  });

  controls.forEach((control) => {
    control.addEventListener("change", async () => {
      await storage.sync.set({ [control.dataset.setting]: control.checked });
      showStatus("Settings saved");
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    const key = PiiDetector.normalizeExclusion(value);
    if (exclusions.some((other) => PiiDetector.normalizeExclusion(other) === key)) {
      showStatus("Already in the list");
      return;
    }
    if (exclusions.length >= PiiDetector.MAX_EXCLUSIONS) {
      showStatus("Exclusion list is full");
      return;
    }
    exclusions = exclusions.concat(value.slice(0, PiiDetector.MAX_EXCLUSION_LENGTH));
    await storage.sync.set({ exclusions });
    input.value = "";
    renderExclusions();
    showStatus("Settings saved");
  });
})();
