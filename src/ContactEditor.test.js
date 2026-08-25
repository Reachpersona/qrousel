import { moveEntryAt } from './ContactEditor';

describe('moveEntryAt', () => {
  const entries = [{ url: 'a' }, { url: 'b' }, { url: 'c' }];

  it('swaps an entry with the one after it', () => {
    expect(moveEntryAt(entries, 0, 1)).toEqual([{ url: 'b' }, { url: 'a' }, { url: 'c' }]);
  });

  it('swaps an entry with the one before it', () => {
    expect(moveEntryAt(entries, 2, -1)).toEqual([{ url: 'a' }, { url: 'c' }, { url: 'b' }]);
  });

  it('does not reorder when moving the first entry up', () => {
    expect(moveEntryAt(entries, 0, -1)).toEqual(entries);
  });

  it('does not reorder when moving the last entry down', () => {
    expect(moveEntryAt(entries, 2, 1)).toEqual(entries);
  });

  it('does not mutate the entries it was given', () => {
    const original = [{ url: 'a' }, { url: 'b' }];
    moveEntryAt(original, 0, 1);
    expect(original).toEqual([{ url: 'a' }, { url: 'b' }]);
  });
});
