import {
  pickFileWithInput,
  downloadFile,
  readFileText,
  isFileSystemAccessSupported,
  YAML_MIME,
} from './fileFallback';

describe('pickFileWithInput', () => {
  const fileInput = () => document.body.querySelector('input[type="file"]');

  const chooseFile = (input, file) => {
    Object.defineProperty(input, 'files', { value: file ? [file] : [], writable: false });
    input.dispatchEvent(new Event('change'));
  };

  it('offers a yaml file input', async () => {
    const pending = pickFileWithInput();
    const input = fileInput();

    expect(input.accept).toBe('.yaml,.yml,.txt');

    chooseFile(input, new File(['x'], 'a.yaml'));
    await pending;
  });

  it('resolves with the chosen file', async () => {
    const chosen = new File(['- url: x'], 'qrdata.yaml');

    const pending = pickFileWithInput();
    chooseFile(fileInput(), chosen);

    await expect(pending).resolves.toBe(chosen);
  });

  it('resolves with null when the dialog is cancelled', async () => {
    const pending = pickFileWithInput();
    fileInput().dispatchEvent(new Event('cancel'));

    await expect(pending).resolves.toBeNull();
  });

  // A change event carrying no file is a cancel by another name in browsers
  // that predate the cancel event; it must not resolve with undefined.
  it('resolves with null when the change event carries no file', async () => {
    const pending = pickFileWithInput();
    chooseFile(fileInput(), null);

    await expect(pending).resolves.toBeNull();
  });

  it('leaves no input behind once it has resolved', async () => {
    const pending = pickFileWithInput();
    chooseFile(fileInput(), new File(['x'], 'a.yaml'));
    await pending;

    expect(fileInput()).toBeNull();
  });
});

describe('downloadFile', () => {
  let created;
  let revoked;

  // jsdom's Blob has no text(), so the bytes come back through FileReader.
  const readBlob = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });

  beforeEach(() => {
    created = [];
    revoked = [];
    URL.createObjectURL = jest.fn((blob) => {
      created.push(blob);
      return `blob:fake/${created.length}`;
    });
    URL.revokeObjectURL = jest.fn((url) => revoked.push(url));
  });

  afterEach(() => {
    jest.useRealTimers();
    delete URL.createObjectURL;
    delete URL.revokeObjectURL;
  });

  const anchors = [];
  beforeEach(() => {
    anchors.length = 0;
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      anchors.push({ href: this.href, download: this.download });
    });
  });

  it('downloads the text under the given name', async () => {
    downloadFile('qrdata-20260825-120000.yaml', '- url: https://example.com\n');

    expect(anchors).toHaveLength(1);
    expect(anchors[0].download).toBe('qrdata-20260825-120000.yaml');
    expect(anchors[0].href).toBe('blob:fake/1');
    expect(created).toHaveLength(1);
    expect(created[0].type).toBe(YAML_MIME);
    await expect(readBlob(created[0])).resolves.toBe('- url: https://example.com\n');
  });

  it('leaves no anchor behind', () => {
    downloadFile('qrdata.yaml', 'x');

    expect(document.body.querySelector('a[download]')).toBeNull();
  });

  // Revoking in the same task as the click cancels the download in Safari, so
  // the url must still be live when downloadFile returns.
  it('does not revoke the url before the download has started', () => {
    downloadFile('qrdata.yaml', 'x');

    expect(revoked).toEqual([]);
  });

  it('revokes the url once the download has started', () => {
    jest.useFakeTimers();
    downloadFile('qrdata.yaml', 'x');
    jest.runAllTimers();

    expect(revoked).toEqual(['blob:fake/1']);
  });
});

describe('readFileText', () => {
  it('reads the text of a file', async () => {
    const file = new File(['- url: https://example.com\n'], 'qrdata.yaml');

    await expect(readFileText(file)).resolves.toBe('- url: https://example.com\n');
  });

  it('rejects rather than hanging when there is nothing to read', async () => {
    await expect(readFileText(null)).rejects.toBeDefined();
  });
});

describe('isFileSystemAccessSupported', () => {
  it('is false when the browser has neither picker', () => {
    expect(isFileSystemAccessSupported({})).toBe(false);
  });

  it('is false when the browser can open but not save', () => {
    expect(isFileSystemAccessSupported({ showOpenFilePicker: () => {} })).toBe(false);
  });

  it('is true when the browser has both pickers', () => {
    expect(
      isFileSystemAccessSupported({ showOpenFilePicker: () => {}, showSaveFilePicker: () => {} })
    ).toBe(true);
  });
});
