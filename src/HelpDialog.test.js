import React from 'react';
import { render, screen } from '@testing-library/react';
import HelpDialog, { appAddress } from './HelpDialog';

describe('appAddress', () => {
  it('names the host and path the app was served from', () => {
    expect(appAddress({ host: 'weberon.github.io', pathname: '/qrousel/' })).toBe(
      'weberon.github.io/qrousel/'
    );
  });

  it('distinguishes the two deployments', () => {
    expect(appAddress({ host: 'reachpersona.github.io', pathname: '/qrousel/' })).not.toBe(
      appAddress({ host: 'weberon.github.io', pathname: '/qrousel/' })
    );
  });

  it('falls back to the root when there is no path', () => {
    expect(appAddress({ host: 'example.com' })).toBe('example.com/');
  });

  it('reports nothing when there is no host to report', () => {
    // A file:// URL has no host; a bare hostless line would say nothing useful.
    expect(appAddress({ host: '', pathname: '/x' })).toBeNull();
    expect(appAddress(null)).toBeNull();
  });
});

describe('HelpDialog', () => {
  // Which browser you are reading this in decides which half of the help
  // applies, so the help says which one that is rather than leaving the reader
  // to work out whether they are a Chrome person.
  describe('the browser you are using', () => {
    const withFileAccess = () => {
      window.showOpenFilePicker = () => {};
      window.showSaveFilePicker = () => {};
    };

    afterEach(() => {
      delete window.showOpenFilePicker;
      delete window.showSaveFilePicker;
    });

    it('names Chrome and Edge when the browser can write to files', () => {
      withFileAccess();

      render(<HelpDialog onClose={() => {}} />);

      expect(screen.getByTestId('help-browser')).toHaveTextContent(/Chrome or Edge/i);
    });

    it('names the others when it cannot, and says what changes', () => {
      render(<HelpDialog onClose={() => {}} />);

      const note = screen.getByTestId('help-browser');
      expect(note).toHaveTextContent(/Firefox/i);
      expect(note).toHaveTextContent(/Safari/i);
      expect(note).toHaveTextContent(/downloads/i);
    });

    it('marks the note that applies and leaves the other unmarked', () => {
      render(<HelpDialog onClose={() => {}} />);

      const applies = document.querySelectorAll('.help-legend-applies');
      expect(applies).toHaveLength(1);
      expect(applies[0]).toHaveTextContent(/Firefox/i);
      expect(screen.getByTestId('legend-chrome')).not.toHaveClass('help-legend-applies');
    });

    it('marks the Chrome note instead when that is the browser in use', () => {
      withFileAccess();

      render(<HelpDialog onClose={() => {}} />);

      expect(screen.getByTestId('legend-chrome')).toHaveClass('help-legend-applies');
      expect(screen.getByTestId('legend-others')).not.toHaveClass('help-legend-applies');
    });
  });

  describe('marks', () => {
    it('marks Save as the entry that needs Chrome or Edge', () => {
      render(<HelpDialog onClose={() => {}} />);

      const save = Array.from(document.querySelectorAll('.help dt')).find(
        (dt) => dt.textContent.replace(/[*\u2020]/g, '').trim() === 'Save'
      );
      expect(save.querySelector('.help-mark')).toHaveTextContent('*');
    });

    it('marks Save As as the entry that behaves differently elsewhere', () => {
      render(<HelpDialog onClose={() => {}} />);

      const saveAs = Array.from(document.querySelectorAll('.help dt')).find(
        (dt) => dt.textContent.replace(/[*\u2020]/g, '').trim() === 'Save As'
      );
      expect(saveAs.querySelector('.help-mark')).toHaveTextContent('\u2020');
    });

    it('explains every mark it uses', () => {
      render(<HelpDialog onClose={() => {}} />);

      const used = new Set(
        Array.from(document.querySelectorAll('.help .help-mark')).map((m) => m.textContent)
      );
      const explained = new Set(
        Array.from(document.querySelectorAll('.help-legend .help-mark')).map((m) => m.textContent)
      );
      expect(used.size).toBeGreaterThan(0);
      used.forEach((mark) => expect(explained).toContain(mark));
    });
  });

  describe('plain language', () => {
    // "the link to the file is not" described a FileSystemFileHandle to someone
    // who has never heard of one.
    it('explains a reload without talking about links to files', () => {
      render(<HelpDialog onClose={() => {}} />);

      const help = document.querySelector('.help');
      expect(help).toHaveTextContent(/no longer knows which file/i);
      expect(help).not.toHaveTextContent(/link to the file/i);
    });

    it('says what a comment is rather than just naming one', () => {
      render(<HelpDialog onClose={() => {}} />);

      expect(document.querySelector('.help')).toHaveTextContent(/lines starting with #/i);
    });
  });

  it('mentions that an entry can have its own background colour', () => {
    render(<HelpDialog onClose={() => {}} />);

    expect(document.querySelector('.help')).toHaveTextContent(/background colour/i);
  });

  it('explains what printing puts on the page', () => {
    render(<HelpDialog onClose={() => {}} />);

    const help = document.querySelector('.help');
    expect(help).toHaveTextContent(/print/i);
    expect(help).toHaveTextContent(/black and white/i);
  });

  it('shows which deployment is being viewed', () => {
    render(<HelpDialog onClose={() => {}} />);

    expect(screen.getByTestId('help-address')).toHaveTextContent('Installed from localhost/');
  });
});
