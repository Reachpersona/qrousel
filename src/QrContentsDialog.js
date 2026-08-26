import React, { useState } from 'react';
import Modal from './Modal';
import './QrContentsDialog.css';

// Loaded as a page in a new tab. Everything else below is handed to the
// device instead - see openUrl.
const WEB_PROTOCOLS = ['http:', 'https:'];

// Payloads come from a user-supplied YAML file, so they are untrusted input,
// and this list is deliberately an allowlist rather than a list of things to
// block. The one that matters is javascript:, which window.open would run in
// this page's origin, where localStorage.contactsData is readable; data: and
// intent: are the same class of problem. A blocklist of those would have to
// keep up with every scheme every browser adds, so anything not named here is
// shown as text and never navigated to.
//
// The label is the promise the button makes: "Open" tells someone nothing
// about the dialer that is about to appear.
const OPEN_LABELS = new Map([
  ['http:', 'Open'],
  ['https:', 'Open'],
  ['tel:', 'Call'],
  ['mailto:', 'Email'],
  ['sms:', 'Text'],
  ['geo:', 'Show on map'],
]);

function protocolOf(url) {
  try {
    return new URL(url).protocol;
  } catch (e) {
    // Not a URL at all - plain text, a vCard, a WIFI: block someone's scanner
    // understands. Nothing to open.
    return null;
  }
}

/**
 * What pressing the button will do, or null if there is no button. Note that a
 * QR-only convention like WIFI:S=home;; parses as a URL and reports a protocol
 * of wifi:, so it is excluded by not being in the list rather than by failing
 * to parse.
 */
export function openLabel(url) {
  const protocol = protocolOf(url);
  return (protocol && OPEN_LABELS.get(protocol)) || null;
}

export function isOpenable(url) {
  return openLabel(url) !== null;
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
    // Only a web address has a host worth naming the file after.
    if (WEB_PROTOCOLS.includes(parsed.protocol)) {
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

  const label = openLabel(url);
  const isWebAddress = WEB_PROTOCOLS.includes(protocolOf(url));

  const openUrl = () => {
    if (isWebAddress) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    // tel:, mailto:, sms: and geo: are handed to the operating system rather
    // than loaded as a page. A new tab would be left blank, or torn down the
    // instant the handler takes over, so these go through a link click - which
    // is also what keeps them out of the popup blocker.
    const link = document.createElement('a');
    link.href = url;
    document.body.appendChild(link);
    link.click();
    link.remove();
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
        {label ? (
          <button onClick={openUrl}>
            {label}
            {isWebAddress && ' \u2197'}
          </button>
        ) : (
          <span className="qr-dialog-note">
            Shown as text only. Web addresses, phone numbers, email, text messages, and map
            locations can be opened - nothing else.
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
