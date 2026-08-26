# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                      # dev server (CRA, localhost:3000)
npm run build                  # production build to ./build
CI=true npm test               # run all tests once (non-watch)
npm test                       # watch mode
CI=true npm test -- -t "wraps around to the first contact from the last"   # single test by name
npm run build                  # MUST use npm run, not npx react-scripts build:
                               # the npm scripts inject REACT_APP_VERSION/COMMIT/BUILD_TIME
CI=true npm test -- src/App.test.js                                        # single test file
npm run yaml-to-json           # ./data/qrdata.yaml -> src/data/qrdata.js
node yaml-to-json.js ./data/qrdata-test.yaml   # convert a different YAML file
npm run predeploy && npm run deploy            # build + push ./build to gh-pages branch
```

No linter script; ESLint runs via `react-app` config inside `react-scripts` during start/build.

## Architecture

Create React App SPA. No router, no state library, no backend. `src/index.js` renders `src/App.js`.

```
App.js                  owns mode ('view' | 'edit') and the in-progress draft
├── useContactsFile.js  committed contacts, file handle, load/save, localStorage
├── ContactCarousel.js  viewer: QR generation, navigation, gestures
│   ├── QrContentsDialog.js   reveal-the-contents popup
│   ├── HelpDialog.js
│   └── VersionFooter.js
├── ContactEditor.js    presentational list editor
└── OverwriteWarning.js
```

`Modal.js` supplies backdrop, heading, Escape, and backdrop-click for all three dialogs.

**Data flow is runtime-only.** Nothing bundles contact data. `useContactsFile` hydrates from `localStorage.contactsData` on mount and otherwise loads a file through `window.showOpenFilePicker`. A deployed instance is empty until the user picks a file.

Each entry is `{ url, description }`. `url` is any QR payload, not just a web address - `mailto:`, `tel:`, `WIFI:S=...;`, plain text - so the only validation is that it is non-empty. It becomes a PNG data URL via `qrcode` at 1024px (`QR_PIXEL_SIZE`); `description` becomes HTML via `marked`, injected with `dangerouslySetInnerHTML` and **not sanitized**.

**Ownership is split deliberately.** The hook holds what has been *saved*; `App` holds the draft. There is no `setContacts` - `save(draft)`/`saveAs(draft)` commit only after the write succeeds, so a denied permission or failed write cannot leave half-saved data in localStorage. Adopting a file (`rememberFile`) sets handle, `canSaveInPlace`, and name together, so partial adoption is impossible.

The `FileSystemFileHandle` is session-only (not serializable), so after a reload Save is not offered and Save As is the only way to write; the *name* is persisted separately under `contactsFileName` so the UI can still say where the data came from. Reading a file does not grant writing it - `save` upgrades via `queryPermission`/`requestPermission({ mode: 'readwrite' })`, with the Save click as the required user gesture. The first in-place save of a file the app did not write raises `OverwriteWarning`, because `yaml.load`→`yaml.dump` silently drops comments, blank lines, and quoting style (extra keys survive).

Effects in `ContactCarousel.js`, in order - changing one usually means checking the next:
1. `contacts` → regenerate all `qrCodes` (a failure falls back to `/placeholder.png`, which does not exist in `public/`)
2. `currentIndex`/`contacts` → re-render `descriptionHtml`
3. `currentIndex`/`contacts` → (re)bind touchstart/touchend swipe handlers on `carouselRef`
4. mount → cleanup for pending long-press timers
5. `currentIndex` → close the QR dialog, so it can never show a URL that disagrees with the code behind it

`showSlide` wraps at both ends. `App` has four render branches: editor, error, empty, carousel; error and empty both offer Select **and** Create-new, so neither is a dead end.

**Untrusted input.** Payloads come from a user-supplied file. `QrContentsDialog.isOpenable` allowlists `http:`/`https:` - anything else renders as text with no Open button - and `window.open` always gets `noopener,noreferrer`. Long-press on the QR is suppressed for touch only (`handleQrContextMenu`), so Chrome's image menu cannot cover the dialog while desktop right-click still offers Save image as.

**Gesture split on the QR image.** A mouse click opens the dialog; on touch only a 500ms press does. A tap must not open it, because the carousel swipes on touch and a swipe still emits a trailing `click`. `isTouchInteractionRef` suppresses that click for 600ms, which is also why a real mouse click on a hybrid device still works once the touch has settled.

**Layout is height-constrained, not scrolling.** The root is `100dvh` (with `100vh` fallback) and `overflow: hidden`; `min-height: 0` at every flex level lets the QR shrink instead of overflowing. The description takes the leftover space and scrolls in place - deliberately *not* a reserved height, since a `min-height` overrides flex sizing and pushes controls off a short screen. Primary target is mobile portrait.

**Legacy build-time path - dead.** `yaml-to-json.js` and `src/data/qrdata.js` predate the runtime loader (commit 75d8134). Nothing imports `qrdata.js` any more. Both are dead weight; deleting them is a pending cleanup. `.gitignore` still lists the pre-rename `src/data/contacts.js`, so the generated `qrdata.js` is committed.

## Tests

Seven suites, ~117 tests. Loading, saving, permissions, and unsaved-change guards live in `App.test.js` against the real component; the carousel suite covers viewing, navigation, gestures, and the actions band. File pickers, `createWritable`, and the permission methods are faked; `js-yaml` is used for real so serialization is genuinely exercised.

Every guard is expected to be **mutation-checked**: break the guard, confirm exactly the test that covers it fails. Two real gaps in this codebase were found that way and by nothing else - a handle adopted before its write landed, and a mock that had never returned a value.

Two traps this suite has already fallen into once — check both when adding tests:

- **localStorage leaks between tests.** The component persists loaded contacts to `localStorage.contactsData` and rehydrates from it on mount, and jsdom keeps that store for the whole file. `beforeEach` clears it; without that, a test that declares a fixture but never clicks "Select qrdata.yaml" silently renders the *previous* test's data and asserts against it.
- **Batched clicks read a stale index.** `showSlide` closes over `currentIndex`, so several `fireEvent.click` calls inside one `act()` all compute from the same pre-click index. Use one `await act()` per click (the `clickNext`/`clickPrevious` helpers) whenever a test walks through more than one slide.

- **CRA sets `resetMocks: true`** (`react-scripts/scripts/utils/createJestConfig.js:68`), which strips the implementation given in a `jest.mock` factory before every test. `jest.mock('qrcode', () => ({ toDataURL: jest.fn(() => Promise.resolve(...)) }))` therefore resolves `undefined` at test time, and every QR code silently falls back to `/placeholder.png`. Reinstate the implementation in `beforeEach` (`QRCode.toDataURL.mockResolvedValue(...)`). This went unnoticed for a long time because no test asserted on the generated image.
- **jsdom has no `PointerEvent`.** `fireEvent.pointerDown(el, { pointerType: 'touch', clientX: 10 })` silently drops every property - the handler receives an empty event. This is why the long-press uses touch events rather than pointer events. Do not reach for pointer events in this suite without polyfilling first.
- **Touch fixtures need `changedTouches` and screen coordinates.** The swipe handler reads `e.changedTouches[0].screenX`, so a fixture supplying only `touches` throws inside a handler you were not even testing. The `touchEvent(x, y)` helper populates `touches`, `changedTouches`, `clientX/Y`, and `screenX/Y` together.

- **A fake `FileSystemFileHandle` must not resolve `requestPermission` to `'prompt'`.** The real API only ever answers `granted` or `denied`; a fake that echoes `prompt` back makes the permission upgrade look broken when it is not.
- **A guard behind a disabled button is unreachable, so its mutation survives.** `moveEntryAt` is exported from `ContactEditor` as a pure function for exactly this reason - the end-of-list guard cannot be reached by clicking, so it is unit-tested directly.

Navigation tests use `renderWithContacts` (renders *and* loads the fixture through the picker) and `expectSlide(data, index)`, which asserts the expected description is present and every other slide's description is absent. The negative half is what makes these tests fail when navigation breaks. Verified by mutation: a no-op `showSlide` fails 4 tests, and clamping either wrap direction fails exactly the matching wrap test.

`CI=true npx react-scripts build` fails on three pre-existing lint warnings (a missing `showSlide` dependency in the swipe effect, and two redundant `role="button"` attributes). Plain `npm run build` compiles with those as warnings. This is unrelated to any recent change - do not treat a red `CI=true` build as a regression without checking these three first.

**Not a PWA.** `public/manifest.json` exists and is linked, so the app is installable, but there is no service worker anywhere - CRA 5 dropped the default one and this project never added `cra-template-pwa` or workbox. Nothing caches the app shell, so a redeploy reaches users on their next load and there is no update prompt to build. `public/index.html` nevertheless carries a meta tag describing the app as "A PWA", with `name` set to the app title rather than `description`; both are wrong and neither has been changed.

**Version footer.** `src/VersionFooter.js` renders `REACT_APP_VERSION`, `REACT_APP_COMMIT`, and `REACT_APP_BUILD_TIME` as `v0.1.0+349650f · built ...`. The version itself is inert - `0.1.0` is the only value that has ever been in `package.json` and nothing bumps it - so the commit and the build time are what actually identify a build. Values are read at render (not module load) so tests can set them and a missing value degrades to `vdev`. Note `process.env.X = undefined` stores the string `"undefined"`, so test teardown must `delete` instead. The npm `start`, `build`, and `build-gh-pages` scripts inject both; running `npx react-scripts start` directly bypasses that and shows `vdev`.

**`homepage` changes the asset path.** `package.json` sets `homepage` to the GitHub Pages URL, so `PUBLIC_URL` is `/qrousel` and the dev server serves assets at `/qrousel/static/js/bundle.js`. Requesting `/static/js/bundle.js` returns `index.html` via the SPA fallback with a 200 - a smoke test that curls that path proves nothing.

## Deployment

GitHub Pages via `gh-pages`. `homepage` is hardcoded in `package.json` (`https://reachpersona.github.io/qrousel/`) — change it there when deploying to a different repo. Note the README describes a `REACT_APP_GH_PAGES` env var and a `build-gh-pages` script that rewrites `homepage`; neither exists in the current code (`build-gh-pages` is a plain `react-scripts build`, and the URL argument `predeploy` passes it is ignored).
