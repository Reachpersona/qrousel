import React from 'react';
import './ContactEditor.css';

// Pure so the end-of-list guard is reachable and testable. The buttons are also
// disabled at the ends, which means a click can never reach this guard through
// the UI - without this being a function of its own, the branch would be
// untestable and its mutation would survive.
export function moveEntryAt(entries, index, offset) {
  const target = index + offset;
  // Moving the first entry up or the last one down is a no-op, not a wrap.
  if (target < 0 || target >= entries.length) return entries;
  const reordered = [...entries];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  return reordered;
}

/**
 * Presentational list editor. Owns no file, storage, or draft state - it
 * receives the entries and reports every change back through onChange.
 */
function ContactEditor({
  entries,
  invalid,
  status,
  canSaveInPlace,
  saveDisabledReason,
  onChange,
  onSave,
  onSaveAs,
  onDone,
}) {
  const updateEntry = (index, field, value) => {
    onChange(entries.map((entry, i) => (i === index ? { ...entry, [field]: value } : entry)));
  };

  const addEntry = () => {
    onChange([...entries, { url: '', description: '' }]);
  };

  const deleteEntry = (index) => {
    onChange(entries.filter((entry, i) => i !== index));
  };

  const moveEntry = (index, offset) => onChange(moveEntryAt(entries, index, offset));

  return (
    <div className="ContactEditor">
      <h1 className="editor-title">Edit qrdata.yaml</h1>

      {status && (
        <p role="status" className={`editor-status editor-status-${status.tone}`}>
          {status.message}
        </p>
      )}

      {entries.length === 0 && (
        <p className="editor-empty">No entries yet. Add one to get started.</p>
      )}

      <ol className="editor-entries">
        {entries.map((entry, index) => (
          <li key={index} className="editor-entry">
            <label className="editor-field">
              <span>QR contents</span>
              <input
                type="text"
                value={entry.url || ''}
                aria-label={`QR contents for entry ${index + 1}`}
                aria-invalid={invalid.includes(index)}
                onChange={(e) => updateEntry(index, 'url', e.target.value)}
              />
            </label>
            {invalid.includes(index) && (
              <p className="editor-entry-error">
                An entry needs something to encode - a URL, or any other QR payload.
              </p>
            )}
            <label className="editor-field">
              <span>Description</span>
              <textarea
                rows={3}
                value={entry.description || ''}
                aria-label={`Description for entry ${index + 1}`}
                onChange={(e) => updateEntry(index, 'description', e.target.value)}
              />
            </label>
            <div className="editor-entry-actions">
              <button
                aria-label={`Move entry ${index + 1} up`}
                disabled={index === 0}
                onClick={() => moveEntry(index, -1)}
              >
                &uarr;
              </button>
              <button
                aria-label={`Move entry ${index + 1} down`}
                disabled={index === entries.length - 1}
                onClick={() => moveEntry(index, 1)}
              >
                &darr;
              </button>
              <button aria-label={`Delete entry ${index + 1}`} onClick={() => deleteEntry(index)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ol>

      <div className="editor-actions">
        <button onClick={addEntry}>+ Add entry</button>
        {canSaveInPlace ? (
          <button onClick={onSave}>Save</button>
        ) : (
          <p className="editor-note">{saveDisabledReason}</p>
        )}
        <button onClick={onSaveAs}>Save As&hellip;</button>
        <button onClick={onDone}>Done</button>
      </div>
    </div>
  );
}

export default ContactEditor;
