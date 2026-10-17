# PII Copy Shield

A cross-browser Manifest V3 extension that replaces common personal information with placeholders at copy time.

## Install locally

The extension is plain Manifest V3 and works on Windows, macOS, and Linux in browsers that support Chromium extensions or Firefox WebExtensions.

### Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

### Microsoft Edge

1. Open `edge://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

### Brave

1. Open `brave://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on**.
3. Select this project's `manifest.json` file.

Firefox temporary add-ons are removed when Firefox restarts. Reload the add-on from the same page after restarting Firefox.

### Opera

1. Open `opera://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked extension**.
4. Select this project folder.

### Vivaldi and Chromium

1. Open `vivaldi://extensions` or `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this project folder.

Other Chromium-based browsers use the same `chrome://extensions` workflow, although the internal URL may differ.

After installation, reload any already-open webpage before testing. Open the extension's options to choose detection rules.

Safari is not directly supported by this unpacked extension. Safari requires converting a WebExtension into a Safari App Extension using Xcode.

Browser pages such as extension stores and some privileged pages do not allow content scripts, so copying there cannot be intercepted.

## Privacy and limitations

All matching happens in the page, locally. No clipboard text leaves the browser. The extension can transform copies made through a webpage's copy event; it cannot control text copied by the operating system outside a browser page, and its pattern matching should not be treated as a complete DLP solution.

The full public privacy policy is in [PRIVACY_POLICY.md](PRIVACY_POLICY.md). Mozilla reviewers can use [AMO_REVIEW_NOTES.md](AMO_REVIEW_NOTES.md) for the manual test procedure.

## Publish on Mozilla Add-ons

Create the upload archive with only the files needed at runtime:

```bash
zip -r pii-copy-shield-1.0.0.xpi manifest.json options.html options.css src
```

Do not upload the `.xpi` to this repository. Submit it at the [Mozilla Add-on Developer Hub](https://addons.mozilla.org/developers/addon/submit/), choose **On this site**, upload the archive, and provide [PRIVACY_POLICY.md](PRIVACY_POLICY.md) when the form asks for a privacy policy.

Upload the complete project separately as the source-code package if AMO asks for source code. Include the reviewer notes and test files in that source package. Use the same stable add-on ID for future versions and increase the version in `manifest.json` for every release.

For the listing, use the name **PII Copy Shield**, explain that processing is local and copy-time only, select a Privacy or Security category, and include screenshots showing the options page and a sanitized paste result. Do not mark it experimental if this release is ready for general users.

## Test

Run `node test/detector.test.js` from this folder.