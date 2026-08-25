import React, { useEffect } from 'react';
import './Modal.css';

/**
 * Backdrop, heading, and dismissal for the app's dialogs, so Escape and
 * backdrop-click behave identically everywhere rather than being reimplemented
 * per dialog.
 */
function Modal({ title, onClose, testId, children }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Only a click on the backdrop itself dismisses; clicks inside the dialog
  // bubble up here with a different target and must be ignored.
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" data-testid={testId} onClick={handleBackdropClick}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
