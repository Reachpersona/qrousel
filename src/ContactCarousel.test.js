// src/ContactCarousel.test.js
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ContactCarousel from './ContactCarousel';
import { marked } from 'marked';
import qrcodeData from './data/qrdata.js';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code')),
}));

jest.mock('marked');

describe('ContactCarousel', () => {
  it('renders the first contact on initial render', async () => {
    render(<ContactCarousel />);

    await waitFor(() => {
      expect(screen.getByAltText('QR Code')).toBeInTheDocument();
    });

    expect(marked.parse).toHaveBeenCalledWith(qrcodeData[0].description);
  });

  it('displays the next contact when the "Next" button is clicked', async () => {
    render(<ContactCarousel />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    });

    await waitFor(() => {
      expect(marked.parse).toHaveBeenCalledWith(qrcodeData[1].description);
    });
  });

  it('displays the previous contact when the "Previous" button is clicked', async () => {
    render(<ContactCarousel />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
      fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    });

    await waitFor(() => {
      expect(marked.parse).toHaveBeenCalledWith(qrcodeData[0].description);
    });
  });

  it('wraps around to the first contact from the last', async () => {
    render(<ContactCarousel />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next slide' }));
    });

    await waitFor(() => {
      expect(marked.parse).toHaveBeenCalledWith(qrcodeData[0].description);
    });
  });

  it('wraps around to the last contact from the first', async () => {
    render(<ContactCarousel />);

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Previous slide' }));
    });

    await waitFor(() => {
      expect(marked.parse).toHaveBeenCalledWith(qrcodeData[1].description);
    });
  });
});
