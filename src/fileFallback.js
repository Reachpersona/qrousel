// Loading and saving without the File System Access API.
//
// Firefox and Safari have neither showOpenFilePicker nor showSaveFilePicker, so
// there the app falls back to what every browser has had for years: a file
// input to read with, and a download to write with. Both are one-shot - they
// hand over a File or start a download and grant no lasting link to the file,
// which is why saving in place stays a Chrome/Edge-only ability.

export const YAML_MIME = 'application/x-yaml';
export const YAML_ACCEPT = '.yaml,.yml,.txt';

// Revoking a blob url in the same task as the click cancels the download in
// Safari. Waiting a beat costs nothing and keeps the url alive long enough.
const REVOKE_DELAY_MS = 40;

/**
 * Whether this browser can both open and write files through the File System
 * Access API. Both halves are required: the ability to open a file the app can
 * later write back to is what Save depends on, and a browser with only one of
 * the two would offer a Save it could not honour.
 */
export function isFileSystemAccessSupported(win = typeof window === 'undefined' ? {} : window) {
  return Boolean(win && win.showOpenFilePicker && win.showSaveFilePicker);
}

/**
 * The text of a file. Blob.text() would be shorter, but it is missing from
 * Safari before 14 - one of the browsers this whole fallback exists for.
 */
export function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('The file could not be read.'));
    // readAsText throws outright on something that is not a Blob; rejecting is
    // what keeps a caller awaiting this from hanging forever.
    try {
      reader.readAsText(file);
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Ask for a file through a file input. Resolves with the chosen File, or with
 * null if the dialog was dismissed - never rejects, since a cancelled dialog is
 * an ordinary outcome rather than a failure.
 */
export function pickFileWithInput(doc = document) {
  return new Promise((resolve) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = YAML_ACCEPT;
    input.style.display = 'none';
    // Firefox has historically refused to open the dialog for an input that is
    // not in the document.
    doc.body.appendChild(input);

    const finish = (file) => {
      input.remove();
      resolve(file || null);
    };

    // Browsers too old for the cancel event report a dismissed dialog as a
    // change with an empty file list, so both paths have to tolerate no file.
    input.addEventListener('change', () => finish(input.files && input.files[0]));
    input.addEventListener('cancel', () => finish(null));
    input.click();
  });
}

/**
 * Hand text to the browser as a download. There is no way to learn where it
 * landed, whether the user kept it, or whether the name survived - the caller
 * must not claim more than "the download started".
 */
export function downloadFile(name, text, doc = document) {
  const url = URL.createObjectURL(new Blob([text], { type: YAML_MIME }));
  const link = doc.createElement('a');
  link.href = url;
  link.download = name;
  doc.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
