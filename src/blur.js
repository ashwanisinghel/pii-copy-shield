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

  // Syntax-highlighted viewers split one value across sibling elements
  // ("203" "." "0" "." "113" ...), so detection runs on the text of a whole
  // block and each match is wrapped piece by piece in the nodes it spans.
  function blockOf(node, cache) {
    let element = node.parentElement;
    const start = element;
    while (element && element !== document.documentElement) {
      let display = cache.get(element);
      if (display === undefined) {
        display = getComputedStyle(element).display;
        cache.set(element, display);
      }
      if (!display.startsWith("inline")) return element;
      element = element.parentElement;
    }
    return element || start;
  }

  function textNodesOf(block, cache) {
    const nodes = [];
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.parentElement || isEditable(node.parentElement)) continue;
      if (blockOf(node, cache) === block) nodes.push(node);
    }
    return nodes;
  }

  // A viewer that wraps a long value onto a new line may render each visual
  // line as its own block ("anita_desai@yahoo." / "co.in,"). When a block ends
  // mid-token, carry on into the next block in document order.
  const OPEN_ENDED = /[@.\-_+]$/;
  const MAX_CONTINUATIONS = 3;

  function continueAcrossBlocks(nodes, cache) {
    for (let step = 0; step < MAX_CONTINUATIONS; step += 1) {
      const joined = nodes.map((node) => node.nodeValue).join("");
      if (!OPEN_ENDED.test(joined)) return;
      const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
      walker.currentNode = nodes[nodes.length - 1];
      let next = walker.nextNode();
      while (next && !next.nodeValue.trim()) next = walker.nextNode();
      if (!next || !next.parentElement || isEditable(next.parentElement)) return;
      const more = textNodesOf(blockOf(next, cache), cache).filter((node) => !nodes.includes(node));
      if (!more.length) return;
      nodes.push(...more);
    }
  }

  function blurBlock(block, cache) {
    const nodes = textNodesOf(block, cache);
    if (!nodes.length) return;
    continueAcrossBlocks(nodes, cache);

    let text = "";
    const segments = nodes.map((node) => {
      const segment = { node, start: text.length };
      text += node.nodeValue;
      segment.end = text.length;
      return segment;
    });

    const matches = PiiDetector.find(text, settings);
    if (!matches.length) return;

    segments.forEach(({ node, start, end }) => {
      if (node.parentElement.closest("[" + MARK + "]")) return;
      const pieces = [];
      matches.forEach((match) => {
        const from = Math.max(match.start, start);
        const to = Math.min(match.end, end);
        if (from < to) pieces.push([from - start, to - start]);
      });
      if (!pieces.length) return;

      const value = node.nodeValue;
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      pieces.forEach(([from, to]) => {
        fragment.append(value.slice(cursor, from));
        const span = document.createElement("span");
        span.textContent = value.slice(from, to);
        hide(span);
        fragment.append(span);
        cursor = to;
      });
      fragment.append(value.slice(cursor));
      node.replaceWith(fragment);
    });
  }

  function blurTextNodes(nodes) {
    const cache = new Map();
    const blocks = new Set();
    nodes.forEach((node) => {
      if (node.parentElement) blocks.add(blockOf(node, cache));
    });
    blocks.forEach((block) => blurBlock(block, cache));
  }

  function blurInput(input) {
    if (input.hasAttribute(MARK) || !input.value) return;
    if (PiiDetector.find(input.value, settings).length) hide(input);
  }

  function scan(root) {
    if (root.nodeType === Node.TEXT_NODE) {
      blurTextNodes([root]);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    blurTextNodes(nodes);

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
