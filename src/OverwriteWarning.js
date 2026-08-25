import React from 'react';
import Modal from './Modal';

/**
 * Shown once before the app first rewrites a file it did not author. Saving is
 * not a lossless round-trip: js-yaml discards comments, blank lines, and
 * quoting style, so a hand-written file loses its annotations permanently.
 */
function OverwriteWarning({ fileName, onConfirm, onSaveAs, onCancel }) {
  return (
    <Modal
      title={`Overwrite ${fileName || 'this file'}?`}
      onClose={onCancel}
      testId="overwrite-warning"
    >
      <p>
        Saving rewrites the whole file. Any comments, blank lines, and quoting style in the
        original will be lost - the entries themselves are kept.
      </p>
      <p>Save As writes to a different file and leaves this one untouched.</p>
      <div className="modal-actions">
        <button onClick={onConfirm}>Save anyway</button>
        <button onClick={onSaveAs}>Save As instead</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </Modal>
  );
}

export default OverwriteWarning;
