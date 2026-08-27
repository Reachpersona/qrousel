import React from 'react';
import Modal from './Modal';
import './QrContentsHelp.css';

/**
 * What may be typed into the contents field, and what the viewer will offer to
 * do with it. The list here must stay in step with OPEN_LABELS in
 * QrContentsDialog: teaching a scheme the viewer will not act on produces a
 * code with a dead button, which is the failure that allowlist exists to
 * prevent.
 */
function QrContentsHelp({ onClose }) {
  return (
    <Modal title="What a code can hold" onClose={onClose} testId="payload-help-dialog">
      <div className="payload-help">
        <p className="payload-help-lead">
          A code can hold anything. These are the ones the viewer offers a button for when you
          tap the code:
        </p>

        <dl>
          <dt>A web address</dt>
          <dd>
            <code>https://example.com</code>
            <span>Opens in a new tab.</span>
          </dd>

          <dt>A phone number</dt>
          <dd>
            <code>+15551234567</code>
            <span>
              Just the number, starting with + and the country code - no spaces needed, though
              <code>+1 555-123-4567</code> works too. Offers to call it. Writing it as{' '}
              <code>tel:+15551234567</code> also works here, but some phone scanners get that
              wrong and dial the word &ldquo;tel&rdquo; along with the number, so the plain
              number is the safer thing to put in a code.
            </span>
          </dd>

          <dt>An email</dt>
          <dd>
            <code>mailto:you@example.com?subject=Hello&amp;body=Hi%20there</code>
            <span>
              Opens a new message, already filled in. Both <code>subject</code> and{' '}
              <code>body</code> are optional.
            </span>
          </dd>

          <dt>A text message</dt>
          <dd>
            <code>sms:+15551234567?body=Hello</code>
            <span>
              Opens a new text, already written. <strong>Android</strong> wants{' '}
              <code>?body=</code> and an <strong>iPhone</strong> wants <code>&amp;body=</code>,
              and there is no spelling that fills in the message on both - so if the code has
              to work everywhere, put the number only.
            </span>
          </dd>
        </dl>

        <h3 className="payload-help-heading">Two worth knowing</h3>
        <dl>
          <dt>A place on a map</dt>
          <dd>
            <code>https://maps.google.com/?q=12.9716,77.5946</code>
            <span>
              Write it as a web address like this. It works on every phone, and shows a map
              page even when no maps app is installed.
            </span>
          </dd>

          <dt>A WhatsApp message</dt>
          <dd>
            <code>https://wa.me/15551234567?text=Hello%20there</code>
            <span>
              Digits only in the number - no + and no spaces. Works on a computer as well as a
              phone, and offers to install WhatsApp if it is missing.
            </span>
          </dd>
        </dl>

        <h3 className="payload-help-heading">Writing the message</h3>
        <ul className="payload-help-tips">
          <li>
            A space has to be written <code>%20</code>, and a new line <code>%0A</code>. A real
            space may be dropped.
          </li>
          <li>
            The longer the message, the denser the code and the harder it is for a camera to
            read. Keep it short.
          </li>
          <li>
            Anything else - a note, wifi details, a contact card - is fine. It is shown as text
            when the code is tapped, with no button.
          </li>
        </ul>
      </div>
    </Modal>
  );
}

export default QrContentsHelp;
