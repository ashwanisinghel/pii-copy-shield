(function () {
  "use strict";

  // Runs in the page's own JavaScript world so it can wrap the Clipboard API that
  // "copy" buttons call. Settings arrive from content.js through a DOM event.
  const detector = globalThis.PiiDetector;
  delete globalThis.PiiDetector;

  const SETTINGS_EVENT = "pii-copy-shield-settings";
  const clipboard = navigator.clipboard;
  if (!detector) return;

  let settings = Object.assign({}, detector.DEFAULT_SETTINGS);

  document.addEventListener(SETTINGS_EVENT, (event) => {
    try {
      settings = Object.assign({}, settings, JSON.parse(event.detail));
    } catch (error) {
      // Ignore malformed settings; keep the previous ones.
    }
  });

  // Apps such as spreadsheets fill event.clipboardData themselves in their own copy
  // handler, without any text selection. Sanitize what they put in it.
  const clipboardTransfers = new WeakSet();
  ["copy", "cut"].forEach((type) => {
    window.addEventListener(type, (event) => {
      if (event.clipboardData) clipboardTransfers.add(event.clipboardData);
    }, true);
  });

  function sanitizeHtml(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const walker = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => { node.nodeValue = sanitizeText(node.nodeValue).text; });
    return "<!DOCTYPE html>" + doc.documentElement.outerHTML;
  }

  const originalSetData = DataTransfer.prototype.setData;
  DataTransfer.prototype.setData = function (format, data) {
    if (clipboardTransfers.has(this) && typeof data === "string") {
      try {
        if (format === "text/plain" || format === "text") data = sanitizeText(data).text;
        else if (format === "text/html") data = sanitizeHtml(data);
      } catch (error) {
        // Fall through with the original data rather than breaking the copy.
      }
    }
    return originalSetData.call(this, format, data);
  };

  if (!clipboard) return;
  const proto = Object.getPrototypeOf(clipboard);
  const originalWriteText = proto.writeText;
  const originalWrite = proto.write;

  function sanitizeText(text) {
    return detector.sanitize(text, settings);
  }

  async function sanitizeItem(item) {
    if (!item.types.includes("text/plain")) return item;

    const plain = await (await item.getType("text/plain")).text();
    const result = sanitizeText(plain);
    if (!result.replacements.length) return item;

    // The rich version would still contain the original text, so only keep other
    // non-text formats (e.g. images) next to the sanitized plain text.
    const parts = {};
    for (const type of item.types) {
      if (type !== "text/plain" && type !== "text/html") parts[type] = await item.getType(type);
    }
    parts["text/plain"] = new Blob([result.text], { type: "text/plain" });
    return new ClipboardItem(parts);
  }

  proto.writeText = function (text) {
    return originalWriteText.call(this, typeof text === "string" ? sanitizeText(text).text : text);
  };

  proto.write = async function (items) {
    let sanitized = items;
    try {
      sanitized = await Promise.all(Array.from(items, sanitizeItem));
    } catch (error) {
      sanitized = items;
    }
    return originalWrite.call(this, sanitized);
  };
})();
