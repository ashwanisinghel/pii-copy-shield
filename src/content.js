(function () {
  "use strict";

  const storage = typeof browser !== "undefined" ? browser.storage : chrome.storage;
  let settings = Object.assign({}, PiiDetector.DEFAULT_SETTINGS);

  // Lets src/page-hook.js, which runs in the page's world, use the same settings.
  function shareSettings() {
    document.dispatchEvent(new CustomEvent("pii-copy-shield-settings", { detail: JSON.stringify(settings) }));
  }

  function applyBlur() {
    // Restart so rule changes also apply to text that was already scanned.
    PiiBlur.stop();
    if (settings.blurOnPage) PiiBlur.start(settings);
  }

  storage.sync.get(PiiDetector.DEFAULT_SETTINGS).then((storedSettings) => {
    settings = Object.assign({}, settings, storedSettings);
    shareSettings();
    applyBlur();
  });

  storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "sync") return;
    Object.keys(changes).forEach((key) => {
      const { newValue } = changes[key];
      settings[key] = newValue === undefined ? PiiDetector.DEFAULT_SETTINGS[key] : newValue;
    });
    shareSettings();
    applyBlur();
  });

  function getSelectedText(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    const candidates = path.concat([event.target, document.activeElement]);
    for (const candidate of candidates) {
      if (candidate && typeof candidate.value === "string" &&
          typeof candidate.selectionStart === "number" &&
          typeof candidate.selectionEnd === "number" &&
          candidate.selectionStart !== candidate.selectionEnd) {
        return candidate.value.slice(candidate.selectionStart, candidate.selectionEnd);
      }
    }

    const selection = window.getSelection();
    return selection ? selection.toString() : "";
  }

  function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function sanitizeClipboard(event) {
    const selectedText = getSelectedText(event);
    if (!selectedText) return false;

    const result = PiiDetector.sanitize(selectedText, settings);
    if (!result.replacements.length) return false;

    event.preventDefault();
    event.clipboardData.setData("text/plain", result.text);
    event.clipboardData.setData("text/html", escapeHtml(result.text).replace(/\n/g, "<br>"));
    return true;
  }

  document.addEventListener("copy", sanitizeClipboard, true);

  document.addEventListener("cut", (event) => {
    // Cancelling the event also cancels the browser's deletion, so delete manually.
    if (sanitizeClipboard(event)) document.execCommand("delete");
  }, true);
})();
