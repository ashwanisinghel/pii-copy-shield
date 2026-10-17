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
    { key: "aadhaar", pattern: /(?<![\w])[2-9]\d{3}(?:\s+|-)?\d{4}(?:\s+|-)?\d{4}(?![\w])(?!(?:[ \t-]+)\d)/g, placeholder: "[AADHAAR]" },
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

  function isIPv4(value) {
    return value.split(".").every((part) => Number(part) >= 0 && Number(part) <= 255);
  }

  function isGenericPhoneLength(value) {
    const digitCount = value.replace(/\D/g, "").length;
    return digitCount >= 10 && digitCount <= 12;
  }

  function sanitize(text, settings) {
    const activeSettings = Object.assign({}, DEFAULT_SETTINGS, settings);
    let sanitized = text;
    const replacements = [];

    RULES.forEach((rule) => {
      if (!activeSettings[rule.key]) return;
      sanitized = sanitized.replace(rule.pattern, (match) => {
        if (rule.validate && !rule.validate(match)) return match;
        replacements.push({ type: rule.key, placeholder: rule.placeholder });
        return rule.placeholder;
      });
    });

    return { text: sanitized, replacements };
  }

  root.PiiDetector = { DEFAULT_SETTINGS, sanitize };
})(typeof globalThis === "undefined" ? self : globalThis);