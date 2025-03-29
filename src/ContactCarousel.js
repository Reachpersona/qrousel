import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { marked } from 'marked';
import yaml from 'js-yaml';
import './ContactCarousel.css';

function ContactCarousel() {
  const [contacts, setContacts] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [descriptionHtml, setDescriptionHtml] = useState(null);
  const [descriptionHeight, setDescriptionHeight] = useState(0);
  const [error, setError] = useState(null);
  const carouselRef = useRef(null);

  const loadContactsFromFile = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        const [fileHandle] = await window.showOpenFilePicker({
          types: [
            {
              description: 'YAML Files',
              accept: { 'application/x-yaml': ['.yaml', '.yml'] },
            },
          ],
        });
        const file = await fileHandle.getFile();
        const yamlText = await file.text();
        const parsedContacts = yaml.load(yamlText);
        setContacts(parsedContacts || []);
        localStorage.setItem('contactsData', JSON.stringify(parsedContacts)); // Save to localStorage
        setError(null);
      } else {
        throw new Error('File System Access API is not supported in this browser.');
      }
    } catch (error) {
      console.error('Error loading qrdata.yaml:', error);
      setError(error.message);
    }
  };

  useEffect(() => {
    const savedContacts = localStorage.getItem('contactsData');
    if (savedContacts) {
      setContacts(JSON.parse(savedContacts));
    }
  }, []);

  useEffect(() => {
    const generateQRCodes = async () => {
      if (Array.isArray(contacts) && contacts.length > 0) {
        const codes = await Promise.all(
          contacts.map(async (contact) => {
            try {
              return await QRCode.toDataURL(contact.url, { width: 200 });
            } catch (error) {
              console.error(`Error generating QR code for ${contact.url}:`, error);
              return '/placeholder.png';
            }
          })
        );
        setQrCodes(codes);
      }
    };

    generateQRCodes();
  }, [contacts]);

  useEffect(() => {
    if (qrCodes.length > 0) {
      let maxHeight = 0;
      contacts.forEach((contact) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = marked.parse(contact.description || '');
        document.body.appendChild(tempDiv);
        maxHeight = Math.max(maxHeight, tempDiv.offsetHeight);
        document.body.removeChild(tempDiv);
      });
      setDescriptionHeight(maxHeight);
    }
  }, [qrCodes, contacts]);

  useEffect(() => {
    setDescriptionHtml(null);
    if (contacts[currentIndex]?.description) {
      setDescriptionHtml(marked.parse(contacts[currentIndex].description));
    }
  }, [currentIndex, contacts]);

  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e) => {
      touchEndX = e.changedTouches[0].screenX;
      if (touchStartX - touchEndX > 50) {
        showSlide(currentIndex + 1); // Swipe left
      } else if (touchEndX - touchStartX > 50) {
        showSlide(currentIndex - 1); // Swipe right
      }
    };

    const carouselElement = carouselRef.current;
    if (carouselElement) {
      carouselElement.addEventListener('touchstart', handleTouchStart);
      carouselElement.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (carouselElement) {
        carouselElement.removeEventListener('touchstart', handleTouchStart);
        carouselElement.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [currentIndex, contacts]);

  const showSlide = (index) => {
    if (contacts.length === 0) return;
    if (index < 0) {
      setCurrentIndex(contacts.length - 1);
    } else if (index >= contacts.length) {
      setCurrentIndex(0);
    } else {
      setCurrentIndex(index);
    }
  };

  if (error) {
    return (
      <div>
        <div>Error: {error}</div>
        <button onClick={loadContactsFromFile}>Select qrdata.yaml</button>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div>
        <div>No contacts available. Please select a file.</div>
        <button onClick={loadContactsFromFile}>Select qrdata.yaml</button>
      </div>
    );
  }

  return (
    <div className="ContactCarousel" ref={carouselRef}>
      <div className="carousel-item">
        <div className="carousel-content">
          <img
            src={qrCodes[currentIndex] || '/placeholder.png'}
            alt="QR Code"
            className="qr-code"
          />
          <div
            data-testid="description"
            className="description"
            style={{ minHeight: `${descriptionHeight}px` }}
            dangerouslySetInnerHTML={{
              __html: descriptionHtml || 'Loading description...',
            }}
          />
        </div>
      </div>
      <div className="controls">
        <button
          role="button"
          aria-label="Previous slide"
          onClick={() => showSlide(currentIndex - 1)}
        >
          &lt;
        </button>
        <button
          role="button"
          aria-label="Next slide"
          onClick={() => showSlide(currentIndex + 1)}
        >
          &gt;
        </button>
      </div>
      <div className="load-new-file">
        <button onClick={loadContactsFromFile}>Load a different qrdata.yaml</button>
      </div>
    </div>
  );
}

export default ContactCarousel;
