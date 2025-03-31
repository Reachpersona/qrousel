import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import * as fs from 'fs';
import yaml from 'js-yaml';
import ContactCarousel from './ContactCarousel';
import qrcodeData from './data/qrdata.js';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code')),
}));

// Polyfill TextEncoder and TextDecoder (DEFINITELY before any qrcode usage)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock both fs and window.showOpenFilePicker
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

// Mock window.showOpenFilePicker
const mockShowOpenFilePicker = jest.fn();
global.window = Object.create(window);
global.window.showOpenFilePicker = mockShowOpenFilePicker;

describe('ContactCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowOpenFilePicker.mockReset();
    global.window = Object.create(window);
    global.window.showOpenFilePicker = mockShowOpenFilePicker;
  });

  // Helper function to mock file selection
  const mockFileSelection = (data) => {
    mockShowOpenFilePicker.mockResolvedValue([{ getFile: () => ({ text: () => Promise.resolve(yaml.dump(data)) }) }]);
  };

/*
  it('displays an error message when the file system access API is not supported', async () => {
    delete global.window.showOpenFilePicker;

    render(<ContactCarousel />);

    await waitFor(() => {
      expect(screen.getByText('Error: File System Access API is not supported in this browser.')).toBeInTheDocument();
    });
  });

  it('displays an error message when file loading fails', async () => {
    mockShowOpenFilePicker.mockRejectedValue(new Error('Failed to load file'));

    await act(async () => {
      render(<ContactCarousel />);
    });

    const selectFileButton = screen.getByRole('button', { name: /Select qrdata.yaml/i });
    await act(async () => {
      fireEvent.click(selectFileButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to load file')).toBeInTheDocument();
    });
  });
*/

  it('loads contacts from a selected file', async () => {
    // Mock the file selection and file content
    const mockContactsData = [
      { url: 'https://example.com/test', description: 'Test Description' },
    ];
    mockFileSelection(mockContactsData);
    await act(async () => {
      render(<ContactCarousel />);
    });
    const selectFileButton = screen.getByRole('button', { name: /Select qrdata.yaml/i });
    await act(async () => {
      fireEvent.click(selectFileButton);
    });
    await waitFor(() => {
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('renders the first contact on initial render', async () => {
    // Mock the file selection and file content
    const mockContactsData = [
      { url: 'https://example.com/test', description: 'Test Description' },
    ];
    mockFileSelection(mockContactsData);
    await act(async () => {
      render(<ContactCarousel />);
    });
    await waitFor(() => {
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('displays the next contact when the "Next" button is clicked', async () => {
    // Mock the file selection and file content
    const mockContactsData = [
      { url: 'https://example.com/test1', description: 'Test Description 1' },
      { url: 'https://example.com/test2', description: 'Test Description 2' },
    ];
    mockFileSelection(mockContactsData);
    await act(async () => {
      render(<ContactCarousel />);
    });

    const nextButton = screen.getByRole('button', { name: /Next slide/i });

    await act(async () => {
      fireEvent.click(nextButton);
    });
    await waitFor(() => {
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('displays the previous contact when the "Previous" button is clicked', async () => {
    const mockContactsData = [
      { url: 'https://example.com/test1', description: 'Test Description 1' },
      { url: 'https://example.com/test2', description: 'Test Description 2' },
    ];
    mockFileSelection(mockContactsData);
    await act(async () => {
      render(<ContactCarousel />);
    });

    const prevButton = screen.getByRole('button', { name: /Previous slide/i });
    const nextButton = screen.getByRole('button', { name: /Next slide/i });

    await act(async () => {
      fireEvent.click(nextButton); // Go to the second contact first
      fireEvent.click(prevButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('wraps around to the first contact from the last', async () => {
    const longMockContactsData = [
      { url: 'https://example.com/test1', description: 'Test Description 1' },
      { url: 'https://example.com/test2', description: 'Test Description 2' },
      { url: 'https://example.com/test3', description: 'Test Description 3' },
    ];
    mockFileSelection(longMockContactsData);
    await act(async () => {
      render(<ContactCarousel />);
    });

    const nextButton = screen.getByRole('button', { name: /Next slide/i });
    // Navigate to the last contact
    await act(async () => {
      for (let i = 0; i < longMockContactsData.length - 1; i++) {
	fireEvent.click(nextButton);
      }
    });

    // Click next to wrap around
    await act(async () => {
      fireEvent.click(nextButton);
    });
    await waitFor(() => {
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('wraps around to the last contact from the first', async () => {
    const longMockContactsData = [
      { url: 'https://example.com/test1', description: 'Test Description 1' },
      { url: 'https://example.com/test2', description: 'Test Description 2' },
      { url: 'https://example.com/test3', description: 'Test Description 3' },
    ];
    mockFileSelection(longMockContactsData);
    await act(async () => {
      render(<ContactCarousel />);
    });

    const prevButton = screen.getByRole('button', { name: /Previous slide/i });
    await act(async () => {
      fireEvent.click(prevButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });
});
