(function () {
  "use strict";

  // Blurs detected PII in page text. Called by content.js when "blurOnPage" is on.
  const MARK = "data-pii-copy-shield";
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT"]);
  const BLUR = "blur(6px)";

  let settings = null;
  let observer = null;
  const hoverHandlers = new WeakMap();

  function hide(element) {
    element.setAttribute(MARK, "");
    element.style.setProperty("filter", BLUR, "important");
    element.style.setProperty("transition", "filter 0.15s", "important");
    const reveal = () => element.style.setProperty("filter", "none", "important");
    const conceal = () => element.style.setProperty("filter", BLUR, "important");
    element.addEventListener("mouseenter", reveal);
    element.addEventListener("mouseleave", conceal);
    hoverHandlers.set(element, { reveal, conceal });
  }

  function unhide(element) {
    const handlers = hoverHandlers.get(element);
    if (handlers) {
      element.removeEventListener("mouseenter", handlers.reveal);
      element.removeEventListener("mouseleave", handlers.conceal);
      hoverHandlers.delete(element);
    }
  }

  function isEditable(element) {
    return element.isContentEditable || SKIP_TAGS.has(element.tagName);
  }

  function blurTextNode(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest("[" + MARK + "]") || isEditable(parent)) return;

    const matches = PiiDetector.find(node.nodeValue, settings);
    if (!matches.length) return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach(({ start, end }) => {
      fragment.append(node.nodeValue.slice(cursor, start));
      const span = document.createElement("span");
      span.textContent = node.nodeValue.slice(start, end);
      hide(span);
      fragment.append(span);
      cursor = end;
    });
    fragment.append(node.nodeValue.slice(cursor));
    node.replaceWith(fragment);
  }

  function blurInput(input) {
    if (input.hasAttribute(MARK) || !input.value) return;
    if (PiiDetector.find(input.value, settings).length) hide(input);
  }

  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      blurTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(blurTextNode);

    const inputs = root.querySelectorAll ? root.querySelectorAll("input, textarea") : [];
    inputs.forEach((input) => {
      if (input.type === "password" || input.type === "checkbox" || input.type === "radio") return;
      blurInput(input);
    });
  }

  function start(currentSettings) {
    settings = currentSettings;
    if (observer) return;
    const run = () => {
      scan(document.documentElement);
      observer = new MutationObserver((mutations) => {
        observer.disconnect();
        mutations.forEach((mutation) => {
          if (mutation.type === "characterData") scan(mutation.target);
          mutation.addedNodes.forEach(scan);
        });
        observe();
      });
      observe();
    };
    const observe = () => observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
    else run();
  }

  function stop() {
    if (observer) observer.disconnect();
    observer = null;
    document.querySelectorAll("[" + MARK + "]").forEach((element) => {
      unhide(element);
      if (element.tagName === "SPAN") element.replaceWith(document.createTextNode(element.textContent));
      else {
        element.removeAttribute(MARK);
        element.style.removeProperty("filter");
        element.style.removeProperty("transition");
      }
    });
  }

  globalThis.PiiBlur = { start, stop };
})();
