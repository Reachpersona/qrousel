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
    localStorage.clear();
    global.window = Object.create(window);
    global.window.showOpenFilePicker = mockShowOpenFilePicker;
  });

  // Helper function to mock file selection
  const mockFileSelection = (data) => {
    mockShowOpenFilePicker.mockResolvedValue([{ getFile: () => ({ text: () => Promise.resolve(yaml.dump(data)) }) }]);
  };

  // Render and actually load the fixture through the file picker. Without the
  // click the carousel stays on the empty state, and the navigation controls
  // never render.
  const renderWithContacts = async (data) => {
    mockFileSelection(data);
    await act(async () => {
      render(<ContactCarousel />);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Select qrdata\.yaml/i }));
    });
    await screen.findByText(data[0].description);
  };

  // One act() per click: batching several clicks into a single act() makes every
  // handler read the same stale currentIndex, so the component never passes
  // through the intermediate slides.
  const clickControl = async (name) => {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name }));
    });
  };

  const clickNext = () => clickControl(/Next slide/i);
  const clickPrevious = () => clickControl(/Previous slide/i);

  // Assert the expected slide is showing and, just as importantly, that none of
  // the other slides are.
  const expectSlide = (data, index) => {
    expect(screen.getByText(data[index].description)).toBeInTheDocument();
    data.forEach((contact, i) => {
      if (i !== index) {
        expect(screen.queryByText(contact.description)).not.toBeInTheDocument();
      }
    });
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
    const mockContactsData = [
      { url: 'https://example.com/test1', description: 'Test Description 1' },
      { url: 'https://example.com/test2', description: 'Test Description 2' },
    ];
    await renderWithContacts(mockContactsData);

    expectSlide(mockContactsData, 0);
  });

  it('displays the next contact when the "Next" button is clicked', async () => {
    const mockContactsData = [
      { url: 'https://example.com/test1', description: 'Test Description 1' },
      { url: 'https://example.com/test2', description: 'Test Description 2' },
    ];
    await renderWithContacts(mockContactsData);

    await clickNext();

    expectSlide(mockContactsData, 1);
  });

  it('displays the previous contact when the "Previous" button is clicked', async () => {
    const mockContactsData = [
      { url: 'https://example.com/test1', description: 'Test Description 1' },
      { url: 'https://example.com/test2', description: 'Test Description 2' },
    ];
    await renderWithContacts(mockContactsData);

    await clickNext(); // Go to the second contact first
    expectSlide(mockContactsData, 1);

    await clickPrevious();

    expectSlide(mockContactsData, 0);
  });

  it('wraps around to the first contact from the last', async () => {
    const longMockContactsData = [
      { url: 'https://example.com/test1', description: 'Test Description 1' },
      { url: 'https://example.com/test2', description: 'Test Description 2' },
      { url: 'https://example.com/test3', description: 'Test Description 3' },
    ];
    await renderWithContacts(longMockContactsData);

    // Navigate to the last contact
    for (let i = 0; i < longMockContactsData.length - 1; i++) {
      await clickNext();
    }
    expectSlide(longMockContactsData, longMockContactsData.length - 1);

    // Click next to wrap around
    await clickNext();

    expectSlide(longMockContactsData, 0);
  });

  it('wraps around to the last contact from the first', async () => {
    const longMockContactsData = [
      { url: 'https://example.com/test1', description: 'Test Description 1' },
      { url: 'https://example.com/test2', description: 'Test Description 2' },
      { url: 'https://example.com/test3', description: 'Test Description 3' },
    ];
    await renderWithContacts(longMockContactsData);
    expectSlide(longMockContactsData, 0);

    await clickPrevious();

    expectSlide(longMockContactsData, longMockContactsData.length - 1);
  });
});
