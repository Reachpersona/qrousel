import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import QrContentsDialog from './QrContentsDialog';

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

  it('does not offer to open a javascript: url', async () => {
    const open = jest.fn();
    window.open = open;

    render(<QrContentsDialog url="javascript:alert(1)" onClose={() => {}} />);

    expect(screen.queryByRole('button', { name: /open/i })).not.toBeInTheDocument();
    expect(screen.getByText(/only http and https/i)).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
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
});
