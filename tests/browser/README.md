# Browser debugging

Use Playwright's bundled Chromium. Brave is not used.

```sh
npm install
npx playwright install chromium
npm test
npm run debug:browser
```

`npm test` uses a temporary profile to verify extension startup, settings persistence,
background messaging, and IndexedDB access without contacting NodeSeek.

`npm run debug:browser` opens visible Chromium with the extension and a separate,
persistent profile in `.debug/chromium-profile`. Complete Cloudflare verification
and login manually if requested. Type `check` in the terminal to save the current
status and screenshot to `.debug/status.json` and `.debug/nodeseek.png`.
Type `quit` to close the browser.

## Attach through CDP

For real-site debugging, first close the previous debugging Chromium window, then run:

```sh
npm run debug:cdp
```

This starts Chromium directly with the extension, its existing isolated profile, and
a local debugging endpoint at `127.0.0.1:9223`. In another terminal, run:

```sh
npm run test:cdp
```

The probe attaches Playwright, reloads the homepage three times, clicks two public
post links, and navigates home after each. It stops on a detected challenge or HTTP
403/429. Reports and screenshots go to `.debug/cdp-probe/`. It does not solve
challenges or submit content. Disconnecting the probe leaves Chromium open.
This checks a short browsing session; it does not guarantee future CF behavior.

Site access and extension functionality are separate checks: an injected content
script does not prove that the site passed its challenge or that every feature works.
The profile and screenshots may contain personal data; `.debug/` is ignored by Git.
