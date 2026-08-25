import React, { useState } from 'react';
import Modal from './Modal';
import './QrContentsDialog.css';

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

const MAX_NAME_LENGTH = 40;

/**
 * A download name that says something about the code. Payloads are arbitrary
 * user text, so everything outside a safe set becomes a separator and the
 * result is capped - a 300-character payload must not become the file name.
 */
export function qrImageFileName(payload) {
  const text = String(payload == null ? '' : payload);

  let stem = '';
  try {
    const parsed = new URL(text);
    if (OPENABLE_PROTOCOLS.includes(parsed.protocol)) {
      stem = parsed.hostname;
    }
  } catch (e) {
    // Not a URL; fall through to slugifying the raw payload.
  }

  if (!stem) stem = text;

  const slug = stem
    .slice(0, MAX_NAME_LENGTH)
    .replace(/[^a-zA-Z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug ? `qr-${slug}.png` : 'qr.png';
}

function QrContentsDialog({ url, imageDataUrl, onClose }) {
  // The placeholder shown when generation failed is not a QR code, so there is
  // nothing worth handing back as a file.
  const isSaveable = Boolean(imageDataUrl) && String(imageDataUrl).startsWith('data:image/');
  const [copyStatus, setCopyStatus] = useState(null);

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

  return (
    <Modal title="QR contents" onClose={onClose} testId="qr-dialog-backdrop">
      <p className="qr-dialog-url">{url}</p>
      <div className="modal-actions">
        <button onClick={copyUrl}>Copy URL</button>
        {isSaveable && (
          <a className="qr-dialog-save" href={imageDataUrl} download={qrImageFileName(url)}>
            Save image
          </a>
        )}
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
    </Modal>
  );
}

export default QrContentsDialog;
