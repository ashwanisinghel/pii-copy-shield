(function () {
  "use strict";

  const storage = typeof browser !== "undefined" ? browser.storage : chrome.storage;
  let settings = Object.assign({}, PiiDetector.DEFAULT_SETTINGS);

  storage.sync.get(PiiDetector.DEFAULT_SETTINGS).then((storedSettings) => {
    settings = Object.assign({}, settings, storedSettings);
  });

  storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    Object.keys(changes).forEach((key) => {
      settings[key] = changes[key].newValue;
    });
  });

  document.addEventListener("copy", (event) => {
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : "";
    if (!selectedText) return;

    const result = PiiDetector.sanitize(selectedText, settings);
    if (!result.replacements.length) return;

    event.preventDefault();
    event.clipboardData.setData("text/plain", result.text);
    event.clipboardData.setData("text/html", result.text.replace(/\n/g, "<br>"));
  }, true);
})();