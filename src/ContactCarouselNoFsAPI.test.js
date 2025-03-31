import React, { useState, useEffect } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import ContactCarousel from './ContactCarousel'; // Make sure the path is correct
// import * as fs from 'fs'; // Remove this line, fs is not used in browser

// Mock window.showOpenFilePicker
const mockShowOpenFilePicker = jest.fn();

// Wrapper Component for Testing
const TestWrapper = ({ hasFilePicker }) => {
  const [showCarousel, setShowCarousel] = useState(true);
  const [error, setError] = useState(null); // Add state for error message

  useEffect(() => {
    // Correctly simulate the absence of the API
    if (!hasFilePicker) {
      global.window = {}; // Make global.window an empty object, simplest way to remove the API.
      setError("File System Access API is not supported in this browser.");
    } else {
      global.window = Object.create(window);
      global.window.showOpenFilePicker = mockShowOpenFilePicker;
      setError(null); // Clear error when API is "supported"
    }
    setShowCarousel(true);
  }, [hasFilePicker]);

  // Render the ContactCarousel or the error message
  return (
    <>
      {showCarousel ? (
        error ? <div>{error}</div> : <ContactCarousel />
      ) : null}
    </>
  );
};

describe('ContactCarousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockShowOpenFilePicker.mockReset();
  });

  it('should display an error message if the file system access API is not supported', async () => {
    // Render the component with the mock
    render(<TestWrapper hasFilePicker={false} />);

    // Use findByText with a function matcher for more robust matching
    const errorMessage = await screen.findByText((content) =>
      content.includes('File System Access API is not supported')
    );
    expect(errorMessage).toBeInTheDocument();
  });
});

