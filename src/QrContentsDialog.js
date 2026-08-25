import React, { useState, useEffect } from 'react';

// URLs come from a user-supplied YAML file, so they are untrusted input. Only
// http(s) may be navigated to - anything else (javascript:, data:, file:) is
// shown as text and never handed to window.open.
const OPENABLE_PROTOCOLS = ['http:', 'https:'];

export function isOpenable(url) {
  try {
    return OPENABLE_PROTOCOLS.includes(new URL(url).protocol);
  } catch (e) {
    return false;
  }
}

function QrContentsDialog({ url, onClose }) {
  const [copyStatus, setCopyStatus] = useState(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
    } catch (e) {
      setCopyStatus('failed');
    }
  };

  const openUrl = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Only a click on the backdrop itself dismisses; clicks inside the dialog
  // bubble up here with a different target and must be ignored.
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="qr-dialog-backdrop"
      data-testid="qr-dialog-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="qr-dialog" role="dialog" aria-modal="true" aria-label="QR code contents">
        <div className="qr-dialog-header">
          <h2 className="qr-dialog-title">QR contents</h2>
          <button className="qr-dialog-close" aria-label="Close" onClick={onClose}>
            &times;
          </button>
        </div>
        <p className="qr-dialog-url">{url}</p>
        <div className="qr-dialog-actions">
          <button onClick={copyUrl}>Copy URL</button>
          {isOpenable(url) ? (
            <button onClick={openUrl}>Open &#8599;</button>
          ) : (
            <span className="qr-dialog-note">
              This link will not be opened - only http and https addresses can be opened.
            </span>
          )}
        </div>
        {copyStatus === 'copied' && <p role="status">Copied</p>}
        {copyStatus === 'failed' && (
          <p role="status">Copy failed - select the URL above and copy it manually.</p>
        )}
      </div>
    </div>
  );
}

export default QrContentsDialog;
