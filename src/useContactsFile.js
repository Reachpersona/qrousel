import { useState, useEffect, useRef, useCallback } from 'react';
import yaml from 'js-yaml';

const STORAGE_KEY = 'contactsData';

export const UNSUPPORTED_MESSAGE = 'File System Access API is not supported in this browser.';
export const CORRUPT_STORAGE_MESSAGE =
  'Saved contact data was invalid and has been cleared. Please select your qrdata.yaml file again.';

const YAML_FILE_TYPE = {
  description: 'YAML Files',
  accept: { 'application/x-yaml': ['.yaml', '.yml'] },
};

// A QR code can carry anything - mailto:, tel:, WIFI:S=...;, a vCard, plain
// text - so the only rule is that an entry actually has a payload.
export function findInvalidEntries(entries) {
  const invalid = [];
  entries.forEach((entry, index) => {
    if (!String(entry.url == null ? '' : entry.url).trim()) {
      invalid.push(index);
    }
  });
  return invalid;
}

export function serializeContacts(entries) {
  // js-yaml already emits `|` block scalars for multiline descriptions.
  // lineWidth: -1 stops long URLs being folded across lines.
  return yaml.dump(entries, { lineWidth: -1 });
}

async function writeEntries(fileHandle, entries) {
  const writable = await fileHandle.createWritable();
  await writable.write(serializeContacts(entries));
  await writable.close();
}

/**
 * Owns the contacts that have been *committed* - loaded from a file or
 * successfully saved to one - along with the file handle they came from.
 *
 * There is deliberately no setContacts: nothing can push uncommitted edits into
 * committed state. save(entries) and saveAs(entries) take the entries to write
 * and commit them only after the write succeeds, which is what keeps a denied
 * permission or a failed write from leaving half-saved data behind.
 */
export default function useContactsFile() {
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [canSaveInPlace, setCanSaveInPlace] = useState(false);
  // Held for the session only. A FileSystemFileHandle is not serializable, so
  // after a reload there is no link to the original file and Save As is the
  // only way to write.
  const fileHandleRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setContacts(JSON.parse(saved));
    } catch (e) {
      setError(CORRUPT_STORAGE_MESSAGE);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Adopting a file is one step, not three: a handle that is remembered while
  // canSaveInPlace still says otherwise is a state the UI cannot report.
  const rememberFile = useCallback((fileHandle, name) => {
    fileHandleRef.current = fileHandle;
    setCanSaveInPlace(true);
    setFileName(name || fileHandle.name || null);
  }, []);

  const commit = useCallback((entries) => {
    setContacts(entries);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, []);

  const load = useCallback(async () => {
    try {
      if (!('showOpenFilePicker' in window)) {
        throw new Error(UNSUPPORTED_MESSAGE);
      }
      const [fileHandle] = await window.showOpenFilePicker({ types: [YAML_FILE_TYPE] });
      const file = await fileHandle.getFile();
      const parsed = yaml.load(await file.text());

      rememberFile(fileHandle, fileHandle.name || file.name);
      commit(parsed || []);
      setError(null);
      return { ok: true };
    } catch (e) {
      console.error('Error loading qrdata.yaml:', e);
      setError(e.message);
      return { ok: false, reason: 'load-failed', message: e.message };
    }
  }, [commit, rememberFile]);

  const save = useCallback(
    async (entries) => {
      const invalid = findInvalidEntries(entries);
      if (invalid.length > 0) return { ok: false, reason: 'invalid', invalid };

      const fileHandle = fileHandleRef.current;
      if (!fileHandle) return { ok: false, reason: 'no-handle' };

      try {
        // Read access does not imply write access; the Save click is the user
        // gesture the permission prompt requires.
        let permission = await fileHandle.queryPermission({ mode: 'readwrite' });
        if (permission === 'prompt') {
          permission = await fileHandle.requestPermission({ mode: 'readwrite' });
        }
        if (permission !== 'granted') return { ok: false, reason: 'denied' };

        await writeEntries(fileHandle, entries);
        commit(entries);
        return { ok: true };
      } catch (e) {
        console.error('Error saving qrdata.yaml:', e);
        return { ok: false, reason: 'write-failed', message: e.message };
      }
    },
    [commit]
  );

  const saveAs = useCallback(
    async (entries) => {
      const invalid = findInvalidEntries(entries);
      if (invalid.length > 0) return { ok: false, reason: 'invalid', invalid };

      if (!('showSaveFilePicker' in window)) {
        return { ok: false, reason: 'unsupported', message: UNSUPPORTED_MESSAGE };
      }

      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: 'qrdata.yaml',
          types: [YAML_FILE_TYPE],
        });
        await writeEntries(fileHandle, entries);

        // Only adopt the new file once the write actually landed.
        rememberFile(fileHandle);
        commit(entries);
        return { ok: true };
      } catch (e) {
        if (e.name === 'AbortError') return { ok: false, reason: 'cancelled' };
        console.error('Error saving qrdata.yaml:', e);
        return { ok: false, reason: 'write-failed', message: e.message };
      }
    },
    [commit, rememberFile]
  );

  const clearError = useCallback(() => setError(null), []);

  return { contacts, error, fileName, canSaveInPlace, load, save, saveAs, clearError };
}
