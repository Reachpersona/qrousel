import React from 'react';
import Modal from './Modal';
import './HelpDialog.css';

function HelpDialog({ onClose }) {
  return (
    <Modal title="Help" onClose={onClose} testId="help-dialog">
      <dl className="help">
        <dt>See a QR code&rsquo;s contents</dt>
        <dd>Click it, or press and hold on a touch screen. Only http and https links can be opened.</dd>

        <dt>Move between codes</dt>
        <dd>Use &lt; and &gt;, or swipe sideways.</dd>

        <dt>Edit</dt>
        <dd>Change, add, delete, and reorder entries. An entry can hold any QR payload, not just a web address.</dd>

        <dt>Save vs Save As</dt>
        <dd>
          Save writes back to the file you opened. Save As writes a new file and leaves the
          original alone.
        </dd>

        <dt>Saving drops comments</dt>
        <dd>
          The file is rewritten from scratch, so comments, blank lines, and quoting style are
          lost. Entries are kept.
        </dd>

        <dt>After a page reload</dt>
        <dd>Your entries are remembered, but the link to the file is not - use Save As.</dd>

        <dt>Switch</dt>
        <dd>Open a different qrdata.yaml.</dd>
      </dl>
      <p className="help-note">Opening and saving files needs Chrome or Edge.</p>
    </Modal>
  );
}

export default HelpDialog;
