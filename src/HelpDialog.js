import React from 'react';
import Modal from './Modal';
import './HelpDialog.css';

/**
 * Which deployment is being viewed. The app is served from more than one host
 * at the same path, so the host is the part that actually distinguishes them.
 */
export function appAddress(location) {
  if (!location || !location.host) return null;
  return `${location.host}${location.pathname || '/'}`;
}

function HelpDialog({ onClose }) {
  const address = appAddress(typeof window === 'undefined' ? null : window.location);

  return (
    <Modal title="Help" onClose={onClose} testId="help-dialog">
      {address && (
        <p className="help-note help-address" data-testid="help-address">
          Installed from <span className="help-address-value">{address}</span>
        </p>
      )}
      <p className="help-note">Opening and saving files needs Chrome or Edge.</p>
      <dl className="help">
        <dt>See a QR code&rsquo;s contents</dt>
        <dd>
          Click it, or press and hold on a touch screen. Only http and https links can be
          opened.
        </dd>

        <dt>Move between codes</dt>
        <dd>Use &lt; and &gt;, or swipe sideways.</dd>

        <dt>Switch</dt>
        <dd>Open a different qrdata.yaml.</dd>

        <dt>Edit</dt>
        <dd>
          Change, add, delete, and reorder entries. An entry can hold any QR payload, not just
          a web address.
        </dd>

        <dt>Save As</dt>
        <dd>Recommended - writes a new file and leaves the original intact.</dd>

        <dt>Save</dt>
        <dd>
          Overwrites the currently loaded file. Entries are kept, but comments, blank lines,
          and quoting style are lost, since the file is rewritten from scratch.
        </dd>

        <dt>After a page reload</dt>
        <dd>Your entries are remembered, but the link to the file is not - use Save As.</dd>
      </dl>
    </Modal>
  );
}

export default HelpDialog;
