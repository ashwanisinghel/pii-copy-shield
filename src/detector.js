(function (root) {
  "use strict";

  const DEFAULT_SETTINGS = {
    email: true,
    phone: true,
    ssn: true,
    creditCard: true,
    ipAddress: true,
    pan: true,
    aadhaar: true
  };

  const RULES = [
    { key: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, placeholder: "[EMAIL]" },
    { key: "ipAddress", pattern: /(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?=$|[^\d.]|\.(?!\d))/g, placeholder: "[IP_ADDRESS]", validate: isIPv4 },
    { key: "phone", pattern: /\b(?:\+?1[\s.-]*)?8(?:00|33|44|55|66|77|88)[\s.-]*[A-Z]{4,}\b/gi, placeholder: "[PHONE]" },
    { key: "pan", pattern: /\b[A-Z]{3}[PCHFABTLJG][A-Z]\d{4}[A-Z]\b/gi, placeholder: "[PAN]" },
    { key: "creditCard", pattern: /(?<!\d)(?:\d[ -]*?){13,19}(?!\d)/g, placeholder: "[CARD]", validate: passesLuhn },
    { key: "aadhaar", pattern: /(?<![\w])[2-9]\d{3}(?:\s+|-)?\d{4}(?:\s+|-)?\d{4}(?![\w])(?!(?:[ \t-]+)\d)/g, placeholder: "[AADHAAR]", validate: passesVerhoeff },
    { key: "phone", pattern: /(?<![\d.])(?:(?:\+91|0091|0)[\s.-]*)?(?:[6-9]\d{4}[\s.-]?\d{5}|[6-9]\d{2}[\s.-]?\d{3}[\s.-]?\d{4})(?![\d.])/g, placeholder: "[PHONE]" },
    { key: "phone", pattern: /(?<!\d)(?!(?:\d{4}[ -]?){2}\d{4}(?!\d))(?!(?:\d{1,3}\.){3}\d{1,3}(?=$|[^\d.]|\.(?!\d)))(?:(?:\+?\d)|(?:\(\d{3}\)))[\d .()-]{7,}\d(?!\d)/g, placeholder: "[PHONE]", validate: isGenericPhoneLength },
    { key: "ssn", pattern: /(?<!\d)\d{3}-\d{2}-\d{4}(?!\d)/g, placeholder: "[SSN]" }
  ];

  function passesLuhn(value) {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let doubleDigit = false;
    for (let index = digits.length - 1; index >= 0; index -= 1) {
      let digit = Number(digits[index]);
      if (doubleDigit) digit = digit * 2 > 9 ? digit * 2 - 9 : digit * 2;
      sum += digit;
      doubleDigit = !doubleDigit;
    }
    return sum % 10 === 0;
  }

  const VERHOEFF_D = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
  ];
  const VERHOEFF_P = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
  ];

  function passesVerhoeff(value) {
    const digits = value.replace(/\D/g, "");
    if (digits.length !== 12) return false;
    let check = 0;
    for (let index = 0; index < digits.length; index += 1) {
      const digit = Number(digits[digits.length - 1 - index]);
      check = VERHOEFF_D[check][VERHOEFF_P[index % 8][digit]];
    }
    return check === 0;
  }

  function isIPv4(value) {
    return value.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
  }

  function isGenericPhoneLength(value) {
    const digitCount = value.replace(/\D/g, "").length;
    return digitCount >= 10 && digitCount <= 12;
  }

  function sanitize(text, settings) {
    const activeSettings = Object.assign({}, DEFAULT_SETTINGS, settings);
    const accepted = [];

    // Every rule scans the original text; an earlier rule wins any overlap.
    RULES.forEach((rule) => {
      if (!activeSettings[rule.key]) return;
      for (const match of text.matchAll(rule.pattern)) {
        const start = match.index;
        const end = start + match[0].length;
        if (rule.validate && !rule.validate(match[0])) continue;
        if (accepted.some((other) => start < other.end && end > other.start)) continue;
        accepted.push({ start, end, rule });
      }
    });

    accepted.sort((a, b) => a.start - b.start);
    let sanitized = "";
    let cursor = 0;
    const replacements = accepted.map(({ start, end, rule }) => {
      sanitized += text.slice(cursor, start) + rule.placeholder;
      cursor = end;
      return { type: rule.key, placeholder: rule.placeholder };
    });
    sanitized += text.slice(cursor);

    return { text: sanitized, replacements };
  }

  root.PiiDetector = { DEFAULT_SETTINGS, sanitize };
})(typeof globalThis === "undefined" ? self : globalThis);