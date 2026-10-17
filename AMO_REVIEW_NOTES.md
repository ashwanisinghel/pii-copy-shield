# Mozilla Add-ons Review Notes

## What the extension does

PII Copy Shield listens for webpage copy events. When selected text contains a supported PII pattern, it prevents the original clipboard write and writes the sanitized text instead. Text without a detected pattern is left unchanged.

## Privacy

All detection runs locally in the content script. The extension has no network requests and sends no user data anywhere. The only permission is `storage`, used for the user's enabled detection-rule preferences.

## Manual test

1. Install the submitted add-on in Firefox.
2. Open a normal webpage and reload it.
3. Select and copy `Contact jane@example.com, PAN ABCPD1234F, Aadhaar 2345 6789 0123, or call +91 98765 43210`.
4. Paste into a text field.
5. Confirm the result contains `Contact [EMAIL], PAN [PAN], Aadhaar [AADHAAR], or call [PHONE]`.
6. Open the add-on options and disable Email addresses.
7. Copy `jane@example.com` again and confirm it remains unchanged.

The extension cannot run on Firefox internal pages, the Add-ons Manager, extension stores, or other privileged browser pages.