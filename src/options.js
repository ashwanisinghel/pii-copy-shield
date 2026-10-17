(function () {
  "use strict";

  const storage = typeof browser !== "undefined" ? browser.storage : chrome.storage;
  const controls = [...document.querySelectorAll("[data-setting]")];
  const status = document.querySelector("#status");

  storage.sync.get(PiiDetector.DEFAULT_SETTINGS).then((settings) => {
    controls.forEach((control) => { control.checked = settings[control.dataset.setting]; });
  });

  controls.forEach((control) => {
    control.addEventListener("change", async () => {
      await storage.sync.set({ [control.dataset.setting]: control.checked });
      status.textContent = "Settings saved";
      window.setTimeout(() => { status.textContent = ""; }, 1800);
    });
  });
})();