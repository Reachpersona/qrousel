import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { marked } from 'marked';
import QrContentsDialog from './QrContentsDialog';
import './ContactCarousel.css';

// A tap must not reveal the QR contents: the carousel swipes on touch, and a
// swipe still emits a click afterwards. On touch only a deliberate press opens
// the dialog; on a mouse a plain click does.
const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE_PX = 10;
// How long after a touch sequence the synthetic click is still ignored. Long
// enough to cover the browser's click delay, short enough that a real mouse
// click on a hybrid device is not swallowed.
const CLICK_AFTER_TOUCH_MS = 600;

function ContactCarousel({ contacts, fileName, onLoadFile, onEdit }) {
  const [qrCodes, setQrCodes] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [descriptionHtml, setDescriptionHtml] = useState(null);
  const [descriptionHeight, setDescriptionHeight] = useState(0);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const carouselRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);
  const clickSuppressTimerRef = useRef(null);
  const isTouchInteractionRef = useRef(false);

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
        if (typeof window !== 'undefined' && document) {
          document.body.appendChild(tempDiv);
          maxHeight = Math.max(maxHeight, tempDiv.offsetHeight);
          document.body.removeChild(tempDiv);
        }
        else {
          maxHeight = 200; // set a default height for node
        }
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
    if (carouselElement && typeof window !== 'undefined') { // Only attach listeners in a browser
      carouselElement.addEventListener('touchstart', handleTouchStart);
      carouselElement.addEventListener('touchend', handleTouchEnd);
    }

    return () => {
      if (carouselElement && typeof window !== 'undefined') {
        carouselElement.removeEventListener('touchstart', handleTouchStart);
        carouselElement.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [currentIndex, contacts]);

  const cancelLongPress = () => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  };

  // Clean up anything still pending when the component goes away.
  useEffect(() => {
    return () => {
      cancelLongPress();
      if (clickSuppressTimerRef.current !== null) {
        clearTimeout(clickSuppressTimerRef.current);
      }
    };
  }, []);

  // The dialog shows the URL of the slide it was opened on, so it must not
  // outlive that slide.
  useEffect(() => {
    setIsQrDialogOpen(false);
  }, [currentIndex]);

  const handleQrTouchStart = (e) => {
    isTouchInteractionRef.current = true;
    if (clickSuppressTimerRef.current !== null) {
      clearTimeout(clickSuppressTimerRef.current);
      clickSuppressTimerRef.current = null;
    }

    cancelLongPress();
    const point = e.touches[0];
    longPressStartRef.current = { x: point.clientX, y: point.clientY };
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      setIsQrDialogOpen(true);
    }, LONG_PRESS_MS);
  };

  const handleQrTouchMove = (e) => {
    const start = longPressStartRef.current;
    if (!start) return;
    const point = e.touches[0];
    if (Math.hypot(point.clientX - start.x, point.clientY - start.y) > LONG_PRESS_MOVE_TOLERANCE_PX) {
      cancelLongPress();
    }
  };

  const handleQrTouchEnd = () => {
    cancelLongPress();
    // The click that trails a tap or a swipe must not open the dialog, but a
    // genuine mouse click later on still should.
    clickSuppressTimerRef.current = setTimeout(() => {
      clickSuppressTimerRef.current = null;
      isTouchInteractionRef.current = false;
    }, CLICK_AFTER_TOUCH_MS);
  };

  const handleQrClick = () => {
    if (isTouchInteractionRef.current) return;
    setIsQrDialogOpen(true);
  };

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

  return (
    <div className="ContactCarousel" ref={carouselRef}>
      <div className="carousel-item">
        <div className="carousel-content">
          <img
            src={qrCodes[currentIndex] || '/placeholder.png'}
            alt="QR Code"
            className="qr-code"
            onClick={handleQrClick}
            onTouchStart={handleQrTouchStart}
            onTouchMove={handleQrTouchMove}
            onTouchEnd={handleQrTouchEnd}
            onTouchCancel={handleQrTouchEnd}
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
        <button onClick={onEdit}>Edit</button>
        <button onClick={onLoadFile}>Load a different qrdata.yaml</button>
      </div>
      {isQrDialogOpen && (
        <QrContentsDialog
          url={contacts[currentIndex]?.url}
          onClose={() => setIsQrDialogOpen(false)}
        />
      )}
      {fileName && (
        <p className="file-name" data-testid="file-name">
          {fileName}
        </p>
      )}
    </div>
  );
}

export default ContactCarousel;
