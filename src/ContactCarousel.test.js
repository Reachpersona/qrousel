import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import ContactCarousel from './ContactCarousel';

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(() => Promise.resolve('data:image/png;base64,mock-qr-code')),
}));

// Polyfill TextEncoder and TextDecoder (DEFINITELY before any qrcode usage)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

describe('ContactCarousel', () => {
  const renderWithContacts = async (data, props = {}) => {
    await act(async () => {
      render(
        <ContactCarousel contacts={data} onLoadFile={() => {}} onEdit={() => {}} {...props} />
      );
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
  describe('QR contents popup', () => {
    const TWO = [
      { url: 'https://example.com/one', description: 'Test Description 1' },
      { url: 'https://example.com/two', description: 'Test Description 2' },
    ];

    // Real browsers populate touches, changedTouches, and screen coordinates on
    // every touch event; the carousel's swipe handler reads changedTouches.
    const touch = (x, y) => [{ clientX: x, clientY: y, screenX: x, screenY: y }];
    const touchEvent = (x, y) => ({ touches: touch(x, y), changedTouches: touch(x, y) });

    const longPress = async (element) => {
      fireEvent.touchStart(element, touchEvent(10, 10));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });
      fireEvent.touchEnd(element, touchEvent(10, 10));
    };

    beforeEach(() => {
      jest.useFakeTimers({ advanceTimers: true });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not show the popup until the user asks for it', async () => {
      await renderWithContacts(TWO);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows the current slide url when the qr code is clicked', async () => {
      await renderWithContacts(TWO);

      fireEvent.click(screen.getByAltText('QR Code'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('https://example.com/one')).toBeInTheDocument();
    });

    it('shows the url of the slide the user navigated to', async () => {
      await renderWithContacts(TWO);
      await clickNext();

      fireEvent.click(screen.getByAltText('QR Code'));

      expect(screen.getByText('https://example.com/two')).toBeInTheDocument();
    });

    it('opens the popup on a long press', async () => {
      await renderWithContacts(TWO);

      await longPress(screen.getByAltText('QR Code'));

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not open the popup on a quick tap', async () => {
      await renderWithContacts(TWO);
      const qr = screen.getByAltText('QR Code');

      fireEvent.touchStart(qr, touchEvent(10, 10));
      await act(async () => {
        jest.advanceTimersByTime(100);
      });
      fireEvent.touchEnd(qr, touchEvent(10, 10));
      fireEvent.click(qr);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not open the popup when the press turns into a swipe', async () => {
      await renderWithContacts(TWO);
      const qr = screen.getByAltText('QR Code');

      fireEvent.touchStart(qr, touchEvent(10, 10));
      fireEvent.touchMove(qr, touchEvent(90, 12));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('does not cancel the press for a small finger wobble', async () => {
      await renderWithContacts(TWO);
      const qr = screen.getByAltText('QR Code');

      fireEvent.touchStart(qr, touchEvent(10, 10));
      fireEvent.touchMove(qr, touchEvent(13, 12));
      await act(async () => {
        jest.advanceTimersByTime(600);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opens on a mouse click once an earlier touch has settled', async () => {
      await renderWithContacts(TWO);
      const qr = screen.getByAltText('QR Code');

      fireEvent.touchStart(qr, touchEvent(10, 10));
      fireEvent.touchEnd(qr, touchEvent(10, 10));
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      fireEvent.click(qr);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('closes the popup when the slide changes', async () => {
      await renderWithContacts(TWO);
      fireEvent.click(screen.getByAltText('QR Code'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await clickNext();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
  describe('file name', () => {
    const ONE = [{ url: 'https://example.com/one', description: 'Test Description 1' }];

    it('shows the name of the loaded file', async () => {
      await renderWithContacts(ONE, { fileName: 'qrdata.yaml' });

      expect(screen.getByTestId('file-name')).toHaveTextContent('qrdata.yaml');
    });

    it('shows nothing when no file name is known', async () => {
      await renderWithContacts(ONE);

      expect(screen.queryByTestId('file-name')).not.toBeInTheDocument();
    });

    it('keeps the file name out of the button group', async () => {
      await renderWithContacts(ONE, { fileName: 'qrdata.yaml' });

      // It belongs to the page, not to the Edit/Load controls - nesting it
      // there is what left it hugging the left edge.
      const buttonGroup = document.querySelector('.load-new-file');
      expect(buttonGroup).not.toContainElement(screen.getByTestId('file-name'));
    });
  });
});
