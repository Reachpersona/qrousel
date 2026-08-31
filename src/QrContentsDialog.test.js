import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import QrContentsDialog, { qrImageFileName } from './QrContentsDialog';

const IMAGE = 'data:image/png;base64,iVBORw0KGgo=';

const setClipboard = (value) => {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true });
};

describe('QrContentsDialog', () => {
  it('shows the encoded url', () => {
    render(<QrContentsDialog url="https://example.com/a/long/path?ref=carousel" onClose={() => {}} />);

    expect(screen.getByText('https://example.com/a/long/path?ref=carousel')).toBeInTheDocument();
  });

  it('copies the url to the clipboard', async () => {
    const writeText = jest.fn(() => Promise.resolve());
    setClipboard({ writeText });

    render(<QrContentsDialog url="https://example.com/a" onClose={() => {}} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy url/i }));
    });

    expect(writeText).toHaveBeenCalledWith('https://example.com/a');
    expect(screen.getByText(/copied/i)).toBeInTheDocument();
  });

  it('tells the user to copy manually when the clipboard is unavailable', async () => {
    setClipboard(undefined);

    render(<QrContentsDialog url="https://example.com/a" onClose={() => {}} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy url/i }));
    });

    expect(screen.getByText(/copy failed/i)).toBeInTheDocument();
    expect(screen.queryByText(/copied/i)).not.toBeInTheDocument();
  });
  it('opens http and https urls in a new tab without opener access', async () => {
    const open = jest.fn();
    window.open = open;

    render(<QrContentsDialog url="https://example.com/a" onClose={() => {}} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /open/i }));
    });

    expect(open).toHaveBeenCalledWith('https://example.com/a', '_blank', 'noopener,noreferrer');
  });

  const ACTION_BUTTON = /^(Open|Call|Email|Text)/;

  describe('what it will open', () => {
    let open;
    let linkClicks;

    beforeEach(() => {
      open = jest.fn();
      window.open = open;
      linkClicks = [];
      jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
        linkClicks.push(this.getAttribute('href'));
      });
    });

    const press = async (name) => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name }));
      });
    };

    // The label says what pressing it will do. "Open" on a phone number tells
    // the reader nothing about the dialer that is about to appear.
    it.each([
      ['https://example.com/a', /^Open/],
      ['http://example.com/a', /^Open/],
      ['tel:+15551234567', /^Call$/],
      ['mailto:sales@example.com?subject=Quote', /^Email$/],
      ['sms:+15551234567?body=Hi', /^Text$/],
    ])('offers to act on %s', (url, label) => {
      render(<QrContentsDialog url={url} onClose={() => {}} />);

      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    });

    // A tel: or mailto: is handed to the operating system, not loaded as a
    // page. A new tab would be left blank or torn down the moment the handler
    // takes over, so these go through a link click instead.
    it.each([
      ['tel:+15551234567', /^Call$/],
      ['mailto:sales@example.com', /^Email$/],
      ['sms:+15551234567?body=Hi', /^Text$/],
    ])('hands %s to the device rather than a new tab', async (url, label) => {
      render(<QrContentsDialog url={url} onClose={() => {}} />);

      await press(label);

      expect(linkClicks).toEqual([url]);
      expect(open).not.toHaveBeenCalled();
    });

    it('leaves no link behind after handing a url to the device', async () => {
      render(<QrContentsDialog url="tel:+15551234567" onClose={() => {}} />);

      await press(/^Call$/);

      expect(document.body.querySelector('a[href^="tel:"]')).toBeNull();
    });

    it('does not hand a web address to the device handler', async () => {
      render(<QrContentsDialog url="https://example.com/a" onClose={() => {}} />);

      await press(/^Open/);

      expect(linkClicks).toEqual([]);
      expect(open).toHaveBeenCalledTimes(1);
    });

    // javascript: is the one that matters: window.open would run it in this
    // page's origin, where localStorage.contactsData is readable.
    it.each([
      ['javascript:alert(1)'],
      ['data:text/html,<script>alert(1)</script>'],
      ['file:///etc/passwd'],
      ['intent://scan/#Intent;scheme=zxing;end'],
      ['vbscript:msgbox(1)'],
      ['about:blank'],
      ['chrome://settings'],
    ])('refuses to open %s', (url) => {
      render(<QrContentsDialog url={url} onClose={() => {}} />);

      expect(screen.queryByRole('button', { name: ACTION_BUTTON })).not
        .toBeInTheDocument();
      expect(screen.getByText(/shown as text only/i)).toBeInTheDocument();
      expect(open).not.toHaveBeenCalled();
      expect(linkClicks).toEqual([]);
    });

    // WIFI: and MECARD: are QR conventions a scanner app understands, not URL
    // schemes - but new URL() parses them happily and reports a protocol, so a
    // list built by exclusion would put a dead button on the payloads people
    // most often store.
    it.each([['WIFI:S=home;T=WPA;P=secret;;'], ['MECARD:N:Smith,John;TEL:15551234;;']])(
      'offers no button for the QR-only format %s',
      (url) => {
        render(<QrContentsDialog url={url} onClose={() => {}} />);

        expect(screen.queryByRole('button', { name: ACTION_BUTTON })).not
          .toBeInTheDocument();
        expect(open).not.toHaveBeenCalled();
      }
    );

    // geo: is handled on Android and not on iOS, and there is no way to ask the
    // device which it is. A button that silently does nothing on every iPhone
    // is worse than no button: https://maps.google.com/?q=lat,lon is a plain
    // web address that works everywhere.
    it('offers no button for a geo: location', () => {
      render(<QrContentsDialog url="geo:12.9716,77.5946" onClose={() => {}} />);

      expect(screen.queryByRole('button', { name: ACTION_BUTTON })).not.toBeInTheDocument();
      expect(screen.getByText(/shown as text only/i)).toBeInTheDocument();
      expect(open).not.toHaveBeenCalled();
      expect(linkClicks).toEqual([]);
    });

    it('offers to open a map link written as a web address', () => {
      render(
        <QrContentsDialog url="https://maps.google.com/?q=12.9716,77.5946" onClose={() => {}} />
      );

      expect(screen.getByRole('button', { name: /^Open/ })).toBeInTheDocument();
    });

    // Some scanners hand a tel: URI to the dialer without stripping the scheme,
    // so the number arrives with "tel" keypad-translated onto the front. A bare
    // international number avoids that everywhere, so the app has to be able to
    // act on one - otherwise the payload that scans best has no button here.
    it.each([
      ['+15551234567'],
      ['+1 555-123-4567'],
      ['+1 (555) 123.4567'],
      ['+91 80 4567 8900'],
    ])('offers to call the bare number %s', (url) => {
      render(<QrContentsDialog url={url} onClose={() => {}} />);

      expect(screen.getByRole('button', { name: /^Call$/ })).toBeInTheDocument();
    });

    it('dials a bare number with the separators stripped', async () => {
      render(<QrContentsDialog url="+1 (555) 123-4567" onClose={() => {}} />);

      await press(/^Call$/);

      expect(linkClicks).toEqual(['tel:+15551234567']);
      expect(open).not.toHaveBeenCalled();
    });

    // Requiring the + is what keeps this from swallowing order numbers, serial
    // numbers and numeric notes. Nothing that is text today becomes a button.
    it.each([
      ['15551234567'],
      ['5551234567'],
      ['0015551234567'],
      // No country code starts with a zero, so +0... is not a number anyone can
      // ring - it is far more likely to be an id that happens to carry a plus.
      ['+04086603695'],
      ['order 5551234567'],
      ['+1555123456x'],
    ])('offers no call button for %s', (url) => {
      render(<QrContentsDialog url={url} onClose={() => {}} />);

      expect(screen.queryByRole('button', { name: ACTION_BUTTON })).not.toBeInTheDocument();
    });

    // E.164 is 8 to 15 digits. Test the edges, not the middle.
    it.each([
      ['+12345678', 'calls', true],
      ['+1234567', 'does not call', false],
      ['+123456789012345', 'calls', true],
      ['+1234567890123456', 'does not call', false],
    ])('%s: %s (boundary)', (url, _what, expected) => {
      render(<QrContentsDialog url={url} onClose={() => {}} />);

      const button = screen.queryByRole('button', { name: /^Call$/ });
      expect(Boolean(button)).toBe(expected);
    });

    it('offers no button for plain text', () => {
      render(<QrContentsDialog url="just some notes" onClose={() => {}} />);

      expect(screen.queryByRole('button', { name: ACTION_BUTTON })).not
        .toBeInTheDocument();
    });
  });

  it('still shows the url of a scheme it will not open', () => {
    render(<QrContentsDialog url="javascript:alert(1)" onClose={() => {}} />);

    expect(screen.getByText('javascript:alert(1)')).toBeInTheDocument();
  });
  it('closes when the close button is clicked', () => {
    const onClose = jest.fn();
    render(<QrContentsDialog url="https://example.com/a" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /close/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when the backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<QrContentsDialog url="https://example.com/a" onClose={onClose} />);

    fireEvent.click(screen.getByTestId('qr-dialog-backdrop'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when the dialog body is clicked', () => {
    const onClose = jest.fn();
    render(<QrContentsDialog url="https://example.com/a" onClose={onClose} />);

    fireEvent.click(screen.getByText('https://example.com/a'));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when Escape is pressed', () => {
    const onClose = jest.fn();
    render(<QrContentsDialog url="https://example.com/a" onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on a key other than Escape', () => {
    const onClose = jest.fn();
    render(<QrContentsDialog url="https://example.com/a" onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'a' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('stops listening for Escape once unmounted', () => {
    const onClose = jest.fn();
    const { unmount } = render(<QrContentsDialog url="https://example.com/a" onClose={onClose} />);

    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });
  it('offers the qr image for saving', async () => {
    render(
      <QrContentsDialog url="https://example.com/a" imageDataUrl={IMAGE} onClose={() => {}} />
    );

    const link = screen.getByRole('link', { name: /save image/i });
    expect(link).toHaveAttribute('href', IMAGE);
    expect(link).toHaveAttribute('download', 'qr-example.com.png');
  });

  it('offers nothing to save when there is no generated image', async () => {
    render(<QrContentsDialog url="https://example.com/a" onClose={() => {}} />);

    expect(screen.queryByRole('link', { name: /save image/i })).not.toBeInTheDocument();
  });

  it('offers nothing to save when the code fell back to the placeholder', async () => {
    render(
      <QrContentsDialog
        url="https://example.com/a"
        imageDataUrl="/placeholder.png"
        onClose={() => {}}
      />
    );

    // The placeholder is not a QR code; saving it would hand back a broken file.
    expect(screen.queryByRole('link', { name: /save image/i })).not.toBeInTheDocument();
  });
});

describe('qrImageFileName', () => {
  it('names the file after the host for a web address', () => {
    expect(qrImageFileName('https://example.com/a/long/path?x=1')).toBe('qr-example.com.png');
  });

  it('builds a readable name from a non-web payload', () => {
    // Dots survive, since they are what makes a host readable in the name.
    expect(qrImageFileName('mailto:someone@example.com')).toBe(
      'qr-mailto-someone-example.com.png'
    );
  });

  it('does not run a long payload into an unusable file name', () => {
    const name = qrImageFileName('x'.repeat(300));
    expect(name.length).toBeLessThanOrEqual(64);
    expect(name.endsWith('.png')).toBe(true);
  });

  it('falls back to a plain name for an empty payload', () => {
    expect(qrImageFileName('')).toBe('qr.png');
  });

  it('does not leave separators stranded at the ends', () => {
    expect(qrImageFileName('!!!hello!!!')).toBe('qr-hello.png');
  });
});
