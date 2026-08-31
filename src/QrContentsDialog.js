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
//
// geo: is deliberately absent. Android handles it, iOS does not, and there is
// no way to ask the device which it is - the button would silently do nothing
// on every iPhone. https://maps.google.com/?q=lat,lon is a plain web address
// that already works everywhere, and the same is true of wa.me for WhatsApp:
// where an https form of a deep link exists, it is the better payload.
const OPEN_LABELS = new Map([
  ['http:', 'Open'],
  ['https:', 'Open'],
  ['tel:', 'Call'],
  ['mailto:', 'Email'],
  ['sms:', 'Text'],
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

// Printed numbers carry visual separators that mean nothing, so they come out
// before matching. E.164 allows 8 to 15 digits.
const PHONE_SEPARATORS = /[\s().-]/g;
const E164 = /^\+[1-9]\d{7,14}$/;

/**
 * A bare international number as a dialable string, or null.
 *
 * This exists because some scanners hand a tel: URI to the dialer without
 * stripping the scheme, so the number arrives with "tel" keypad-translated onto
 * the front - a bare number avoids that on every phone. If the app could not
 * act on one, the payload that scans best everywhere would be the one with no
 * button here.
 *
 * The leading + is required. Without it any long run of digits - an order
 * number, a serial, a numeric note - would sprout a call button.
 */
export function callableNumber(payload) {
  const compact = String(payload == null ? '' : payload).replace(PHONE_SEPARATORS, '');
  return E164.test(compact) ? compact : null;
}

/**
 * What pressing the button will do, or null if there is no button: the label,
 * the address to hand over, and whether that address is a page to load rather
 * than something for the device to handle.
 *
 * Note that a QR-only convention like WIFI:S=home;; parses as a URL and reports
 * a protocol of wifi:, so it is excluded by not being in the list rather than
 * by failing to parse.
 */
export function openTarget(url) {
  const protocol = protocolOf(url);
  const label = protocol && OPEN_LABELS.get(protocol);
  if (label) {
    return { label, href: url, isWeb: WEB_PROTOCOLS.includes(protocol) };
  }

  const number = callableNumber(url);
  if (number) {
    // The payload is not a URL, so the dialer needs one built for it - and
    // built from the compacted digits, since a tel: URI may not contain spaces.
    return { label: 'Call', href: `tel:${number}`, isWeb: false };
  }

  return null;
}

export function openLabel(url) {
  const target = openTarget(url);
  return target ? target.label : null;
}

export function isOpenable(url) {
  return openTarget(url) !== null;
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

  const target = openTarget(url);

  const openUrl = () => {
    if (target.isWeb) {
      window.open(target.href, '_blank', 'noopener,noreferrer');
      return;
    }
    // tel:, mailto: and sms: are handed to the operating system rather than
    // loaded as a page. A new tab would be left blank, or torn down the
    // instant the handler takes over, so these go through a link click - which
    // is also what keeps them out of the popup blocker.
    const link = document.createElement('a');
    link.href = target.href;
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
        {target ? (
          <button onClick={openUrl}>
            {target.label}
            {target.isWeb && ' \u2197'}
          </button>
        ) : (
          <span className="qr-dialog-note">
            Shown as text only. Web addresses, phone numbers, email, and text messages can be
            opened - nothing else.
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
