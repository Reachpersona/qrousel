# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start                      # dev server (CRA, localhost:3000)
npm run build                  # production build to ./build
CI=true npm test               # run all tests once (non-watch)
npm test                       # watch mode
CI=true npm test -- -t "wraps around to the first contact from the last"   # single test by name
CI=true npm test -- src/ContactCarouselNoFsAPI.test.js                     # single test file
npm run yaml-to-json           # ./data/qrdata.yaml -> src/data/qrdata.js
node yaml-to-json.js ./data/qrdata-test.yaml   # convert a different YAML file
npm run predeploy && npm run deploy            # build + push ./build to gh-pages branch
```

No linter script; ESLint runs via `react-app` config inside `react-scripts` during start/build.

## Architecture

Create React App SPA. The whole app is one component: `src/ContactCarousel.js`, mounted by `src/index.js`. There is no router, no state library, no backend.

**Data flow is runtime-only.** The carousel never imports any bundled data. On mount it reads `localStorage.contactsData`; if absent it renders a "No contacts available" prompt with a button that calls `window.showOpenFilePicker` (File System Access API), parses the chosen YAML with `js-yaml`, sets state, and writes the parsed array back to `localStorage.contactsData`. Contact data therefore never ships in the build — a deployed instance is empty until the user picks a file.

Each contact is `{ url, description }`. `url` → QR code PNG data URL via `qrcode`; `description` → HTML via `marked`, injected with `dangerouslySetInnerHTML`.

Effect chain in `ContactCarousel.js`, in order — changing one usually means checking the next:
1. mount → hydrate `contacts` from localStorage (corrupt JSON clears the key and sets `error`)
2. `contacts` → regenerate all `qrCodes` (failed QR falls back to `/placeholder.png`, which does not exist in `public/`)
3. `qrCodes`/`contacts` → measure tallest rendered description by appending a temp div to `document.body`, store as `descriptionHeight` so slides don't jump
4. `currentIndex`/`contacts` → re-render `descriptionHtml`
5. `currentIndex`/`contacts` → (re)bind touchstart/touchend swipe handlers on `carouselRef`

`showSlide` wraps at both ends. Three render branches: error, empty, carousel — the first two each expose their own "Select qrdata.yaml" button.

`src/QrContentsDialog.js` renders the reveal-the-QR-contents popup. It is a dumb component - it takes `{ url, onClose }` and owns nothing else; the carousel decides when it is open and closes it whenever `currentIndex` changes, so the dialog can never show a URL that disagrees with the QR code behind it. URLs come from a user-supplied YAML file and are untrusted: `isOpenable` allowlists `http:`/`https:`, and anything else renders as text with no Open button. `window.open` always gets `noopener,noreferrer`.

Gesture split on the QR image: a mouse click opens the dialog, but on touch only a 500ms press does. A tap must not open it, because the carousel swipes on touch and a swipe still emits a trailing `click`. `isTouchInteractionRef` suppresses that trailing click for 600ms after a touch sequence, which is also why a mouse click on a hybrid device still works once the touch has settled.

**Authoring.** `src/App.js` owns the mode (`view` / `edit`) and the in-progress draft; `src/useContactsFile.js` owns the *committed* contacts and the file handle. The hook deliberately exposes no `setContacts` - `save(draft)`/`saveAs(draft)` take the entries and commit them only after the write succeeds, so a denied permission or a failed write cannot leave half-saved data in localStorage. The `FileSystemFileHandle` is session-only (it is not serializable), so after a reload Save is not offered and Save As is the only way to write. Reading a file does not grant writing it: `save` upgrades via `queryPermission`/`requestPermission({ mode: 'readwrite' })`, and the Save click is the user gesture that prompt requires.

**Legacy build-time path.** `yaml-to-json.js` + `src/data/qrdata.js` predate the runtime loader (commit 75d8134 "contact data needed only at runtime"). `qrdata.js` is now imported only by `ContactCarousel.test.js`, and even there it is unused. Treat it as test fixture / dead weight, not as the app's data source. `.gitignore` still lists the pre-rename `src/data/contacts.js`, so the generated `qrdata.js` is committed.

## Tests

`src/ContactCarousel.test.js` covers the happy paths; `src/ContactCarouselNoFsAPI.test.js` exists as a separate file because it destroys `global.window` to simulate a browser without the File System Access API, which cannot coexist with the other file's `window` mocking. Several error-path tests in `ContactCarousel.test.js` are commented out.

Both suites replace `global.window` wholesale in `beforeEach`/render — when adding tests, mock `window.showOpenFilePicker` the same way rather than assuming jsdom's window survives.

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

**Version footer.** `src/VersionFooter.js` renders `REACT_APP_VERSION` and `REACT_APP_BUILD_TIME`, read at render (not module load) so tests can set them and a missing value degrades to `vdev`. The npm `start`, `build`, and `build-gh-pages` scripts inject both; running `npx react-scripts start` directly bypasses that and shows `vdev`.

**`homepage` changes the asset path.** `package.json` sets `homepage` to the GitHub Pages URL, so `PUBLIC_URL` is `/qrousel` and the dev server serves assets at `/qrousel/static/js/bundle.js`. Requesting `/static/js/bundle.js` returns `index.html` via the SPA fallback with a 200 - a smoke test that curls that path proves nothing.

## Deployment

GitHub Pages via `gh-pages`. `homepage` is hardcoded in `package.json` (`https://reachpersona.github.io/qrousel/`) — change it there when deploying to a different repo. Note the README describes a `REACT_APP_GH_PAGES` env var and a `build-gh-pages` script that rewrites `homepage`; neither exists in the current code (`build-gh-pages` is a plain `react-scripts build`, and the URL argument `predeploy` passes it is ignored).
