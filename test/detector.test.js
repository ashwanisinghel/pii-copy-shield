const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("src/detector.js", "utf8");
const context = { globalThis: {}, self: {} };
vm.runInNewContext(source, context);
const { sanitize } = context.globalThis.PiiDetector;

const result = sanitize("Email jane@example.com, SSN 123-45-6789, card 4111 1111 1111 1111, IP 192.168.1.10.");
assert.equal(result.text, "Email [EMAIL], SSN [SSN], card [CARD], IP [IP_ADDRESS].");
assert.equal(result.replacements.length, 4);
assert.equal(sanitize("Call 1-800-FLOWERS for help.").text, "Call [PHONE] for help.");
assert.equal(sanitize("India: +91 98765 43210 or 09876543210").text, "India: [PHONE] or [PHONE]");
assert.equal(sanitize("The number 4111 1111 1111 1112 is not a valid card.").text, "The number 4111 1111 1111 1112 is not a valid card.");
assert.equal(sanitize("jane@example.com", { email: false }).text, "jane@example.com");
console.log("detector tests passed");