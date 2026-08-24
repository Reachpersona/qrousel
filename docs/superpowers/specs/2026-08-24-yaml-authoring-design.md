# QRousel: create and save qrdata.yaml from the app

Date: 2026-08-24
Status: proposed

## Goal

Let a user build and maintain a `qrdata.yaml` inside QRousel instead of hand-editing
YAML in a text editor and running `npm run yaml-to-json`. Two entry points, one editor:

- Open an existing `qrdata.yaml`, revise it, save it back to the same file.
- Start with nothing loaded and build a file from scratch.

## Non-goals

- Replacing the existing load path. Loading stays as it is; authoring is added beside it.
- Any change to the file format. The saved file must remain a plain YAML array of
  `{ url, description }`, readable by the current loader and by `yaml-to-json.js`.
- Multi-file management, undo history, or drag-and-drop reordering.
- Browsers without the File System Access API. Authoring is Chromium-only, matching the
  existing loader. Those browsers keep the current read-only behaviour and are told why.

## Payload rules

`url` may hold **any QR payload**, not just a web address: `mailto:`, `tel:`, `sms:`,
`geo:`, `WIFI:S=...;`, a vCard block, or plain text. The only validation rule is that a
url is non-empty after trimming. `description` is optional and may be empty.

This is deliberate. QR codes routinely carry non-URL payloads, and rejecting them would
make the app unable to author perfectly ordinary codes. The consequence is that the
editor cannot distinguish a typo'd URL from an intentional non-URL payload, and does not
try. `QrContentsDialog.isOpenable` already handles the safety half of this: non-http(s)
payloads render as text with no Open button.

## Architecture

Today `ContactCarousel` owns everything: loading, parsing, localStorage, QR generation,
navigation, and the reveal dialog. Both the viewer and the editor need the load/save
rules, so those rules move out rather than being reimplemented or reached into.

```
index.js
└── App.js                  owns mode: 'view' | 'edit'
    ├── useContactsFile()   contacts, file handle, load, save, persistence
    ├── ContactCarousel     viewer; receives contacts, renders QR + dialog
    └── ContactEditor       list editor; receives contacts + onChange/onSave
```

**`src/useContactsFile.js`** — the single owner of *committed* contact data and its file.
Exposes `{ contacts, fileName, canSaveInPlace, load, save, saveAs, error }`, where
`save(draft)` and `saveAs(draft)` take the entries to write and commit them only on
success. It owns the `FileSystemFileHandle`, the localStorage mirror, and the corrupt-data
recovery that currently lives in the carousel's mount effect.

Ownership is split deliberately: the hook holds what has been saved, `App` holds the
in-progress draft. There is no `setContacts` — nothing can push uncommitted edits into the
committed state, which is what makes the persistence ordering below enforceable rather
than merely intended.

**`src/fileHandleStore.js`** — a small IndexedDB wrapper, `getHandle()` / `putHandle()` /
`clearHandle()`. Needed because a `FileSystemFileHandle` is not JSON-serializable and
therefore cannot live in localStorage next to the contacts. Without it, every page reload
would silently downgrade Save to Save As.

**`src/ContactEditor.js`** — presentational. Receives the working copy and callbacks;
owns no file or storage logic. One row per entry with url and description fields, move
up/down, delete; plus Add entry, Save, Save As, and Done.

**`src/ContactCarousel.js`** — loses `loadContactsFromFile`, the localStorage effects, and
its own `contacts` state; receives `contacts` as a prop. Keeps QR generation, description
rendering, navigation, gestures, and the reveal dialog. This is a real reduction to a
component that is already carrying five chained effects.

## Serialization

`yaml.dump(contacts, { lineWidth: -1 })`. Verified: js-yaml already emits `|` block
scalars for multiline descriptions, leaves single-line values plain, and round-trips
`load(dump(x)) === x`. `lineWidth: -1` prevents long URLs from being folded across lines.
No custom serializer.

## File handle and permissions

Reading a file does not grant permission to write it. The existing picker takes read
access only, so saving needs an explicit upgrade:

1. On load, request the handle with `showOpenFilePicker` and store it via `putHandle()`.
2. On Save, call `handle.queryPermission({ mode: 'readwrite' })`.
   - `granted` — write.
   - `prompt` — call `requestPermission({ mode: 'readwrite' })`; the Save click is the
     required user gesture. If the result is not `granted`, treat as denied.
   - `denied` — do not write. Surface the reason and leave Save As available.
3. Write with `createWritable()`, `write(text)`, `close()`.

A denied or failed permission must leave the user's edits intact and still editable.

## Save semantics

- **Save** — writes to the remembered handle. Disabled, with a visible reason, when there
  is no handle (a file built from scratch, or a handle whose permission was denied).
- **Save As** — `showSaveFilePicker` with a suggested name of `qrdata.yaml`; on success
  the returned handle replaces the remembered one, so subsequent Saves go to the new file.

## Persistence ordering

Edits live in a draft inside `App`; the committed `contacts` in the hook are untouched
while editing. Nothing reaches localStorage or the viewer until a write succeeds. Inside
`save(draft)`, on success and only then:

1. Commit the draft to `contacts`.
2. Mirror it to `localStorage.contactsData`.
3. Clear the dirty flag.

This is the "validate before persisting" rule: a denied permission or a failed write must
not leave half-saved data in localStorage with no UI path to correct it. The failure path
keeps the editor open with the edits still present.

## Unsaved changes

A dirty flag is set on any edit and cleared only on a successful save.

- **Done** with unsaved changes — confirm before discarding.
- **Load a different file** with unsaved changes — confirm before discarding.
- **Closing the tab** with unsaved changes — `beforeunload` warning.

## Errors and recovery

Every failure keeps the user's data and explains itself in the UI, never only in the
console:

| Situation | Behaviour |
|---|---|
| Write permission denied | Editor stays open with edits intact; message explains Save As is still available |
| Write fails mid-save | Same; localStorage untouched, so the last good state survives |
| Handle in IndexedDB but file was moved or deleted | Save falls back to Save As with an explanation |
| IndexedDB unavailable (private mode) | Authoring still works for the session; Save degrades to Save As, stated up front rather than at save time |
| File System Access API absent | Editor is not offered; existing unsupported-browser message explains why |
| Empty url on save | Save blocked, offending rows flagged inline; nothing is written |

## Testing

Positive coverage: add, edit, delete, reorder, save to an existing handle, Save As to a
new handle, build from empty, round-trip a loaded file unchanged.

Negative assertions, one per no-op branch, each asserting the absence of the work:

- Save with an empty url does **not** call `createWritable` and does **not** touch localStorage.
- A denied `requestPermission` does **not** write and does **not** clear the dirty flag.
- A failed write does **not** update localStorage.
- Cancelling `showSaveFilePicker` does **not** change the remembered handle.
- Declining the discard confirmation does **not** leave edit mode.
- Moving the first entry up, or the last entry down, does **not** reorder anything.
- Editing without saving does **not** change what the viewer renders.

Each guard is then mutation-checked: removing the guard must fail exactly the test that
covers it. `showOpenFilePicker`, `showSaveFilePicker`, `createWritable`, and the
permission methods are faked; `js-yaml` is used for real so serialization is genuinely
exercised.

## Consequences

- `index.js` renders `App` rather than `ContactCarousel`; existing carousel tests must
  supply contacts as a prop or render through `App`.
- `yaml-to-json.js` and `src/data/qrdata.js` remain dead, and this change does not revive
  them. Worth deleting separately.
- The README's manual "edit YAML, run the script" workflow is superseded for authoring but
  remains valid; updating it is follow-up work, not part of this change.

## Open question for review

IndexedDB handle persistence is the largest single piece of new surface here, and it
exists only so that Save survives a page reload. The alternative is to hold the handle in
memory for the session and, after a reload, show that Save will need Save As once. That
removes a module and an async failure mode at the cost of re-picking the file after each
refresh. Say so at review if you would rather start without it.
