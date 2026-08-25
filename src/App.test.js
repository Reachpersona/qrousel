import React from 'react';
import { render, screen, act, fireEvent, waitFor, cleanup } from '@testing-library/react';
import yaml from 'js-yaml';
import App from './App';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code')),
}));

if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

const CONTACTS = [
  { url: 'https://example.com/one', description: 'Test Description 1' },
  { url: 'https://example.com/two', description: 'Test Description 2' },
];

describe('App', () => {
  let writes;
  let openPicker;
  let savePicker;

  // A fake file handle that records what was written to it, so tests can assert
  // on the bytes the app produced rather than on whether a mock was called.
  // The browser's requestPermission resolves to 'granted' or 'denied' - never
  // back to 'prompt' - so the fake must not either.
  const makeHandle = (
    name,
    { permission = 'granted', grantOnRequest = true, failWrite = false } = {}
  ) => ({
    name,
    getFile: () => ({ text: () => Promise.resolve(yaml.dump(CONTACTS)) }),
    queryPermission: jest.fn(() => Promise.resolve(permission)),
    requestPermission: jest.fn(() => Promise.resolve(grantOnRequest ? 'granted' : 'denied')),
    createWritable: jest.fn(() => {
      if (failWrite) return Promise.reject(new Error('disk full'));
      return Promise.resolve({
        write: (text) => {
          writes.push({ name, text });
          return Promise.resolve();
        },
        close: () => Promise.resolve(),
      });
    }),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    writes = [];
    openPicker = jest.fn();
    savePicker = jest.fn();
    window.showOpenFilePicker = openPicker;
    window.showSaveFilePicker = savePicker;
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    window.confirm.mockRestore();
  });

  const click = async (name) => {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name }));
    });
  };

  const type = async (label, value) => {
    await act(async () => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    });
  };

  const renderApp = async () => {
    await act(async () => {
      render(<App />);
    });
  };

  const loadFile = async (handle = makeHandle('qrdata.yaml')) => {
    openPicker.mockResolvedValue([handle]);
    await renderApp();
    await click(/Select qrdata\.yaml/i);
    await screen.findByText('Test Description 1');
    return handle;
  };

  describe('loading', () => {
    it('shows the contacts from a selected file', async () => {
      await loadFile();

      expect(screen.getByText('Test Description 1')).toBeInTheDocument();
    });

    it('reports a browser without the file system access api', async () => {
      delete window.showOpenFilePicker;
      await renderApp();

      await click(/Select qrdata\.yaml/i);

      expect(
        screen.getByText('Error: File System Access API is not supported in this browser.')
      ).toBeInTheDocument();
    });

    it('reports a failed load', async () => {
      openPicker.mockRejectedValue(new Error('Failed to load file'));
      await renderApp();

      await click(/Select qrdata\.yaml/i);

      expect(screen.getByText('Error: Failed to load file')).toBeInTheDocument();
    });

    it('does not persist contacts when loading fails', async () => {
      openPicker.mockRejectedValue(new Error('Failed to load file'));
      await renderApp();

      await click(/Select qrdata\.yaml/i);

      expect(localStorage.getItem('contactsData')).toBeNull();
    });

    it('recovers instead of crashing when saved contacts are corrupt', async () => {
      localStorage.setItem('contactsData', '{not json');

      await renderApp();

      expect(screen.getByText(/Saved contact data was invalid/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Select qrdata\.yaml/i })).toBeInTheDocument();
      expect(localStorage.getItem('contactsData')).toBeNull();
    });
  });

  describe('editing', () => {
    it('does not show the editor until asked', async () => {
      await loadFile();

      expect(screen.queryByText('Edit qrdata.yaml')).not.toBeInTheDocument();
    });

    it('opens the editor on the loaded entries', async () => {
      await loadFile();

      await click(/^Edit\b/);

      expect(screen.getByLabelText('QR contents for entry 1')).toHaveValue(
        'https://example.com/one'
      );
    });

    it('can start a new file with nothing loaded', async () => {
      await renderApp();

      await click(/Create a new qrdata\.yaml/i);

      expect(screen.getByText('Edit qrdata.yaml')).toBeInTheDocument();
      expect(screen.getByLabelText('QR contents for entry 1')).toHaveValue('');
    });

    it('adds and deletes entries', async () => {
      await loadFile();
      await click(/^Edit\b/);

      await click(/\+ Add entry/);
      expect(screen.getByLabelText('QR contents for entry 3')).toBeInTheDocument();

      await click(/Delete entry 3/);
      expect(screen.queryByLabelText('QR contents for entry 3')).not.toBeInTheDocument();
    });

    it('reorders entries', async () => {
      await loadFile();
      await click(/^Edit\b/);

      await click(/Move entry 2 up/);

      expect(screen.getByLabelText('QR contents for entry 1')).toHaveValue(
        'https://example.com/two'
      );
    });

    it('does not reorder past the ends of the list', async () => {
      await loadFile();
      await click(/^Edit\b/);

      expect(screen.getByRole('button', { name: /Move entry 1 up/ })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Move entry 2 down/ })).toBeDisabled();
    });

    it('does not change what the viewer shows until the edits are saved', async () => {
      await loadFile();
      await click(/^Edit\b/);
      await type('Description for entry 1', 'Edited but unsaved');

      await click(/^Done$/);

      expect(screen.getByText('Test Description 1')).toBeInTheDocument();
      expect(screen.queryByText('Edited but unsaved')).not.toBeInTheDocument();
    });
  });

  describe('saving', () => {
    it('writes yaml back to the loaded file', async () => {
      await loadFile();
      await click(/^Edit\b/);
      await type('QR contents for entry 1', 'mailto:someone@example.com');

      await click(/^Save$/);

      expect(writes).toHaveLength(1);
      expect(yaml.load(writes[0].text)).toEqual([
        { url: 'mailto:someone@example.com', description: 'Test Description 1' },
        CONTACTS[1],
      ]);
    });

    it('shows the saved entries in the viewer afterwards', async () => {
      await loadFile();
      await click(/^Edit\b/);
      await type('Description for entry 1', 'Saved description');
      await click(/^Save$/);

      await click(/^Done$/);

      expect(screen.getByText('Saved description')).toBeInTheDocument();
    });

    it('requests write permission before writing', async () => {
      const handle = await loadFile(makeHandle('qrdata.yaml', { permission: 'prompt' }));
      await click(/^Edit\b/);

      await click(/^Save$/);

      expect(handle.requestPermission).toHaveBeenCalledWith({ mode: 'readwrite' });
      expect(writes).toHaveLength(1);
    });

    it('does not write when write permission is refused', async () => {
      await loadFile(
        makeHandle('qrdata.yaml', { permission: 'prompt', grantOnRequest: false })
      );
      await click(/^Edit\b/);
      await type('Description for entry 1', 'Edited');

      await click(/^Save$/);

      expect(writes).toHaveLength(0);
      expect(screen.getByText(/Permission to write the file was refused/)).toBeInTheDocument();
      // The edits must survive so the user can still Save As.
      expect(screen.getByLabelText('Description for entry 1')).toHaveValue('Edited');
    });

    it('does not persist to localStorage when the write fails', async () => {
      await loadFile(makeHandle('qrdata.yaml', { failWrite: true }));
      const before = localStorage.getItem('contactsData');
      await click(/^Edit\b/);
      await type('Description for entry 1', 'Edited');

      await click(/^Save$/);

      expect(localStorage.getItem('contactsData')).toBe(before);
      expect(screen.getByText(/Nothing was saved/)).toBeInTheDocument();
    });

    it('does not write an entry with no payload', async () => {
      await loadFile();
      await click(/^Edit\b/);
      await type('QR contents for entry 1', '   ');

      await click(/^Save$/);

      expect(writes).toHaveLength(0);
      expect(screen.getByText(/Every entry needs something to encode/)).toBeInTheDocument();
    });

    it('offers no Save button when there is no remembered file', async () => {
      await renderApp();
      await click(/Create a new qrdata\.yaml/i);

      expect(screen.queryByRole('button', { name: /^Save$/ })).not.toBeInTheDocument();
      expect(screen.getByText(/Save As is the only way to write this file/)).toBeInTheDocument();
      expect(writes).toHaveLength(0);
    });

    it('writes a brand new file through Save As', async () => {
      savePicker.mockResolvedValue(makeHandle('new.yaml'));
      await renderApp();
      await click(/Create a new qrdata\.yaml/i);
      await type('QR contents for entry 1', 'https://example.com/new');

      await click(/Save As/);

      expect(writes).toHaveLength(1);
      expect(yaml.load(writes[0].text)).toEqual([
        { url: 'https://example.com/new', description: '' },
      ]);
    });

    it('does not remember a file when the Save As write fails', async () => {
      savePicker.mockResolvedValue(makeHandle('new.yaml', { failWrite: true }));
      await renderApp();
      await click(/Create a new qrdata\.yaml/i);
      await type('QR contents for entry 1', 'https://example.com/new');

      await click(/Save As/);

      // The handle must not be adopted for a file that was never written.
      expect(screen.queryByRole('button', { name: /^Save$/ })).not.toBeInTheDocument();
      expect(localStorage.getItem('contactsData')).toBeNull();
    });

    it('offers Save once a file has been written with Save As', async () => {
      savePicker.mockResolvedValue(makeHandle('new.yaml'));
      await renderApp();
      await click(/Create a new qrdata\.yaml/i);
      await type('QR contents for entry 1', 'https://example.com/new');
      await click(/Save As/);

      expect(screen.getByRole('button', { name: /^Save$/ })).toBeInTheDocument();
    });

    it('does not remember a file when Save As is cancelled', async () => {
      const abort = new Error('cancelled');
      abort.name = 'AbortError';
      savePicker.mockRejectedValue(abort);
      await renderApp();
      await click(/Create a new qrdata\.yaml/i);
      await type('QR contents for entry 1', 'https://example.com/new');

      await click(/Save As/);

      expect(writes).toHaveLength(0);
      expect(screen.queryByRole('button', { name: /^Save$/ })).not.toBeInTheDocument();
      // Cancelling is not an error - it must not be reported as a failure.
      expect(screen.queryByText(/Nothing was saved/)).not.toBeInTheDocument();
    });
  });

  describe('unsaved changes', () => {
    it('asks before discarding edits', async () => {
      await loadFile();
      await click(/^Edit\b/);
      await type('Description for entry 1', 'Edited');

      await click(/^Done$/);

      expect(window.confirm).toHaveBeenCalled();
    });

    it('stays in the editor when the discard is declined', async () => {
      window.confirm.mockReturnValue(false);
      await loadFile();
      await click(/^Edit\b/);
      await type('Description for entry 1', 'Edited');

      await click(/^Done$/);

      expect(screen.getByText('Edit qrdata.yaml')).toBeInTheDocument();
      expect(screen.getByLabelText('Description for entry 1')).toHaveValue('Edited');
    });

    it('does not ask when nothing was edited', async () => {
      await loadFile();
      await click(/^Edit\b/);

      await click(/^Done$/);

      expect(window.confirm).not.toHaveBeenCalled();
    });

    it('does not ask after a successful save', async () => {
      await loadFile();
      await click(/^Edit\b/);
      await type('Description for entry 1', 'Edited');
      await click(/^Save$/);

      await click(/^Done$/);

      expect(window.confirm).not.toHaveBeenCalled();
    });
  });

  describe('round trip', () => {
    it('leaves an unmodified file byte-identical in structure', async () => {
      await loadFile();
      await click(/^Edit\b/);

      await click(/^Save$/);

      await waitFor(() => expect(writes).toHaveLength(1));
      expect(yaml.load(writes[0].text)).toEqual(CONTACTS);
    });
  });
  describe('after a reload', () => {
    // A reload keeps localStorage but loses everything held in memory.
    const reload = async () => {
      cleanup();
      await renderApp();
      await screen.findByText('Test Description 1');
    };

    it('still shows the name of the file the data came from', async () => {
      await loadFile();

      await reload();

      expect(screen.getByTestId('file-name')).toHaveTextContent('qrdata.yaml');
    });

    it('does not offer Save, because the link to the file did not survive', async () => {
      await loadFile();
      await reload();

      await click(/^Edit\b/);

      expect(screen.queryByRole('button', { name: /^Save$/ })).not.toBeInTheDocument();
      expect(screen.getByText(/Save As is the only way to write this file/)).toBeInTheDocument();
    });

    it('forgets the file name when the stored contacts were corrupt', async () => {
      await loadFile();
      expect(localStorage.getItem('contactsFileName')).toBe('qrdata.yaml');
      localStorage.setItem('contactsData', '{not json');

      cleanup();
      await renderApp();

      expect(screen.queryByTestId('file-name')).not.toBeInTheDocument();
      // The name describes data that has just been thrown away, so it must go
      // with it rather than linger and attach itself to whatever loads next.
      expect(localStorage.getItem('contactsFileName')).toBeNull();
    });
  });
});
