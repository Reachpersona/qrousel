import React, { useState, useEffect, useCallback } from 'react';
import useContactsFile, { findInvalidEntries } from './useContactsFile';
import ContactCarousel from './ContactCarousel';
import ContactEditor from './ContactEditor';
import OverwriteWarning from './OverwriteWarning';

const NO_HANDLE_REASON =
  'Save As is the only way to write this file. Either it has not been saved yet, or the link to it was lost when the page reloaded.';

const SAVE_FAILURE_MESSAGES = {
  invalid: 'Nothing was saved. Every entry needs something to encode.',
  denied:
    'Permission to write the file was refused, so nothing was saved. Your edits are still here - use Save As to write them somewhere else.',
  'no-handle': NO_HANDLE_REASON,
  unsupported: 'This browser cannot save files. Your edits are still here.',
};

function App() {
  const { contacts, error, fileName, canSaveInPlace, isForeignFile, load, save, saveAs, clearError } =
    useContactsFile();

  const [mode, setMode] = useState('view');
  const [draft, setDraft] = useState([]);
  const [invalid, setInvalid] = useState([]);
  const [status, setStatus] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isOverwriteWarningOpen, setIsOverwriteWarningOpen] = useState(false);

  // Warn before the tab closes on unsaved edits.
  useEffect(() => {
    if (!isDirty) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const enterEditor = (entries, dirty) => {
    setDraft(entries);
    setInvalid([]);
    setStatus(null);
    setIsDirty(dirty);
    setMode('edit');
  };

  const editLoaded = () => enterEditor(contacts.map((contact) => ({ ...contact })), false);
  const createNew = () => enterEditor([{ url: '', description: '' }], true);

  const handleChange = (entries) => {
    setDraft(entries);
    setIsDirty(true);
    setInvalid([]);
    setStatus(null);
  };

  const applyResult = (result) => {
    if (result.ok) {
      setIsDirty(false);
      setInvalid([]);
      setStatus({ tone: 'ok', message: 'Saved.' });
      return;
    }
    if (result.reason === 'cancelled') return;
    setInvalid(result.invalid || []);
    setStatus({
      tone: 'error',
      message: SAVE_FAILURE_MESSAGES[result.reason] || `Nothing was saved: ${result.message}`,
    });
  };

  const writeInPlace = async () => {
    setIsOverwriteWarningOpen(false);
    applyResult(await save(draft));
  };

  const handleSave = async () => {
    // Reject unusable entries before asking about anything else: there is no
    // point warning about overwriting a file with data that will not be
    // written either way.
    const invalidEntries = findInvalidEntries(draft);
    if (invalidEntries.length > 0) {
      applyResult({ ok: false, reason: 'invalid', invalid: invalidEntries });
      return;
    }
    // Rewriting someone else's file discards their comments, so ask first -
    // once per file, not on every save.
    if (isForeignFile) {
      setIsOverwriteWarningOpen(true);
      return;
    }
    await writeInPlace();
  };

  const handleSaveAs = async () => {
    setIsOverwriteWarningOpen(false);
    applyResult(await saveAs(draft));
  };

  const confirmDiscard = useCallback(() => {
    if (!isDirty) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  }, [isDirty]);

  const handleDone = () => {
    if (!confirmDiscard()) return;
    setIsDirty(false);
    setMode('view');
  };

  const handleLoad = async () => {
    if (!confirmDiscard()) return;
    clearError();
    await load();
  };

  if (mode === 'edit') {
    return (
      <>
        <ContactEditor
          entries={draft}
          invalid={invalid}
          status={status}
          canSaveInPlace={canSaveInPlace}
          saveDisabledReason={NO_HANDLE_REASON}
          onChange={handleChange}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onDone={handleDone}
        />
        {isOverwriteWarningOpen && (
          <OverwriteWarning
            fileName={fileName}
            onConfirm={writeInPlace}
            onSaveAs={handleSaveAs}
            onCancel={() => setIsOverwriteWarningOpen(false)}
          />
        )}
      </>
    );
  }

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
        <button onClick={handleLoad}>Select qrdata.yaml</button>
        <button onClick={createNew}>Create a new qrdata.yaml</button>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div>
        <div>No contacts available. Please select a file.</div>
        <button onClick={handleLoad}>Select qrdata.yaml</button>
        <button onClick={createNew}>Create a new qrdata.yaml</button>
      </div>
    );
  }

  return (
    <ContactCarousel
      contacts={contacts}
      fileName={fileName}
      onLoadFile={handleLoad}
      onEdit={editLoaded}
    />
  );
}

export default App;
