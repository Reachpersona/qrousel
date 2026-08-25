import { suggestedFileName } from './useContactsFile';

describe('suggestedFileName', () => {
  const at = (y, m, d, hh, mm, ss) => new Date(y, m - 1, d, hh, mm, ss);

  it('stamps the current file name with the date and time', () => {
    expect(suggestedFileName('contacts.yaml', at(2026, 8, 25, 14, 32, 10))).toBe(
      'contacts-20260825-143210.yaml'
    );
  });

  it('keeps a .yml extension rather than forcing .yaml', () => {
    expect(suggestedFileName('contacts.yml', at(2026, 8, 25, 14, 32, 10))).toBe(
      'contacts-20260825-143210.yml'
    );
  });

  it('falls back to qrdata when no file is loaded', () => {
    expect(suggestedFileName(null, at(2026, 8, 25, 14, 32, 10))).toBe(
      'qrdata-20260825-143210.yaml'
    );
  });

  it('does not stack timestamps when saving a file it already stamped', () => {
    expect(suggestedFileName('qrdata-20260825-143210.yaml', at(2026, 8, 25, 15, 0, 0))).toBe(
      'qrdata-20260825-150000.yaml'
    );
  });

  it('pads single digit months, days, and times', () => {
    expect(suggestedFileName('a.yaml', at(2026, 1, 2, 3, 4, 5))).toBe('a-20260102-030405.yaml');
  });

  it('adds an extension to a name that has none', () => {
    expect(suggestedFileName('contacts', at(2026, 8, 25, 14, 32, 10))).toBe(
      'contacts-20260825-143210.yaml'
    );
  });

  it('does not produce a bare timestamp for a name that is only an extension', () => {
    expect(suggestedFileName('.yaml', at(2026, 8, 25, 14, 32, 10))).toBe(
      'qrdata-20260825-143210.yaml'
    );
  });
});
