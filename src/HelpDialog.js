import React from 'react';
import Modal from './Modal';
import './HelpDialog.css';

function HelpDialog({ onClose }) {
  return (
    <Modal title="Help" onClose={onClose} testId="help-dialog">
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
