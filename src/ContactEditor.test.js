import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContactEditor, { moveEntryAt } from './ContactEditor';

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

describe('ContactEditor', () => {
  const ENTRIES = [
    { url: 'https://example.com/one', description: 'One' },
    { url: 'tel:+15551234567', description: 'Two' },
  ];

  const show = (props = {}) => {
    const onChange = jest.fn();
    render(
      <ContactEditor
        entries={ENTRIES}
        invalid={[]}
        status={null}
        canSaveInPlace={false}
        saveDisabledReason="no handle"
        onChange={onChange}
        onSave={() => {}}
        onSaveAs={() => {}}
        onDone={() => {}}
        {...props}
      />
    );
    return onChange;
  };

  const helpButtons = () => screen.getAllByRole('button', { name: /what can go in entry/i });

  describe('help for the contents field', () => {
    it('does not show the help until it is asked for', () => {
      show();

      expect(screen.queryByRole('dialog', { name: /what a code can hold/i })).not.toBeInTheDocument();
    });

    it('offers help beside every entry', () => {
      show();

      expect(helpButtons()).toHaveLength(ENTRIES.length);
    });

    it('opens the help from the question mark', () => {
      show();

      fireEvent.click(helpButtons()[0]);

      expect(screen.getByRole('dialog', { name: /what a code can hold/i })).toBeInTheDocument();
    });

    it('opens the same help from a later entry', () => {
      show();

      fireEvent.click(helpButtons()[1]);

      expect(screen.getByRole('dialog', { name: /what a code can hold/i })).toBeInTheDocument();
    });

    // The question mark sits inside a list of inputs. Reading the help must not
    // count as an edit, or it would arm the unsaved-changes guard.
    it('does not change the entries when the help is opened', () => {
      const onChange = show();

      fireEvent.click(helpButtons()[0]);

      expect(onChange).not.toHaveBeenCalled();
    });

    it('closes the help again', () => {
      show();
      fireEvent.click(helpButtons()[0]);

      fireEvent.keyDown(document, { key: 'Escape' });

      expect(screen.queryByRole('dialog', { name: /what a code can hold/i })).not.toBeInTheDocument();
    });
  });

  it('still labels the contents input for each entry', () => {
    show();

    expect(screen.getByLabelText('QR contents for entry 1')).toHaveValue(
      'https://example.com/one'
    );
    expect(screen.getByLabelText('QR contents for entry 2')).toHaveValue('tel:+15551234567');
  });
});
